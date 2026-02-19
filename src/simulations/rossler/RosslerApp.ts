import { RosslerVisualizer } from "./RosslerVisualizer";
import { SimulationManager } from "../SimulationManager";

export class RosslerApp {
  readonly manager = new SimulationManager();
  readonly visualizer = new RosslerVisualizer();

  async init(container: HTMLElement): Promise<void> {
    await this.manager.init("rossler", this.visualizer, container);
    await this.manager.loadPreset("classic");
    this.manager.start();
  }

  dispose(): void {
    this.manager.dispose();
  }
}
