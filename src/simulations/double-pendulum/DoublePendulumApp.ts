import { DoublePendulumVisualizer } from "./DoublePendulumVisualizer";
import { SimulationManager } from "../SimulationManager";

export class DoublePendulumApp {
  readonly manager = new SimulationManager();
  readonly visualizer = new DoublePendulumVisualizer();

  async init(container: HTMLElement): Promise<void> {
    await this.manager.init("double-pendulum", this.visualizer, container);
    await this.manager.loadPreset("standard");
    this.manager.start();
  }

  dispose(): void {
    this.manager.dispose();
  }
}
