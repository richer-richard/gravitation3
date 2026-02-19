/**
 * Model metadata registry for ML prediction models.
 */

export interface ModelMeta {
  simulation: string;
  inputShape: number[];
  outputShape: number[];
  description: string;
}

export const MODEL_REGISTRY: ModelMeta[] = [
  {
    simulation: "three-body",
    inputShape: [1, 18],  // 3 bodies * 6 (x,y,z,vx,vy,vz)
    outputShape: [1, 18],
    description: "Predicts next state of 3-body system",
  },
  {
    simulation: "double-pendulum",
    inputShape: [1, 4],   // theta1, omega1, theta2, omega2
    outputShape: [1, 4],
    description: "Predicts next state of double pendulum",
  },
  {
    simulation: "lorenz",
    inputShape: [1, 3],   // x, y, z
    outputShape: [1, 3],
    description: "Predicts next point on Lorenz attractor",
  },
  {
    simulation: "rossler",
    inputShape: [1, 3],   // x, y, z
    outputShape: [1, 3],
    description: "Predicts next point on Rossler attractor",
  },
  {
    simulation: "double-gyre",
    inputShape: [1, 3],   // x, y, t
    outputShape: [1, 2],  // u, v
    description: "Predicts flow velocity at given point",
  },
  {
    simulation: "malkus-waterwheel",
    inputShape: [1, 10],  // omega + bucket masses
    outputShape: [1, 10],
    description: "Predicts next state of waterwheel",
  },
];

export function getModelMeta(simulation: string): ModelMeta | undefined {
  return MODEL_REGISTRY.find((m) => m.simulation === simulation);
}
