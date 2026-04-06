import { useSimulationStore } from "@/store/simulation-store";
import { GlassPanel } from "./GlassPanel";

export function MetricsPanel() {
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  const lyapunov = useSimulationStore((s) => s.lyapunov);
  const energy = useSimulationStore((s) => s.energy);
  const simTime = useSimulationStore((s) => s.simTime);
  const frameId = useSimulationStore((s) => s.frameId);
  const frameHeader = useSimulationStore((s) => s.frameHeader);

  if (!activeModelId) return null;

  const metrics = [
    {
      label: "Time",
      value: simTime.toFixed(4),
      color: "var(--accent-time)",
    },
    {
      label: "Frame",
      value: frameId.toString(),
      color: "var(--text-secondary)",
    },
    {
      label: "Elements",
      value: frameHeader ? frameHeader.elementCount.toLocaleString() : "—",
      color: "var(--text-secondary)",
    },
  ];

  if (!isNaN(lyapunov)) {
    metrics.push({
      label: "Lyapunov",
      value: lyapunov.toFixed(4),
      color:
        lyapunov > 0 ? "var(--accent-chaos)" : "var(--accent-stability)",
    });
  }

  if (!isNaN(energy)) {
    metrics.push({
      label: "Energy",
      value: energy.toFixed(4),
      color: "var(--accent-energy)",
    });
  }

  return (
    <GlassPanel title="Metrics" className="w-[200px]">
      <div className="px-4 pb-3 space-y-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between">
            <span className="label">{m.label}</span>
            <span className="value-mono text-2xs" style={{ color: m.color }}>
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
