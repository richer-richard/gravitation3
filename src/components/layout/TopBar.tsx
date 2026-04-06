import { useSimulationStore } from "@/store/simulation-store";
import { CATEGORY_COLORS } from "@/types/simulation";

export function TopBar() {
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  const category = useSimulationStore((s) => s.category);
  const models = useSimulationStore((s) => s.models);
  const simTime = useSimulationStore((s) => s.simTime);
  const fps = useSimulationStore((s) => s.fps);
  const running = useSimulationStore((s) => s.running);

  const model = models.find((m) => m.id === activeModelId);
  const accentColor = category ? CATEGORY_COLORS[category] : "var(--text-tertiary)";

  return (
    <div className="h-[28px] flex items-center px-4 gap-4 border-b border-white/[0.04] no-select bg-black/30">
      <div className="flex items-center gap-2">
        {category && (
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accentColor }}
          />
        )}
        <span className="text-xs font-medium text-text-primary tracking-tight">
          {model?.name ?? "Gravitation3"}
        </span>
      </div>

      <div className="flex-1" />

      {activeModelId && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="label">T</span>
            <span className="value-mono text-2xs">
              {simTime.toFixed(3)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: running
                  ? "var(--accent-stability)"
                  : "var(--text-tertiary)",
                boxShadow: running
                  ? "0 0 4px var(--accent-stability)"
                  : "none",
              }}
            />
            <span className="value-mono text-2xs">
              {fps} <span className="text-text-tertiary">fps</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
