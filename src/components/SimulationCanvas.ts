/**
 * SimulationCanvas — Three.js canvas wrapper for the simulation viewport.
 * Handles resize observation and provides canvas access.
 */

import type { SimulationVisualizer } from "../simulations/SimulationManager";

export class SimulationCanvas {
  private container: HTMLElement;
  private visualizer: SimulationVisualizer | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  attach(visualizer: SimulationVisualizer): void {
    this.visualizer = visualizer;
    this.visualizer.init(this.container);

    // Remove loading indicator
    const loading = this.container.querySelector("#canvas-loading");
    if (loading) loading.remove();

    // Observe resize
    this.resizeObserver = new ResizeObserver(() => {
      this.visualizer?.resize();
    });
    this.resizeObserver.observe(this.container);
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.visualizer?.getCanvas?.() ?? this.container.querySelector("canvas");
  }

  resize(): void {
    this.visualizer?.resize();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.visualizer = null;
  }
}
