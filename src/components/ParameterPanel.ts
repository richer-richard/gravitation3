/**
 * ParameterPanel — renders simulation parameter sliders and inputs.
 */

import type { SimulationType } from "../simulations/types";
import type { SimulationManager } from "../simulations/SimulationManager";

interface ParamDef {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

const PARAMS: Record<SimulationType, ParamDef[]> = {
  "three-body": [
    { name: "G", label: "Gravity (G)", min: 0.01, max: 100, step: 0.01, default: 1 },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.005 },
  ],
  "double-pendulum": [
    { name: "g", label: "Gravity (g)", min: 1, max: 20, step: 0.1, default: 9.81 },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.005 },
    { name: "l1", label: "Length 1", min: 0.1, max: 3, step: 0.1, default: 1 },
    { name: "l2", label: "Length 2", min: 0.1, max: 3, step: 0.1, default: 1 },
    { name: "m1", label: "Mass 1", min: 0.1, max: 10, step: 0.1, default: 1 },
    { name: "m2", label: "Mass 2", min: 0.1, max: 10, step: 0.1, default: 1 },
  ],
  lorenz: [
    { name: "sigma", label: "Sigma (σ)", min: 0, max: 50, step: 0.1, default: 10 },
    { name: "rho", label: "Rho (ρ)", min: 0, max: 100, step: 0.1, default: 28 },
    { name: "beta", label: "Beta (β)", min: 0, max: 20, step: 0.01, default: 2.667 },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.005 },
  ],
  rossler: [
    { name: "a", label: "a", min: 0, max: 1, step: 0.01, default: 0.2 },
    { name: "b", label: "b", min: 0, max: 1, step: 0.01, default: 0.2 },
    { name: "c", label: "c", min: 0, max: 30, step: 0.1, default: 5.7 },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.01 },
  ],
  "double-gyre": [
    { name: "A", label: "Amplitude (A)", min: 0, max: 1, step: 0.01, default: 0.1 },
    { name: "epsilon", label: "Epsilon (ε)", min: 0, max: 1, step: 0.01, default: 0.25 },
    { name: "omega", label: "Omega (ω)", min: 0, max: 10, step: 0.1, default: 6.283 },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.01 },
  ],
  "malkus-waterwheel": [
    { name: "inflow_rate", label: "Inflow Rate", min: 0, max: 20, step: 0.1, default: 5 },
    { name: "leak_rate", label: "Leak Rate", min: 0, max: 10, step: 0.1, default: 1 },
    { name: "damping", label: "Damping", min: 0, max: 5, step: 0.01, default: 0.5 },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.01 },
  ],
};

export class ParameterPanel {
  private container: HTMLElement;
  private simType: SimulationType;
  private manager: SimulationManager;
  private values: Map<string, number> = new Map();

  constructor(
    container: HTMLElement,
    simType: SimulationType,
    manager: SimulationManager
  ) {
    this.container = container;
    this.simType = simType;
    this.manager = manager;
  }

  render(): void {
    const params = PARAMS[this.simType] || [];
    this.container.innerHTML = `
      <div class="space-y-3 p-2">
        <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Parameters</h3>
        ${params.map((p) => this.renderSlider(p)).join("")}
      </div>
    `;

    // Attach listeners
    for (const param of params) {
      this.values.set(param.name, param.default);
      const slider = this.container.querySelector(
        `[data-param="${param.name}"] input[type="range"]`
      ) as HTMLInputElement;
      const numberInput = this.container.querySelector(
        `[data-param="${param.name}"] input[type="number"]`
      ) as HTMLInputElement;

      if (slider && numberInput) {
        slider.addEventListener("input", () => {
          const val = parseFloat(slider.value);
          numberInput.value = val.toString();
          this.values.set(param.name, val);
          this.manager.setParameter(param.name, val);
        });

        numberInput.addEventListener("change", () => {
          const val = parseFloat(numberInput.value);
          slider.value = val.toString();
          this.values.set(param.name, val);
          this.manager.setParameter(param.name, val);
        });
      }
    }
  }

  private renderSlider(param: ParamDef): string {
    return `
      <div data-param="${param.name}" class="space-y-1">
        <div class="flex justify-between items-center">
          <label class="text-xs text-zinc-300">${param.label}</label>
          <input type="number" value="${param.default}" min="${param.min}" max="${param.max}" step="${param.step}"
            class="w-20 bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-0.5 border border-zinc-600 text-right" />
        </div>
        <input type="range" value="${param.default}" min="${param.min}" max="${param.max}" step="${param.step}"
          class="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
      </div>
    `;
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
