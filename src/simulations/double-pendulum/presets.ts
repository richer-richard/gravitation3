export const DOUBLE_PENDULUM_PRESETS = [
  { id: "standard", name: "Standard", description: "Classic double pendulum" },
  { id: "symmetric", name: "Symmetric", description: "Two pendulums with symmetric initial conditions" },
  { id: "chaotic", name: "Chaotic", description: "Highly sensitive configuration" },
  { id: "gentle", name: "Gentle", description: "Small angle oscillations" },
] as const;

export type DoublePendulumPreset = typeof DOUBLE_PENDULUM_PRESETS[number]["id"];
