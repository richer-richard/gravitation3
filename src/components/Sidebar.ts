/**
 * Sidebar — navigation sidebar for the workstation.
 * Shows simulation list with active indicator and bottom nav links.
 */

import type { SimulationType } from "../simulations/types";
import { SIMULATION_LIST } from "../simulations/types";

export class Sidebar {
  private container: HTMLElement;
  private activeSim: SimulationType;
  private collapsed = false;
  private savedWidth: string;

  constructor(container: HTMLElement, activeSim: SimulationType) {
    this.container = container;
    this.activeSim = activeSim;
    this.savedWidth = localStorage.getItem("panel_sidebar") || "200";
  }

  render(): void {
    this.container.style.width = `${this.savedWidth}px`;
    this.container.style.minWidth = "48px";
    this.container.className =
      "bg-zinc-800/80 border-r border-zinc-700 flex flex-col shrink-0 overflow-hidden";

    this.container.innerHTML = `
      <div class="p-2">
        <button class="sidebar-collapse w-full text-left px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
          &#9776;
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-2 space-y-1">
        ${SIMULATION_LIST.map(
          (sim) => `
          <a href="/sim/${sim.id}" data-link
             class="flex items-center gap-2 px-2 py-2 rounded text-sm transition-colors
                    ${sim.id === this.activeSim ? "bg-blue-600/20 text-blue-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"}">
            <span class="text-base w-6 text-center">${sim.icon}</span>
            <span class="sidebar-label truncate">${sim.name}</span>
          </a>
        `
        ).join("")}
      </nav>
      <div class="p-2 border-t border-zinc-700 space-y-1">
        <a href="/" data-link class="flex items-center gap-2 px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
          <span class="w-6 text-center">&#8962;</span>
          <span class="sidebar-label">Home</span>
        </a>
        <a href="/explore" data-link class="flex items-center gap-2 px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
          <span class="w-6 text-center">&#128269;</span>
          <span class="sidebar-label">Explore</span>
        </a>
        <a href="/settings" data-link class="flex items-center gap-2 px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
          <span class="w-6 text-center">&#9881;</span>
          <span class="sidebar-label">Settings</span>
        </a>
      </div>
    `;

    this.container.querySelector(".sidebar-collapse")?.addEventListener("click", () => {
      this.toggleCollapse();
    });
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.container.style.width = this.collapsed ? "48px" : `${this.savedWidth}px`;
    const labels = this.container.querySelectorAll(".sidebar-label");
    labels.forEach((l) => (l as HTMLElement).classList.toggle("hidden", this.collapsed));
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
