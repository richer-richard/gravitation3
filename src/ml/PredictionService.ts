/**
 * PredictionService — orchestrates ML predictions for simulations.
 * Falls back to null if ONNX model is unavailable (caller can use physics extrapolation).
 */

import { OnnxModelLoader } from "./OnnxModelLoader";

export class PredictionService {
  private onnx = new OnnxModelLoader();
  private initialized = new Set<string>();

  async init(simulation: string): Promise<boolean> {
    if (this.initialized.has(simulation)) return this.onnx.has(simulation);
    this.initialized.add(simulation);
    return this.onnx.loadModel(simulation);
  }

  async predict(
    simulation: string,
    input: Float32Array,
    shape: number[]
  ): Promise<Float32Array | null> {
    if (!this.onnx.has(simulation)) return null;
    return this.onnx.predict(simulation, input, shape);
  }

  dispose(): void {
    this.onnx.dispose();
  }
}

// Global singleton
let instance: PredictionService | null = null;

export function getPredictionService(): PredictionService {
  if (!instance) instance = new PredictionService();
  return instance;
}
