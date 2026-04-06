import { useSimulationStore } from "@/store/simulation-store";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronsRight,
} from "lucide-react";

const SPEED_PRESETS = [1, 5, 10, 25, 50];

export function BottomBar() {
  const running = useSimulationStore((s) => s.running);
  const toggleRunning = useSimulationStore((s) => s.toggleRunning);
  const reset = useSimulationStore((s) => s.reset);
  const stepsPerFrame = useSimulationStore((s) => s.stepsPerFrame);
  const setStepsPerFrame = useSimulationStore((s) => s.setStepsPerFrame);
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  const fetchFrame = useSimulationStore((s) => s.fetchFrame);

  if (!activeModelId) return null;

  return (
    <div className="h-[44px] flex items-center justify-center gap-2 border-t border-white/[0.04] no-select bg-black/30 px-4">
      {/* Transport controls */}
      <button className="transport-btn" onClick={reset} title="Reset">
        <RotateCcw size={14} />
      </button>

      <button
        className={`transport-btn ${running ? "active" : ""}`}
        onClick={toggleRunning}
        title={running ? "Pause" : "Play"}
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
      </button>

      <button
        className="transport-btn"
        onClick={() => {
          if (!running) fetchFrame();
        }}
        title="Step Forward"
      >
        <SkipForward size={14} />
      </button>

      {/* Speed divider */}
      <div className="w-px h-5 bg-white/[0.06] mx-2" />

      {/* Speed presets */}
      <div className="flex items-center gap-1">
        <ChevronsRight size={12} className="text-text-tertiary mr-1" />
        {SPEED_PRESETS.map((s) => (
          <button
            key={s}
            className={`px-2 py-0.5 rounded-control text-2xs font-mono transition-colors duration-150 ${
              stepsPerFrame === s
                ? "bg-surface-active text-phase border border-phase/30"
                : "text-text-tertiary hover:text-text-secondary hover:bg-surface-hover"
            }`}
            onClick={() => setStepsPerFrame(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
