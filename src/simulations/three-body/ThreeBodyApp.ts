import { ThreeBodyVisualizer } from "./ThreeBodyVisualizer";
import { SimulationManager } from "../SimulationManager";

export class ThreeBodyApp {
  readonly manager = new SimulationManager();
  readonly visualizer = new ThreeBodyVisualizer();

  async init(container: HTMLElement): Promise<void> {
    await this.manager.init("three-body", this.visualizer, container);
    await this.manager.loadPreset("figure8");
    this.manager.start();
  }

  dispose(): void {
    this.manager.dispose();
  }
}
