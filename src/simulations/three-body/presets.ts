export const THREE_BODY_PRESETS = [
  { id: "figure8", name: "Figure-8", description: "Stable periodic orbit discovered by Moore (1993)" },
  { id: "lagrange", name: "Lagrange Triangle", description: "Equilateral triangle configuration" },
  { id: "chaotic", name: "Chaotic", description: "Sensitive to initial conditions" },
  { id: "custom", name: "Custom", description: "User-defined initial conditions" },
] as const;

export type ThreeBodyPreset = typeof THREE_BODY_PRESETS[number]["id"];
