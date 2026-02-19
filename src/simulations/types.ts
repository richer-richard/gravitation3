export type SimulationType =
  | "three-body"
  | "double-pendulum"
  | "lorenz"
  | "rossler"
  | "double-gyre"
  | "malkus-waterwheel";

export interface SimulationMeta {
  id: SimulationType;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export const SIMULATION_LIST: SimulationMeta[] = [
  {
    id: "three-body",
    name: "Three-Body Problem",
    description: "Gravitational N-body dynamics",
    category: "Gravitational",
    icon: "\u2733",
  },
  {
    id: "double-pendulum",
    name: "Double Pendulum",
    description: "Chaotic Lagrangian mechanics",
    category: "Mechanical",
    icon: "\u21BA",
  },
  {
    id: "lorenz",
    name: "Lorenz Attractor",
    description: "The butterfly effect",
    category: "Attractor",
    icon: "\u221E",
  },
  {
    id: "rossler",
    name: "Rossler Attractor",
    description: "Spiral chaos",
    category: "Attractor",
    icon: "\u21BB",
  },
  {
    id: "double-gyre",
    name: "Double Gyre",
    description: "Oceanic flow patterns",
    category: "Fluid",
    icon: "\u2248",
  },
  {
    id: "malkus-waterwheel",
    name: "Malkus Waterwheel",
    description: "Mechanical chaos",
    category: "Mechanical",
    icon: "\u2699",
  },
];
