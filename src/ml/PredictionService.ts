/**
 * PredictionService — orchestrates ML predictions for simulations.
 * Tries ONNX model first, falls back to server-side physics prediction.
 */

import { OnnxModelLoader } from "./OnnxModelLoader";
import { getModelMeta } from "./models";

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

  /**
   * Predict a trajectory N steps forward.
   * Returns an array of predicted state arrays, or null if unavailable.
   */
  async predictTrajectory(
    simulation: string,
    currentState: number[],
    steps = 100
  ): Promise<number[][] | null> {
    const meta = getModelMeta(simulation);
    if (!meta) return null;

    // Try ONNX model first
    if (this.onnx.has(simulation)) {
      const trajectory: number[][] = [];
      let state = new Float32Array(currentState);
      for (let i = 0; i < steps; i++) {
        const result = await this.onnx.predict(simulation, state, meta.inputShape);
        if (!result) break;
        trajectory.push(Array.from(result));
        state = result;
      }
      if (trajectory.length > 0) return trajectory;
    }

    // Fall back to server-side physics prediction
    try {
      const simId = simulation.replace(/-/g, "_");
      const response = await fetch(`http://localhost:5003/api/${simId}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: { values: currentState }, steps, dt: 0.01 }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.predicted_states && data.predicted_states.length > 0) {
        return data.predicted_states;
      }
    } catch {
      // Server unavailable
    }

    return null;
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
