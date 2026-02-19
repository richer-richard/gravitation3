/**
 * ExportService — handles export/import of simulation state as JSON.
 */

export interface ExportData {
  schemaVersion: string;
  simulationType: string;
  timestamp: string;
  state: unknown;
}

export function exportState(simulationType: string, state: unknown): void {
  const data: ExportData = {
    schemaVersion: "2.0.0",
    simulationType,
    timestamp: new Date().toISOString(),
    state,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gravitation3-${simulationType}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importState(): Promise<ExportData | null> {
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

export function takeScreenshot(canvas: HTMLCanvasElement): void {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `gravitation3-screenshot-${Date.now()}.png`;
  a.click();
}
