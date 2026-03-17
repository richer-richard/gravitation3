/**
 * SimulationManager — lifecycle manager for all simulations.
 * Coordinates physics bridge, visualizer, and animation loop.
 */

import type { SimulationType } from "./types";
import { getPhysicsBridge, destroyPhysicsBridge } from "../utils/physics-bridge";
import type { PhysicsBridge } from "../utils/physics-bridge";

export interface SimulationVisualizer {
  init(container: HTMLElement): void;
  update(state: unknown): void;
  resize(): void;
  dispose(): void;
  getCanvas?(): HTMLCanvasElement | null;
  clearTrails?(): void;
}

export type SpeedMultiplier = 0.1 | 0.25 | 0.5 | 1 | 2 | 5;

const BASE_STEPS: Record<string, number> = {
  lorenz: 10,
  rossler: 8,
  "double-gyre": 5,
  "lid-driven-cavity": 2,
  "double-pendulum": 3,
  "malkus-waterwheel": 3,
  "three-body": 2,
};

export class SimulationManager {
  private bridge: PhysicsBridge;
  private visualizer: SimulationVisualizer | null = null;
  private simType: SimulationType | null = null;
  private animFrameId = 0;
  private running = false;
  private speed: SpeedMultiplier = 1;
  private baseStepsPerFrame = 1;
  private frameCounter = 0;
  private onStateUpdate: ((state: unknown) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private lastState: unknown = null;
  private consecutiveErrors = 0;
  private static readonly MAX_CONSECUTIVE_ERRORS = 10;

  constructor() {
    this.bridge = getPhysicsBridge();
  }

  async init(
    simType: SimulationType,
    visualizer: SimulationVisualizer,
    container: HTMLElement
  ): Promise<void> {
    this.stop();
    this.simType = simType;
    this.visualizer = visualizer;
    this.baseStepsPerFrame = BASE_STEPS[simType] ?? 1;
    this.visualizer.init(container);
    await this.bridge.create(simType);
  }

  async loadPreset(preset: string): Promise<unknown> {
    const state = await this.bridge.loadPreset(preset);
    this.lastState = state;
    this.frameCounter = 0;
    this.visualizer?.clearTrails?.();
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async setParameter(name: string, value: number): Promise<void> {
    await this.bridge.setParameter(name, value);
  }

  setSpeed(speed: SpeedMultiplier): void {
    this.speed = speed;
    this.frameCounter = 0;
  }

  setOnStateUpdate(cb: (state: unknown) => void): void {
    this.onStateUpdate = cb;
  }

  setOnError(cb: (error: Error) => void): void {
    this.onError = cb;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  toggle(): void {
    if (this.running) this.stop();
    else this.start();
  }

  async reset(preset?: string): Promise<unknown> {
    this.stop();
    const state = await this.bridge.reset(preset);
    this.lastState = state;
    this.frameCounter = 0;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async stepOnce(): Promise<unknown> {
    const state = await this.bridge.step(this.baseStepsPerFrame);
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  getLastState(): unknown {
    return this.lastState;
  }

  getSimType(): SimulationType | null {
    return this.simType;
  }

  resize(): void {
    this.visualizer?.resize();
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.visualizer?.getCanvas?.() ?? null;
  }

  getVisualizer(): SimulationVisualizer | null {
    return this.visualizer;
  }

  // Simulation-specific methods
  async getCollisions(): Promise<unknown> {
    return this.bridge.getCollisions();
  }

  async seedParticles(count: number): Promise<unknown> {
    const state = await this.bridge.seedParticles(count);
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async addPendulum(
    theta1: number,
    omega1: number,
    theta2: number,
    omega2: number
  ): Promise<unknown> {
    const state = await this.bridge.addPendulum(theta1, omega1, theta2, omega2);
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async removePendulum(index: number): Promise<unknown> {
    const state = await this.bridge.removePendulum(index);
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async addBody(): Promise<unknown> {
    const state = await this.bridge.addBody();
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async removeBody(index: number): Promise<unknown> {
    const state = await this.bridge.removeBody(index);
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  private shouldStep(): { doStep: boolean; steps: number } {
    if (this.speed >= 1) {
      return { doStep: true, steps: Math.round(this.speed * this.baseStepsPerFrame) };
    }
    // Fractional speed: skip frames. speed=0.5 → step every 2nd frame
    this.frameCounter++;
    const interval = Math.round(1 / this.speed);
    if (this.frameCounter >= interval) {
      this.frameCounter = 0;
      return { doStep: true, steps: this.baseStepsPerFrame };
    }
    return { doStep: false, steps: 0 };
  }

  private loop = (): void => {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private tick = async (): Promise<void> => {
    if (!this.running) return;
    try {
      const { doStep, steps } = this.shouldStep();
      if (doStep && steps > 0) {
        const state = await this.bridge.step(steps);
        this.consecutiveErrors = 0;
        this.lastState = state;
        this.visualizer?.update(state);
        this.onStateUpdate?.(state);
      }
    } catch (err) {
      this.consecutiveErrors++;
      const error = err instanceof Error ? err : new Error(String(err));
      this.onError?.(error);
      if (this.consecutiveErrors >= SimulationManager.MAX_CONSECUTIVE_ERRORS) {
        this.stop();
        this.onError?.(new Error(`Simulation stopped after ${this.consecutiveErrors} consecutive errors`));
        return;
      }
    }
    if (this.running) {
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  };

  dispose(): void {
    this.stop();
    this.visualizer?.dispose();
    this.visualizer = null;
    this.simType = null;
    this.onStateUpdate = null;
    this.lastState = null;
  }

  static destroyGlobal(): void {
    destroyPhysicsBridge();
  }
}
