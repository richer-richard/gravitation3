export type ModelCategory =
  | "attractors"
  | "discrete"
  | "multibody"
  | "cfd"
  | "chembio";

export interface ModelInfo {
  id: string;
  name: string;
  category: ModelCategory;
}

export interface ParamInfo {
  name: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
}

export enum OutputKind {
  Particles3D = 0,
  Points2D = 1,
  Bodies = 2,
  Field2D = 3,
}

export interface FrameHeader {
  frameId: number;
  outputKind: OutputKind;
  elementCount: number;
  components: number;
  dtype: "f32" | "f64";
  simTime: number;
  lyapunov: number;
  energy: number;
  maxDivergence: number;
}

export const CATEGORY_LABELS: Record<ModelCategory, string> = {
  attractors: "3D Attractors",
  discrete: "Discrete Maps",
  multibody: "Multi-Body",
  cfd: "Fluid Dynamics",
  chembio: "Chemical & Bio",
};

export const CATEGORY_COLORS: Record<ModelCategory, string> = {
  attractors: "#5bf0d8",
  discrete: "#a78bfa",
  multibody: "#f857a6",
  cfd: "#38bdf8",
  chembio: "#34d399",
};
