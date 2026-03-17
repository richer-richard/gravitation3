/**
 * PresetSelector — preset configuration picker for simulations.
 * Renders a dropdown of available presets with descriptions.
 */

import type { SimulationType } from "../simulations/types";

interface Preset {
  id: string;
  name: string;
  description: string;
}

const PRESETS: Record<SimulationType, Preset[]> = {
  "three-body": [
    { id: "figure8", name: "Figure-8", description: "Stable periodic orbit" },
    { id: "lagrange", name: "Lagrange Triangle", description: "Equilateral configuration" },
    { id: "chaotic", name: "Chaotic", description: "Sensitive to initial conditions" },
    { id: "custom", name: "Custom", description: "User-defined" },
  ],
  "double-pendulum": [
    { id: "standard", name: "Standard", description: "Classic double pendulum" },
    { id: "high-energy", name: "High Energy", description: "Large initial angles" },
    { id: "symmetric", name: "Symmetric", description: "Equal masses and lengths" },
  ],
  lorenz: [
    { id: "classic", name: "Classic", description: "Standard Lorenz parameters" },
    { id: "periodic", name: "Periodic", description: "Periodic orbit" },
    { id: "transient", name: "Transient", description: "Long transient behavior" },
  ],
  rossler: [
    { id: "classic", name: "Classic", description: "Standard Rossler parameters" },
    { id: "funnel", name: "Funnel", description: "Funnel-type attractor" },
    { id: "screw", name: "Screw", description: "Screw-type attractor" },
  ],
  "double-gyre": [
    { id: "standard", name: "Standard", description: "Classic double gyre flow" },
    { id: "turbulent", name: "Turbulent", description: "High mixing regime" },
    { id: "steady", name: "Steady", description: "Time-independent flow" },
  ],
  "lid-driven-cavity": [
    { id: "standard", name: "Standard", description: "Benchmark cavity at Re 400" },
    { id: "laminar", name: "Laminar", description: "Low Reynolds, stable recirculation" },
    { id: "transition", name: "Transition", description: "Stronger shear with corner vortices" },
    { id: "high-shear", name: "High Shear", description: "Fast lid and sharper vorticity layers" },
  ],
  "malkus-waterwheel": [
    { id: "chaotic", name: "Chaotic", description: "Chaotic rotation" },
    { id: "steady", name: "Steady", description: "Steady rotation" },
    { id: "oscillating", name: "Oscillating", description: "Direction reversals" },
  ],
};

export class PresetSelector {
  private container: HTMLElement;
  private simType: SimulationType;
  private currentPreset: string;
  private onSelect: (presetId: string) => void;

  constructor(
    container: HTMLElement,
    simType: SimulationType,
    currentPreset: string,
    onSelect: (presetId: string) => void
  ) {
    this.container = container;
    this.simType = simType;
    this.currentPreset = currentPreset;
    this.onSelect = onSelect;
  }

  render(): void {
    const presets = PRESETS[this.simType] || [];

    this.container.innerHTML = `
      <div class="relative">
        <select class="preset-select bg-zinc-700 border border-zinc-600 text-zinc-300 text-xs rounded px-2 py-1 pr-6 cursor-pointer">
          ${presets
            .map(
              (p) => `<option value="${p.id}" ${p.id === this.currentPreset ? "selected" : ""}>${p.name}</option>`
            )
            .join("")}
        </select>
      </div>
    `;

    const select = this.container.querySelector(".preset-select") as HTMLSelectElement;
    select?.addEventListener("change", () => {
      this.currentPreset = select.value;
      this.onSelect(select.value);
    });
  }

  getCurrent(): string {
    return this.currentPreset;
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
