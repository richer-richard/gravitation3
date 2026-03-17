/**
 * Tauri Bridge — provides native IPC utilities for the desktop app.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";

type TauriWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

type TauriGlobal = typeof globalThis & {
  isTauri?: boolean;
};

function hasTauriRuntimeHint(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const runtimeWindow = window as TauriWindow;
  const runtimeGlobal = globalThis as TauriGlobal;

  return Boolean(
    runtimeWindow.__TAURI_INTERNALS__ ||
      runtimeWindow.__TAURI__ ||
      runtimeGlobal.isTauri
  );
}

export const IS_TAURI = hasTauriRuntimeHint();

interface TauriInvoke {
  (cmd: string, args?: Record<string, unknown>): Promise<unknown>;
}

let tauriInvoke: TauriInvoke | null = null;

async function getTauriInvoke(): Promise<TauriInvoke> {
  if (tauriInvoke) return tauriInvoke;
  const runtimeDetected =
    hasTauriRuntimeHint() ||
    (typeof isTauri === "function" && isTauri());
  if (!runtimeDetected) {
    throw new Error("Not running in Tauri");
  }
  tauriInvoke = invoke as TauriInvoke;
  return tauriInvoke;
}

export async function tauriPhysicsStep(
  sim: string,
  steps: number
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("physics_step", { sim, steps });
}

export async function tauriCreateSimulator(sim: string): Promise<void> {
  const invoke = await getTauriInvoke();
  await invoke("create_simulator", { sim });
}

export async function tauriLoadPreset(
  sim: string,
  preset: string
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("load_preset", { sim, preset });
}

export async function tauriSetParameter(
  sim: string,
  name: string,
  value: number
): Promise<void> {
  const invoke = await getTauriInvoke();
  await invoke("set_parameter", { sim, name, value });
}

export async function tauriGetState(sim: string): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("get_state", { sim });
}

export async function tauriResetSimulation(
  sim: string,
  preset?: string
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  const args: Record<string, unknown> = { sim };
  if (preset !== undefined) {
    args.preset = preset;
  }
  return invoke("reset_simulation", args);
}

export async function tauriGetCollisions(sim: string): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("get_collisions", { sim });
}

export async function tauriSeedParticles(
  sim: string,
  count: number
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("seed_particles", { sim, count });
}

export async function tauriAddPendulum(
  sim: string,
  theta1: number,
  omega1: number,
  theta2: number,
  omega2: number
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("add_pendulum", { sim, theta1, omega1, theta2, omega2 });
}

export async function tauriRemovePendulum(
  sim: string,
  index: number
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("remove_pendulum", { sim, index });
}

export async function tauriAddBody(sim: string): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("add_body", { sim });
}

export async function tauriRemoveBody(
  sim: string,
  index: number
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("remove_body", { sim, index });
}

export async function tauriStoreApiKey(
  provider: string,
  key: string
): Promise<void> {
  const invoke = await getTauriInvoke();
  await invoke("store_api_key", { provider, key });
}

export async function tauriHasApiKey(provider: string): Promise<boolean> {
  const invoke = await getTauriInvoke();
  return invoke("has_api_key", { provider }) as Promise<boolean>;
}

export async function tauriAiChat(
  request: Record<string, unknown>
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("ai_chat", { request });
}
