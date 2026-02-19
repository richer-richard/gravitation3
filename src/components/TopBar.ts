/**
 * TopBar — simulation toolbar with transport controls, speed, and utility buttons.
 */

import type { SimulationManager, SpeedMultiplier } from "../simulations/SimulationManager";

export interface TopBarCallbacks {
  onScreenshot?: () => void;
  onExport?: () => void;
  onRecord?: () => void;
}

export class TopBar {
  private container: HTMLElement;
  private manager: SimulationManager;
  private callbacks: TopBarCallbacks;
  private btnPlay!: HTMLButtonElement;
  private presetBadge!: HTMLElement;

  constructor(container: HTMLElement, manager: SimulationManager, callbacks: TopBarCallbacks = {}) {
    this.container = container;
    this.manager = manager;
    this.callbacks = callbacks;
  }

  render(): void {
    this.container.innerHTML = `
      <button id="btn-play" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors">
        &#9654; Play
      </button>
      <button id="btn-step" class="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors" title="Step forward one frame">
        Step
      </button>
      <button id="btn-reset" class="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors">
        Reset
      </button>
      <div class="w-px h-5 bg-zinc-600"></div>
      <select id="speed-select" class="bg-zinc-700 border border-zinc-600 text-zinc-300 text-xs rounded px-2 py-1">
        <option value="0.1">0.1x</option>
        <option value="0.25">0.25x</option>
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="2">2x</option>
        <option value="5">5x</option>
      </select>
      <div class="w-px h-5 bg-zinc-600"></div>
      <button id="btn-screenshot" class="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors" title="Screenshot (S)">
        &#128247;
      </button>
      <button id="btn-record" class="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors" title="Record">
        &#9679;
      </button>
      <button id="btn-export" class="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors" title="Export (E)">
        &#8681;
      </button>
      <a href="/settings" data-link class="text-zinc-500 hover:text-zinc-300 text-sm" title="Settings">&#9881;</a>
    `;

    this.btnPlay = this.container.querySelector("#btn-play")!;
    const btnStep = this.container.querySelector("#btn-step")!;
    const btnReset = this.container.querySelector("#btn-reset")!;
    const speedSelect = this.container.querySelector("#speed-select") as HTMLSelectElement;
    const btnScreenshot = this.container.querySelector("#btn-screenshot")!;
    const btnRecord = this.container.querySelector("#btn-record")!;
    const btnExport = this.container.querySelector("#btn-export")!;

    this.btnPlay.addEventListener("click", () => {
      this.manager.toggle();
      this.updatePlayButton();
    });

    btnStep.addEventListener("click", () => {
      if (!this.manager.isRunning) this.manager.stepOnce();
    });

    btnReset.addEventListener("click", () => {
      this.manager.stop();
      this.manager.reset();
      this.updatePlayButton();
    });

    speedSelect.addEventListener("change", () => {
      this.manager.setSpeed(parseFloat(speedSelect.value) as SpeedMultiplier);
    });

    btnScreenshot.addEventListener("click", () => this.callbacks.onScreenshot?.());
    btnRecord.addEventListener("click", () => this.callbacks.onRecord?.());
    btnExport.addEventListener("click", () => this.callbacks.onExport?.());
  }

  updatePlayButton(): void {
    if (!this.btnPlay) return;
    if (this.manager.isRunning) {
      this.btnPlay.innerHTML = "&#9646;&#9646; Pause";
      this.btnPlay.className = "px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded transition-colors";
    } else {
      this.btnPlay.innerHTML = "&#9654; Play";
      this.btnPlay.className = "px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors";
    }
  }

  setPreset(name: string): void {
    const badge = document.getElementById("preset-badge");
    if (badge) badge.textContent = name;
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
