/**
 * Physics Bridge — routes all simulation calls through native Tauri IPC.
 * Physics execution is desktop-only and handled exclusively by the Rust engine.
 */

import type { SimulationType } from "../simulations/types";
import {
  tauriAddBody,
  tauriAddPendulum,
  tauriCreateSimulator,
  tauriGetCollisions,
  tauriGetState,
  tauriLoadPreset,
  tauriPhysicsStep,
  tauriRemovePendulum,
  tauriRemoveBody,
  tauriResetSimulation,
  tauriSeedParticles,
  tauriSetParameter,
} from "./tauri-bridge";

export interface PhysicsBridge {
  create(simType: SimulationType): Promise<void>;
  step(steps?: number): Promise<unknown>;
  loadPreset(preset: string): Promise<unknown>;
  setParameter(name: string, value: number): Promise<void>;
  getState(): Promise<unknown>;
  reset(preset?: string): Promise<unknown>;
  getCollisions(): Promise<unknown>;
  seedParticles(count: number): Promise<unknown>;
  addPendulum(
    theta1: number,
    omega1: number,
    theta2: number,
    omega2: number
  ): Promise<unknown>;
  removePendulum(index: number): Promise<unknown>;
  addBody(): Promise<unknown>;
  removeBody(index: number): Promise<unknown>;
  destroy(): void;
}

class TauriPhysicsBridge implements PhysicsBridge {
  private simType: SimulationType | null = null;

  async create(simType: SimulationType): Promise<void> {
    this.simType = simType;
    await tauriCreateSimulator(simType);
  }

  step(steps = 1): Promise<unknown> {
    return tauriPhysicsStep(this.requireSimType(), steps);
  }

  loadPreset(preset: string): Promise<unknown> {
    return tauriLoadPreset(this.requireSimType(), preset);
  }

  async setParameter(name: string, value: number): Promise<void> {
    await tauriSetParameter(this.requireSimType(), name, value);
  }

  getState(): Promise<unknown> {
    return tauriGetState(this.requireSimType());
  }

  reset(preset?: string): Promise<unknown> {
    return tauriResetSimulation(this.requireSimType(), preset);
  }

  getCollisions(): Promise<unknown> {
    return tauriGetCollisions(this.requireSimType());
  }

  seedParticles(count: number): Promise<unknown> {
    return tauriSeedParticles(this.requireSimType(), count);
  }

  addPendulum(
    theta1: number,
    omega1: number,
    theta2: number,
    omega2: number
  ): Promise<unknown> {
    return tauriAddPendulum(
      this.requireSimType(),
      theta1,
      omega1,
      theta2,
      omega2
    );
  }

  removePendulum(index: number): Promise<unknown> {
    return tauriRemovePendulum(this.requireSimType(), index);
  }

  addBody(): Promise<unknown> {
    return tauriAddBody(this.requireSimType());
  }

  removeBody(index: number): Promise<unknown> {
    return tauriRemoveBody(this.requireSimType(), index);
  }

  destroy(): void {
    this.simType = null;
  }

  private requireSimType(): SimulationType {
    if (!this.simType) {
      throw new Error("Physics simulator not initialized");
    }
    return this.simType;
  }
}

let bridgeInstance: PhysicsBridge | null = null;

export function getPhysicsBridge(): PhysicsBridge {
  if (!bridgeInstance) {
    bridgeInstance = new TauriPhysicsBridge();
  }
  return bridgeInstance;
}

export function destroyPhysicsBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.destroy();
    bridgeInstance = null;
  }
}
