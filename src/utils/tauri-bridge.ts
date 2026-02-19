/**
 * Tauri Bridge — detects Tauri environment and provides IPC utilities.
 * When running in Tauri, physics calls go through native Rust IPC (fastest).
 * When running in browser, falls back to WASM via the physics worker.
 */

export const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

interface TauriInvoke {
  (cmd: string, args?: Record<string, unknown>): Promise<unknown>;
}

let tauriInvoke: TauriInvoke | null = null;

async function getTauriInvoke(): Promise<TauriInvoke> {
  if (tauriInvoke) return tauriInvoke;
  if (!IS_TAURI) throw new Error("Not running in Tauri");
  const { invoke } = await import("@tauri-apps/api/core");
  tauriInvoke = invoke;
  return tauriInvoke;
}

export async function tauriPhysicsStep(
  sim: string,
  steps: number
): Promise<unknown> {
  const invoke = await getTauriInvoke();
  return invoke("physics_step", { sim, steps });
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
