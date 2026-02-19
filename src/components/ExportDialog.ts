/**
 * ExportDialog — modal dialog for export/import of simulation state.
 */

import { exportState, importState, takeScreenshot } from "../services/ExportService";
import type { SimulationType } from "../simulations/types";

export class ExportDialog {
  private overlay: HTMLElement | null = null;
  private simType: SimulationType;
  private getState: () => unknown;
  private getCanvas: () => HTMLCanvasElement | null;
  private onImport: (state: unknown) => void;

  constructor(
    simType: SimulationType,
    getState: () => unknown,
    getCanvas: () => HTMLCanvasElement | null,
    onImport: (state: unknown) => void
  ) {
    this.simType = simType;
    this.getState = getState;
    this.getCanvas = getCanvas;
    this.onImport = onImport;
  }

  show(): void {
    this.overlay = document.createElement("div");
    this.overlay.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm";

    this.overlay.innerHTML = `
      <div class="bg-zinc-800 rounded-xl border border-zinc-700 shadow-2xl w-96 p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-semibold text-zinc-100">Export / Import</h2>
          <button class="export-close text-zinc-500 hover:text-zinc-300 text-xl">&times;</button>
        </div>
        <div class="space-y-3">
          <button class="export-json w-full px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg text-left transition-colors">
            <div class="font-medium">Export State (JSON)</div>
            <div class="text-xs text-zinc-400 mt-0.5">Download simulation state as a JSON file</div>
          </button>
          <button class="export-screenshot w-full px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg text-left transition-colors">
            <div class="font-medium">Screenshot (PNG)</div>
            <div class="text-xs text-zinc-400 mt-0.5">Save current canvas as an image</div>
          </button>
          <hr class="border-zinc-700" />
          <button class="export-import w-full px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg text-left transition-colors">
            <div class="font-medium">Import State</div>
            <div class="text-xs text-zinc-400 mt-0.5">Load a previously exported JSON state</div>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Close handlers
    this.overlay.querySelector(".export-close")?.addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Export JSON
    this.overlay.querySelector(".export-json")?.addEventListener("click", () => {
      exportState(this.simType, this.getState());
      this.close();
    });

    // Screenshot
    this.overlay.querySelector(".export-screenshot")?.addEventListener("click", () => {
      const canvas = this.getCanvas();
      if (canvas) {
        takeScreenshot(canvas);
      }
      this.close();
    });

    // Import
    this.overlay.querySelector(".export-import")?.addEventListener("click", async () => {
      const data = await importState();
      if (data?.state) {
        this.onImport(data.state);
      }
      this.close();
    });
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = null;
  }
}
