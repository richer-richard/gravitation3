/**
 * TimelineBar — simulation timeline with playback controls and time display.
 */

import type { SimulationManager } from "../simulations/SimulationManager";

export class TimelineBar {
  private container: HTMLElement;
  private manager: SimulationManager;
  private timeEl!: HTMLElement;
  private progressEl!: HTMLElement;

  constructor(container: HTMLElement, manager: SimulationManager) {
    this.container = container;
    this.manager = manager;
  }

  render(): void {
    this.container.innerHTML = `
      <button class="tl-start text-zinc-500 hover:text-zinc-300 text-xs" title="Jump to start">|&#9664;</button>
      <button class="tl-rwd text-zinc-500 hover:text-zinc-300 text-xs" title="Rewind">&#9664;&#9664;</button>
      <button class="tl-play text-zinc-500 hover:text-zinc-300 text-sm" title="Play/Pause">&#9654;</button>
      <button class="tl-fwd text-zinc-500 hover:text-zinc-300 text-xs" title="Fast forward">&#9654;&#9654;</button>
      <button class="tl-end text-zinc-500 hover:text-zinc-300 text-xs" title="Jump to end">&#9654;|</button>
      <div class="flex-1 mx-4">
        <div class="h-1 bg-zinc-700 rounded-full relative">
          <div class="tl-progress h-1 bg-blue-500 rounded-full transition-all" style="width: 0%"></div>
        </div>
      </div>
      <span class="tl-time text-xs font-mono text-zinc-500 w-20 text-right">00:00.0</span>
    `;

    this.timeEl = this.container.querySelector(".tl-time")!;
    this.progressEl = this.container.querySelector(".tl-progress")!;

    const btnPlay = this.container.querySelector(".tl-play")!;
    const btnStart = this.container.querySelector(".tl-start")!;

    btnPlay.addEventListener("click", () => {
      this.manager.toggle();
      btnPlay.textContent = this.manager.isRunning ? "\u23F8" : "\u25B6";
    });

    btnStart.addEventListener("click", () => {
      this.manager.stop();
      this.manager.reset();
      btnPlay.textContent = "\u25B6";
    });
  }

  updateTime(time: number): void {
    if (this.timeEl) {
      const mins = Math.floor(time / 60);
      const secs = time % 60;
      this.timeEl.textContent = `${String(mins).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
    }
  }

  setProgress(fraction: number): void {
    if (this.progressEl) {
      this.progressEl.style.width = `${Math.min(100, fraction * 100)}%`;
    }
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
