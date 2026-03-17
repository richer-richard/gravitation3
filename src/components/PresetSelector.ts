/**
 * PresetSelector — polished custom dropdown for simulation presets.
 * Renders an animated overlay panel with keyboard navigation, descriptions,
 * active indicator, and smooth transitions.
 */

import type { SimulationType } from "../simulations/types";

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const PRESETS: Record<SimulationType, Preset[]> = {
  "three-body": [
    { id: "figure8", name: "Figure-8", description: "Three equal masses tracing a stable periodic figure-eight orbit", icon: "∞" },
    { id: "lagrange", name: "Lagrange", description: "Equilateral triangle configuration with balanced gravitational forces", icon: "△" },
    { id: "chaotic", name: "Chaotic", description: "Highly sensitive to initial conditions — unpredictable evolution", icon: "⚡" },
    { id: "custom", name: "Custom", description: "User-defined initial positions and velocities", icon: "✦" },
  ],
  "double-pendulum": [
    { id: "standard", name: "Standard", description: "Classic double pendulum with moderate initial angles", icon: "⟳" },
    { id: "high-energy", name: "High Energy", description: "Large initial angles producing vigorous chaotic motion", icon: "🔥" },
    { id: "symmetric", name: "Symmetric", description: "Equal masses and lengths — balanced configuration", icon: "⚖" },
  ],
  lorenz: [
    { id: "classic", name: "Classic", description: "Standard parameters σ=10, ρ=28, β=8/3 — the butterfly", icon: "🦋" },
    { id: "periodic", name: "Periodic", description: "Parameters tuned for periodic orbit behaviour", icon: "○" },
    { id: "transient", name: "Transient", description: "Long transient before settling onto the attractor", icon: "⏳" },
  ],
  rossler: [
    { id: "classic", name: "Classic", description: "Standard Rössler parameters a=0.2, b=0.2, c=5.7", icon: "◎" },
    { id: "funnel", name: "Funnel", description: "Funnel-type attractor with period-doubling cascade", icon: "🌀" },
    { id: "screw", name: "Screw", description: "Screw-type attractor with helical structure", icon: "⟲" },
  ],
  "double-gyre": [
    { id: "standard", name: "Standard", description: "Classic double gyre flow with moderate perturbation", icon: "≈" },
    { id: "turbulent", name: "Turbulent", description: "High mixing regime with strong perturbation", icon: "🌊" },
    { id: "steady", name: "Steady", description: "Time-independent flow — no perturbation (ε=0)", icon: "—" },
  ],
  "lid-driven-cavity": [
    { id: "standard", name: "Standard", description: "Benchmark cavity at Reynolds 400 with single vortex", icon: "▣" },
    { id: "laminar", name: "Laminar", description: "Low Reynolds — stable recirculation zone", icon: "◻" },
    { id: "transition", name: "Transition", description: "Stronger shear with corner vortices forming", icon: "◈" },
    { id: "high-shear", name: "High Shear", description: "Fast lid producing sharp vorticity layers", icon: "▤" },
  ],
  "malkus-waterwheel": [
    { id: "chaotic", name: "Chaotic", description: "Chaotic rotation with unpredictable direction changes", icon: "⚙" },
    { id: "steady", name: "Steady", description: "Steady unidirectional rotation", icon: "↻" },
    { id: "oscillating", name: "Oscillating", description: "Periodic direction reversals", icon: "↔" },
  ],
};

export class PresetSelector {
  private container: HTMLElement;
  private simType: SimulationType;
  private currentPreset: string;
  private onSelect: (presetId: string) => void;
  private isOpen = false;
  private focusIndex = -1;
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundClickOutside: ((e: MouseEvent) => void) | null = null;

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
    const current = presets.find((p) => p.id === this.currentPreset) || presets[0];

