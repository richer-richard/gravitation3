import { LorenzVisualizer } from "./LorenzVisualizer";
import { SimulationManager } from "../SimulationManager";

export class LorenzApp {
  readonly manager = new SimulationManager();
  readonly visualizer = new LorenzVisualizer();

  async init(container: HTMLElement): Promise<void> {
    await this.manager.init("lorenz", this.visualizer, container);
    await this.manager.loadPreset("classic");
    this.manager.start();
  }

  dispose(): void {
    this.manager.dispose();
  }
}
