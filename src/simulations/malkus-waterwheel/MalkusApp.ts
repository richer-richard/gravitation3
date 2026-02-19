import { MalkusVisualizer } from "./MalkusVisualizer";
import { SimulationManager } from "../SimulationManager";

export class MalkusApp {
  readonly manager = new SimulationManager();
  readonly visualizer = new MalkusVisualizer();

  async init(container: HTMLElement): Promise<void> {
    await this.manager.init("malkus-waterwheel", this.visualizer, container);
    await this.manager.loadPreset("chaotic");
    this.manager.start();
  }

  dispose(): void {
    this.manager.dispose();
  }
}
