import { invoke } from "@tauri-apps/api/core";
import { ModelInfo, ParamInfo } from "@/types/simulation";

export async function listModels(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>("list_models");
}

export async function selectModel(id: string): Promise<ParamInfo[]> {
  return invoke<ParamInfo[]>("select_model", { id });
}

export async function setParams(
  params: Record<string, number>
): Promise<void> {
  return invoke("set_params", { params });
}

export async function setRunning(running: boolean): Promise<void> {
  return invoke("set_running", { running });
}

export async function setStepsPerFrame(steps: number): Promise<void> {
  return invoke("set_steps_per_frame", { steps });
}

export async function resetSimulation(): Promise<void> {
  return invoke("reset_simulation");
}

export async function getFrame(): Promise<ArrayBuffer> {
  const raw = await invoke<ArrayBuffer | Uint8Array>("get_frame");
  // Tauri v2 may return either ArrayBuffer or Uint8Array for raw byte responses.
  // Normalize to a standalone ArrayBuffer so typed-array constructors work.
  if (raw instanceof ArrayBuffer) {
    return raw;
  }
  if (raw instanceof Uint8Array) {
    // Copy to a new ArrayBuffer to guarantee alignment and correct type
    const copy = new Uint8Array(raw.byteLength);
    copy.set(raw);
    return copy.buffer as ArrayBuffer;
  }
  // Fallback: treat as array-like and copy
  return new Uint8Array(raw as any).buffer;
}
