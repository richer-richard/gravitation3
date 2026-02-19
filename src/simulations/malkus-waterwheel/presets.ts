export const MALKUS_PRESETS = [
  { id: "chaotic", name: "Chaotic", description: "Chaotic reversals of wheel direction" },
  { id: "periodic", name: "Periodic", description: "Steady periodic rotation" },
  { id: "steady", name: "Steady", description: "Constant angular velocity" },
  { id: "reversals", name: "Reversals", description: "Frequent direction changes" },
] as const;

export type MalkusPreset = typeof MALKUS_PRESETS[number]["id"];
