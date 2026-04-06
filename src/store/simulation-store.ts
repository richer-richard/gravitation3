import { create } from "zustand";
import {
  FrameHeader,
  ModelCategory,
  ModelInfo,
  ParamInfo,
} from "@/types/simulation";
import * as commands from "@/ipc/commands";
import { decodeFrame } from "@/ipc/codec";

interface SimulationState {
  // Models
  models: ModelInfo[];
  activeModelId: string | null;
  category: ModelCategory | null;

  // Params
  paramSchema: ParamInfo[];
  params: Record<string, number>;

  // Runtime
  running: boolean;
  stepsPerFrame: number;
  simTime: number;
  frameId: number;

  // Frame data
  frameHeader: FrameHeader | null;
  frameData: Float32Array | Float64Array | null;

  // Diagnostics
  fps: number;
  lyapunov: number;
  energy: number;

  // Actions
  loadModels: () => Promise<void>;
  selectModel: (id: string) => Promise<void>;
  setParam: (name: string, value: number) => void;
  toggleRunning: () => void;
  setRunning: (running: boolean) => void;
  reset: () => Promise<void>;
  setStepsPerFrame: (n: number) => void;
  fetchFrame: () => Promise<void>;
  updateFps: (fps: number) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  models: [],
  activeModelId: null,
  category: null,
  paramSchema: [],
  params: {},
  running: false,
  stepsPerFrame: 10,
  simTime: 0,
  frameId: 0,
  frameHeader: null,
  frameData: null,
  fps: 0,
  lyapunov: NaN,
  energy: NaN,

  loadModels: async () => {
    const models = await commands.listModels();
    set({ models });
  },

  selectModel: async (id: string) => {
    const { models } = get();
    const model = models.find((m) => m.id === id);
    if (!model) return;

    set({ running: false });
    await commands.setRunning(false);

    const schema = await commands.selectModel(id);
    const params: Record<string, number> = {};
    for (const p of schema) {
      params[p.name] = p.default;
    }

    set({
      activeModelId: id,
      category: model.category as ModelCategory,
      paramSchema: schema,
      params,
      frameHeader: null,
      frameData: null,
      simTime: 0,
      frameId: 0,
    });

    // Auto-start simulation and fetch initial frame
    try {
      await commands.setRunning(true);
      set({ running: true });
      await get().fetchFrame();
    } catch (err) {
      console.warn("[selectModel] initial start failed:", err);
    }
  },

  setParam: (name: string, value: number) => {
    const params = { ...get().params, [name]: value };
    set({ params });
    commands.setParams(params);
  },

  toggleRunning: () => {
    const running = !get().running;
    set({ running });
    commands.setRunning(running);
  },

  setRunning: (running: boolean) => {
    set({ running });
    commands.setRunning(running);
  },

  reset: async () => {
    await commands.resetSimulation();
    set({ simTime: 0, frameId: 0, frameHeader: null, frameData: null });
    try {
      await get().fetchFrame();
    } catch (err) {
      console.warn("[reset] frame fetch after reset failed:", err);
    }
  },

  setStepsPerFrame: (n: number) => {
    set({ stepsPerFrame: n });
    commands.setStepsPerFrame(n);
  },

  fetchFrame: async () => {
    const raw = await commands.getFrame();
    if (!raw || (raw instanceof ArrayBuffer && raw.byteLength === 0)) return;
    const result = decodeFrame(raw);
    if (!result) return;

    set({
      frameHeader: result.header,
      frameData: result.data,
      simTime: result.header.simTime,
      frameId: result.header.frameId,
      lyapunov: result.header.lyapunov,
      energy: result.header.energy,
    });
  },

  updateFps: (fps: number) => set({ fps }),
}));
