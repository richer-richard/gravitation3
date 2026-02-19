/**
 * Physics Bridge — communicates with the physics Web Worker.
 * Provides a promise-based API for the main thread.
 * Falls back to Tauri IPC when running in the desktop app.
 */

import type { SimulationType } from "../simulations/types";

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
  destroy(): void;
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

class WorkerPhysicsBridge implements PhysicsBridge {
  private worker: Worker;
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private ready: Promise<void>;
  private simType: SimulationType | null = null;

  constructor() {
    this.worker = new Worker(
      new URL("../workers/physics-worker.ts", import.meta.url),
      { type: "module" }
    );

    this.ready = new Promise((resolve) => {
      const onReady = (e: MessageEvent) => {
        if (e.data.id === -1 && e.data.data?.ready) {
          this.worker.removeEventListener("message", onReady);
          resolve();
        }
      };
      this.worker.addEventListener("message", onReady);
    });

    this.worker.onmessage = (e: MessageEvent) => {
      const { id, type, data, error } = e.data;
      if (id === -1) return; // init message handled above
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if (type === "error") {
        pending.reject(new Error(error));
      } else {
        pending.resolve(data);
      }
    };
  }

  private send(
    type: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this.ready.then(
      () =>
        new Promise((resolve, reject) => {
          const id = this.nextId++;
          this.pending.set(id, { resolve, reject });
          this.worker.postMessage({
            id,
            type,
            simType: this.simType,
            ...params,
          });
        })
    );
  }

  async create(simType: SimulationType): Promise<void> {
    this.simType = simType;
    await this.send("create", { simType });
  }

  step(steps = 1): Promise<unknown> {
    return this.send("step", { steps });
  }

  loadPreset(preset: string): Promise<unknown> {
    return this.send("loadPreset", { preset });
  }

  async setParameter(name: string, value: number): Promise<void> {
    await this.send("setParameter", { name, value });
  }

  getState(): Promise<unknown> {
    return this.send("getState");
  }

  reset(preset?: string): Promise<unknown> {
    return this.send("reset", { preset });
  }

  getCollisions(): Promise<unknown> {
    return this.send("getCollisions");
  }

  seedParticles(count: number): Promise<unknown> {
    return this.send("seedParticles", { count });
  }

  addPendulum(
    theta1: number,
    omega1: number,
    theta2: number,
    omega2: number
  ): Promise<unknown> {
    return this.send("addPendulum", { theta1, omega1, theta2, omega2 });
  }

  removePendulum(index: number): Promise<unknown> {
    return this.send("removePendulum", { index });
  }

  destroy(): void {
    this.worker.terminate();
    for (const [, pending] of this.pending) {
      pending.reject(new Error("Worker terminated"));
    }
    this.pending.clear();
  }
}

let bridgeInstance: PhysicsBridge | null = null;

export function getPhysicsBridge(): PhysicsBridge {
  if (!bridgeInstance) {
    bridgeInstance = new WorkerPhysicsBridge();
  }
  return bridgeInstance;
}

export function destroyPhysicsBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.destroy();
    bridgeInstance = null;
  }
}
