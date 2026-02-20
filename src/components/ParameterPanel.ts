/**
 * ParameterPanel — renders simulation parameter sliders and inputs
 * with tooltips, reset button, and named presets.
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
  tooltip?: string;
}

const PARAMS: Record<SimulationType, ParamDef[]> = {
  "three-body": [
    { name: "G", label: "Gravity (G)", min: 0.01, max: 100, step: 0.01, default: 1, tooltip: "Gravitational constant controlling attraction strength" },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.005, tooltip: "Integration timestep — smaller is more accurate but slower" },
  ],
  "double-pendulum": [
    { name: "g", label: "Gravity (g)", min: 1, max: 20, step: 0.1, default: 9.81, tooltip: "Gravitational acceleration (m/s²)" },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.005, tooltip: "Integration timestep" },
    { name: "l1", label: "Length 1", min: 0.1, max: 3, step: 0.1, default: 1, tooltip: "Length of the first pendulum arm" },
    { name: "l2", label: "Length 2", min: 0.1, max: 3, step: 0.1, default: 1, tooltip: "Length of the second pendulum arm" },
    { name: "m1", label: "Mass 1", min: 0.1, max: 10, step: 0.1, default: 1, tooltip: "Mass of the first bob" },
    { name: "m2", label: "Mass 2", min: 0.1, max: 10, step: 0.1, default: 1, tooltip: "Mass of the second bob" },
  ],
  lorenz: [
    { name: "sigma", label: "Sigma (σ)", min: 0, max: 50, step: 0.1, default: 10, tooltip: "Prandtl number — ratio of momentum to thermal diffusivity" },
    { name: "rho", label: "Rho (ρ)", min: 0, max: 100, step: 0.1, default: 28, tooltip: "Rayleigh number — chaos onset at ρ ≈ 24.74" },
    { name: "beta", label: "Beta (β)", min: 0, max: 20, step: 0.01, default: 2.667, tooltip: "Geometric factor of the convection cell" },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.005, tooltip: "Integration timestep" },
  ],
  rossler: [
    { name: "a", label: "a", min: 0, max: 1, step: 0.01, default: 0.2, tooltip: "Controls rotation speed in the x-y plane" },
    { name: "b", label: "b", min: 0, max: 1, step: 0.01, default: 0.2, tooltip: "Controls the z-axis dynamics" },
    { name: "c", label: "c", min: 0, max: 30, step: 0.1, default: 5.7, tooltip: "Period-doubling route to chaos as c increases" },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.01, tooltip: "Integration timestep" },
  ],
  "double-gyre": [
    { name: "A", label: "Amplitude (A)", min: 0, max: 1, step: 0.01, default: 0.1, tooltip: "Flow amplitude" },
    { name: "epsilon", label: "Epsilon (ε)", min: 0, max: 1, step: 0.01, default: 0.25, tooltip: "Perturbation strength — 0 gives steady gyres" },
    { name: "omega", label: "Omega (ω)", min: 0, max: 10, step: 0.1, default: 6.283, tooltip: "Oscillation frequency (2π ≈ period of 1)" },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.01, tooltip: "Integration timestep" },
  ],
  "malkus-waterwheel": [
    { name: "inflow_rate", label: "Inflow Rate", min: 0, max: 20, step: 0.1, default: 5, tooltip: "Water inflow rate at the top" },
    { name: "leak_rate", label: "Leak Rate", min: 0, max: 10, step: 0.1, default: 1, tooltip: "Rate at which water leaks from buckets" },
    { name: "damping", label: "Damping", min: 0, max: 5, step: 0.01, default: 0.5, tooltip: "Viscous friction on the wheel axle" },
    { name: "dt", label: "Time Step", min: 0.001, max: 0.05, step: 0.001, default: 0.01, tooltip: "Integration timestep" },
  ],
};

const STORAGE_KEY = "param_presets";

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
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Parameters</h3>
          <div class="flex gap-1">
            <button class="param-save-preset px-2 py-0.5 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded" title="Save current values as preset">Save</button>
            <button class="param-reset-all px-2 py-0.5 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded" title="Reset all to defaults">Reset</button>
          </div>
        </div>
        <div class="param-presets-bar"></div>
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

    // Reset All button
    this.container.querySelector(".param-reset-all")?.addEventListener("click", () => {
      for (const param of params) {
        this.values.set(param.name, param.default);
        const slider = this.container.querySelector(
          `[data-param="${param.name}"] input[type="range"]`
        ) as HTMLInputElement;
        const numberInput = this.container.querySelector(
          `[data-param="${param.name}"] input[type="number"]`
        ) as HTMLInputElement;
        if (slider) slider.value = String(param.default);
        if (numberInput) numberInput.value = String(param.default);
        this.manager.setParameter(param.name, param.default);
      }
    });

    // Save Preset button
    this.container.querySelector(".param-save-preset")?.addEventListener("click", () => {
      const name = prompt("Preset name:");
      if (!name) return;
      const preset: Record<string, number> = {};
      for (const [k, v] of this.values) preset[k] = v;
      this.savePreset(name, preset);
      this.renderPresetBar();
    });

    this.renderPresetBar();
  }

  /** Apply an external set of parameter values (e.g. from AI recommendations). */
  applyValues(params: Record<string, number>): void {
    const paramDefs = PARAMS[this.simType] || [];
    for (const [name, value] of Object.entries(params)) {
      const def = paramDefs.find((p) => p.name === name);
      if (!def) continue;
      this.values.set(name, value);
      this.manager.setParameter(name, value);
      const slider = this.container.querySelector(
        `[data-param="${name}"] input[type="range"]`
      ) as HTMLInputElement;
      const numberInput = this.container.querySelector(
        `[data-param="${name}"] input[type="number"]`
      ) as HTMLInputElement;
      if (slider) slider.value = String(value);
      if (numberInput) numberInput.value = String(value);
    }
  }

  private renderSlider(param: ParamDef): string {
    const tooltipIcon = param.tooltip
      ? `<span class="text-zinc-500 cursor-help ml-1" title="${param.tooltip}">&#9432;</span>`
      : "";
    return `
      <div data-param="${param.name}" class="space-y-1">
        <div class="flex justify-between items-center">
          <label class="text-xs text-zinc-300">${param.label}${tooltipIcon}</label>
          <input type="number" value="${param.default}" min="${param.min}" max="${param.max}" step="${param.step}"
            class="w-20 bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-0.5 border border-zinc-600 text-right" />
        </div>
        <input type="range" value="${param.default}" min="${param.min}" max="${param.max}" step="${param.step}"
          class="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
      </div>
    `;
  }

  private renderPresetBar(): void {
    const bar = this.container.querySelector(".param-presets-bar");
    if (!bar) return;
    const presets = this.getPresets();
    if (presets.length === 0) {
      bar.innerHTML = "";
      return;
    }
    bar.innerHTML = `
      <div class="flex flex-wrap gap-1 mb-2">
        ${presets.map((name) => `
          <button class="preset-load px-2 py-0.5 text-[10px] bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-500/20" data-preset-name="${name}">${name}</button>
        `).join("")}
      </div>
    `;
    bar.querySelectorAll<HTMLButtonElement>(".preset-load").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-preset-name")!;
        const preset = this.loadPreset(name);
        if (preset) this.applyValues(preset);
      });
    });
  }

  private getPresets(): string[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${this.simType}`);
      if (!raw) return [];
      return Object.keys(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  private savePreset(name: string, values: Record<string, number>): void {
    const key = `${STORAGE_KEY}_${this.simType}`;
    let all: Record<string, Record<string, number>> = {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) all = JSON.parse(raw);
    } catch { /* ignore */ }
    all[name] = values;
    localStorage.setItem(key, JSON.stringify(all));
  }

  private loadPreset(name: string): Record<string, number> | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${this.simType}`);
      if (!raw) return null;
      return JSON.parse(raw)[name] || null;
    } catch {
      return null;
    }
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
