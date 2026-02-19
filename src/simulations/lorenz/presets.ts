export const LORENZ_PRESETS = [
  { id: "single", name: "Single", description: "One trajectory through the attractor" },
  { id: "classic", name: "Classic", description: "Canonical parameters (σ=10, ρ=28, β=8/3)" },
  { id: "multicolor", name: "Multicolor", description: "Multiple trajectories with different colors" },
  { id: "chaos", name: "Chaos", description: "Closely spaced initial conditions diverging" },
  { id: "symmetric", name: "Symmetric", description: "Symmetric starting positions" },
] as const;

export type LorenzPreset = typeof LORENZ_PRESETS[number]["id"];
