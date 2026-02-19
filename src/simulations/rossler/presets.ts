export const ROSSLER_PRESETS = [
  { id: "classic", name: "Classic", description: "Standard Rössler parameters (a=0.2, b=0.2, c=5.7)" },
  { id: "chaotic", name: "Chaotic", description: "Increased c parameter for more chaos" },
  { id: "periodic", name: "Periodic", description: "Parameters producing periodic orbits" },
  { id: "funnel", name: "Funnel", description: "Funnel-shaped attractor" },
] as const;

export type RosslerPreset = typeof ROSSLER_PRESETS[number]["id"];
