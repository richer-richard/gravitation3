/**
 * SimInfoPanel — contextual info panel replacing the navigation sidebar
 * in the simulation workstation. Shows simulation description, equations,
 * parameter reference, current preset, and a "Learn More" link.
 */

import { getSimulationInfo, type SimulationInfo } from "../data/simulationInfo";

export class SimInfoPanel {
  private container: HTMLElement;
  private info: SimulationInfo;
  private presetEl: HTMLElement | null = null;
  private paramsEl: HTMLElement | null = null;

  constructor(container: HTMLElement, simId: string) {
    this.container = container;
    const allInfo = getSimulationInfo();
    this.info = allInfo[simId] || allInfo["three-body"];
  }

  render(): void {
    const { info } = this;

    this.container.innerHTML = `
      <div class="sim-info-panel">
        <!-- Header -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-lg" style="color:${info.accentColor}">${info.icon}</span>
          <div>
            <h3 class="text-sm font-semibold text-zinc-200">${info.name}</h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-500">${info.category}</span>
          </div>
        </div>

        <!-- Description -->
        <p class="text-xs text-zinc-500 leading-relaxed mb-4">${info.description}</p>

        <!-- Key Equations -->
        <div class="mb-4">
          <h4 class="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Key Equations</h4>
          <div class="sim-info-equations space-y-2">
            ${info.equations
              .map(
                (eq) => `
              <div class="rounded-lg bg-black/20 border border-white/[0.04] px-3 py-2">
                <div class="text-[10px] text-zinc-600 mb-0.5">${eq.label}</div>
                <div class="text-zinc-300">${eq.html}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Current Preset -->
        <div class="mb-4" id="sim-info-preset">
          <h4 class="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">Preset</h4>
          <p class="text-xs text-zinc-400" id="sim-info-preset-text">—</p>
        </div>

        <!-- Parameter Reference -->
        <div class="mb-4">
          <h4 class="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Parameters</h4>
          <div class="space-y-1" id="sim-info-params">
            ${info.parameters
              .map(
                (p) => `
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400">${p.symbol}</span>
                <span class="param-value" data-param="${p.name}">—</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-white/[0.06] my-4"></div>

        <!-- Learn More -->
        <a href="/physics#${info.id}" data-link
           class="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors mb-4">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 5v3M7 9.5v.5"/></svg>
          Learn the physics
        </a>

        <!-- Compact Nav -->
        <div class="flex items-center gap-3 text-[10px] text-zinc-600">
          <a href="/" data-link class="hover:text-zinc-300 transition-colors">Home</a>
          <span>|</span>
          <a href="/explore" data-link class="hover:text-zinc-300 transition-colors">Explore</a>
          <span>|</span>
          <a href="/settings" data-link class="hover:text-zinc-300 transition-colors">Settings</a>
        </div>
      </div>
    `;

    this.presetEl = this.container.querySelector("#sim-info-preset-text");
    this.paramsEl = this.container.querySelector("#sim-info-params");
  }

  updatePreset(name: string, description?: string): void {
    if (this.presetEl) {
      const desc = description || this.info.presets[name] || "";
      this.presetEl.innerHTML = `
        <span class="text-zinc-200 font-medium">${name}</span>
        ${desc ? `<br/><span class="text-zinc-500">${desc}</span>` : ""}
      `;
    }
  }

  updateParams(params: Record<string, number>): void {
    if (!this.paramsEl) return;
    const valueEls = this.paramsEl.querySelectorAll<HTMLElement>(".param-value");
    valueEls.forEach((el) => {
      const key = el.getAttribute("data-param");
      if (key && params[key] !== undefined) {
        el.textContent = String(
          Number.isInteger(params[key]) ? params[key] : params[key].toFixed(4)
        );
      }
    });
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
