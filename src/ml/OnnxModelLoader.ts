/**
 * OnnxModelLoader — loads and runs ONNX models using ONNX Runtime Web.
 */

import * as ort from "onnxruntime-web";

export class OnnxModelLoader {
  private sessions = new Map<string, ort.InferenceSession>();

  constructor() {
    // Configure ONNX Runtime
    ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
  }

  async loadModel(simulation: string): Promise<boolean> {
    try {
      const session = await ort.InferenceSession.create(
        `/models/${simulation}/model.onnx`
      );
      this.sessions.set(simulation, session);
      return true;
    } catch {
      console.warn(
        `ONNX model not available for ${simulation}, using algorithm fallback`
      );
      return false;
    }
  }

  has(simulation: string): boolean {
    return this.sessions.has(simulation);
  }

  async predict(
    simulation: string,
    input: Float32Array,
    shape: number[]
  ): Promise<Float32Array> {
    const session = this.sessions.get(simulation);
    if (!session) throw new Error(`No model loaded for ${simulation}`);

    const tensor = new ort.Tensor("float32", input, shape);
    const feeds: Record<string, ort.Tensor> = {};

    // Use first input name from model
    const inputName = session.inputNames[0];
    feeds[inputName] = tensor;

    const results = await session.run(feeds);
    const outputName = session.outputNames[0];
    return results[outputName].data as Float32Array;
  }

  dispose(): void {
    for (const [, session] of this.sessions) {
      session.release();
    }
    this.sessions.clear();
  }
}
