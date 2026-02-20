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
}

export type SpeedMultiplier = 0.1 | 0.25 | 0.5 | 1 | 2 | 5;

export class SimulationManager {
  private bridge: PhysicsBridge;
  private visualizer: SimulationVisualizer | null = null;
  private simType: SimulationType | null = null;
  private animFrameId = 0;
  private running = false;
  private speed: SpeedMultiplier = 1;
  private stepsPerFrame = 1;
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
    this.visualizer.init(container);
    await this.bridge.create(simType);
  }

  async loadPreset(preset: string): Promise<unknown> {
    const state = await this.bridge.loadPreset(preset);
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async setParameter(name: string, value: number): Promise<void> {
    await this.bridge.setParameter(name, value);
  }

  setSpeed(speed: SpeedMultiplier): void {
    this.speed = speed;
    this.stepsPerFrame = Math.max(1, Math.round(speed));
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
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  async stepOnce(): Promise<unknown> {
    const state = await this.bridge.step(1);
    this.lastState = state;
    this.visualizer?.update(state);
    this.onStateUpdate?.(state);
    return state;
  }

  getLastState(): unknown {
    return this.lastState;
  }

  resize(): void {
    this.visualizer?.resize();
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.visualizer?.getCanvas?.() ?? null;
  }

  // Simulation-specific methods
  async getCollisions(): Promise<unknown> {
    return this.bridge.getCollisions();
  }

  async seedParticles(count: number): Promise<unknown> {
    const state = await this.bridge.seedParticles(count);
    this.lastState = state;
    this.visualizer?.update(state);
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
    return state;
  }

  async removePendulum(index: number): Promise<unknown> {
    const state = await this.bridge.removePendulum(index);
    this.lastState = state;
    this.visualizer?.update(state);
    return state;
  }

  private loop = (): void => {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private tick = async (): Promise<void> => {
    if (!this.running) return;
    try {
      const steps = this.speed < 1 ? 1 : this.stepsPerFrame;
      const state = await this.bridge.step(steps);
      this.consecutiveErrors = 0;
      this.lastState = state;
      this.visualizer?.update(state);
      this.onStateUpdate?.(state);
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
