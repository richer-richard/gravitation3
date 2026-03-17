/**
 * ExportService — handles export/import of simulation state.
 * Uses native Tauri dialogs when available, falls back to browser APIs.
 */

import { open, save } from "@tauri-apps/plugin-dialog";
import {
  readTextFile,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { IS_TAURI } from "../utils/tauri-bridge";

export interface ExportData {
  schemaVersion: string;
  simulationType: string;
  timestamp: string;
  state: unknown;
}

export async function exportState(simulationType: string, state: unknown): Promise<void> {
  const data: ExportData = {
    schemaVersion: "2.0.0",
    simulationType,
    timestamp: new Date().toISOString(),
    state,
  };

  const json = JSON.stringify(data, null, 2);

  if (IS_TAURI) {
    try {
      const path = await save({
        defaultPath: `gravitation3-${simulationType}-${Date.now()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        await writeTextFile(path, json);
      }
      return;
    } catch { /* fall through to browser method */ }
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gravitation3-${simulationType}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importState(): Promise<ExportData | null> {
  if (IS_TAURI) {
    try {
      const path = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (path && typeof path === "string") {
        const text = await readTextFile(path);
        return JSON.parse(text) as ExportData;
      }
      return null;
    } catch { /* fall through */ }
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as ExportData;
        resolve(data);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

export async function takeScreenshot(canvas: HTMLCanvasElement): Promise<void> {
  if (IS_TAURI) {
    try {
      const path = await save({
        defaultPath: `gravitation3-screenshot-${Date.now()}.png`,
        filters: [{ name: "PNG Image", extensions: ["png"] }],
      });
      if (path) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const buffer = await blob.arrayBuffer();
          await writeFile(path, new Uint8Array(buffer));
        }
      }
      return;
    } catch { /* fall through */ }
  }

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `gravitation3-screenshot-${Date.now()}.png`;
  a.click();
}
