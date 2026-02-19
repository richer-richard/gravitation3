export const DOUBLE_GYRE_PRESETS = [
  { id: "standard", name: "Standard", description: "Classic double-gyre flow" },
  { id: "divergence", name: "Divergence", description: "Strong divergent flow" },
  { id: "convergence", name: "Convergence", description: "Strong convergent flow" },
  { id: "chaos", name: "Chaos", description: "Highly chaotic mixing" },
] as const;

export type DoubleGyrePreset = typeof DOUBLE_GYRE_PRESETS[number]["id"];
