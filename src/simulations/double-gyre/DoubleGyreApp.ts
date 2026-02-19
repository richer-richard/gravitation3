import { DoubleGyreVisualizer } from "./DoubleGyreVisualizer";
import { SimulationManager } from "../SimulationManager";

export class DoubleGyreApp {
  readonly manager = new SimulationManager();
  readonly visualizer = new DoubleGyreVisualizer();

  async init(container: HTMLElement): Promise<void> {
    await this.manager.init("double-gyre", this.visualizer, container);
    await this.manager.loadPreset("standard");
    this.manager.start();
  }

  dispose(): void {
    this.manager.dispose();
  }
}