    this.container.innerHTML = `
      <div class="preset-browser" data-open="false">
        <button class="preset-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
          <div class="preset-trigger-content">
            <span class="preset-trigger-icon">${current?.icon || "◆"}</span>
            <div class="preset-trigger-text">
              <span class="preset-trigger-label">Preset</span>
              <span class="preset-trigger-name">${current?.name || "Select"}</span>
            </div>
          </div>
          <svg class="preset-trigger-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </button>
        <div class="preset-dropdown" role="listbox" aria-label="Presets">
          <div class="preset-dropdown-header">
            <span class="preset-dropdown-title">Configurations</span>
            <span class="preset-dropdown-count">${presets.length} presets</span>
          </div>
          <div class="preset-dropdown-list">
            ${presets
              .map(
                (p, i) => `
              <button class="preset-option ${p.id === this.currentPreset ? "is-active" : ""}"
                      role="option" aria-selected="${p.id === this.currentPreset}"
                      data-preset-id="${p.id}" data-index="${i}" type="button">
                <span class="preset-option-icon">${p.icon}</span>
                <div class="preset-option-body">
                  <span class="preset-option-name">${p.name}</span>
                  <span class="preset-option-desc">${p.description}</span>
                </div>
                ${p.id === this.currentPreset ? '<span class="preset-option-check">✓</span>' : ""}
              </button>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    // Bind trigger
    const trigger = this.container.querySelector(".preset-trigger") as HTMLButtonElement;
    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Bind option clicks
    this.container.querySelectorAll<HTMLButtonElement>(".preset-option").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.presetId;
        if (id) this.select(id);
      });
      btn.addEventListener("mouseenter", () => {
        const idx = Number(btn.dataset.index);
        this.setFocusIndex(idx);
      });
    });
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    this.isOpen = true;
    const browser = this.container.querySelector(".preset-browser") as HTMLElement;
    const trigger = this.container.querySelector(".preset-trigger") as HTMLButtonElement;
    if (browser) browser.dataset.open = "true";
    if (trigger) trigger.setAttribute("aria-expanded", "true");

    // Set initial focus to current preset
    const presets = PRESETS[this.simType] || [];
    this.focusIndex = presets.findIndex((p) => p.id === this.currentPreset);
    if (this.focusIndex >= 0) this.setFocusIndex(this.focusIndex);

    // Keyboard handler
    this.boundKeyHandler = (e: KeyboardEvent) => {
      const count = presets.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.setFocusIndex((this.focusIndex + 1) % count);
          break;
        case "ArrowUp":
          e.preventDefault();
          this.setFocusIndex((this.focusIndex - 1 + count) % count);
          break;
        case "Enter":
          e.preventDefault();
          if (this.focusIndex >= 0 && this.focusIndex < count) {
            this.select(presets[this.focusIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          this.close();
          break;
      }
    };
    document.addEventListener("keydown", this.boundKeyHandler);

    // Click outside
    this.boundClickOutside = (e: MouseEvent) => {
      if (!this.container.contains(e.target as Node)) {
        this.close();
      }
    };
    // Delay so the current click doesn't immediately close
    requestAnimationFrame(() => {
      document.addEventListener("click", this.boundClickOutside!);
    });
  }

  private close(): void {
    this.isOpen = false;
    const browser = this.container.querySelector(".preset-browser") as HTMLElement;
    const trigger = this.container.querySelector(".preset-trigger") as HTMLButtonElement;
    if (browser) browser.dataset.open = "false";
    if (trigger) trigger.setAttribute("aria-expanded", "false");

    if (this.boundKeyHandler) {
      document.removeEventListener("keydown", this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
    if (this.boundClickOutside) {
      document.removeEventListener("click", this.boundClickOutside);
      this.boundClickOutside = null;
    }

    this.clearFocus();
  }

  private select(presetId: string): void {
    this.currentPreset = presetId;
    this.onSelect(presetId);
    this.close();
    this.render(); // Re-render to update active state
  }

  private setFocusIndex(index: number): void {
    this.focusIndex = index;
    this.container.querySelectorAll<HTMLButtonElement>(".preset-option").forEach((btn, i) => {
      btn.classList.toggle("is-focused", i === index);
      if (i === index) {
        btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }

  private clearFocus(): void {
    this.focusIndex = -1;
    this.container.querySelectorAll<HTMLButtonElement>(".preset-option").forEach((btn) => {
      btn.classList.remove("is-focused");
    });
  }

  getCurrent(): string {
    return this.currentPreset;
  }

  destroy(): void {
    if (this.boundKeyHandler) {
      document.removeEventListener("keydown", this.boundKeyHandler);
    }
    if (this.boundClickOutside) {
      document.removeEventListener("click", this.boundClickOutside);
    }
    this.container.innerHTML = "";
  }
}
