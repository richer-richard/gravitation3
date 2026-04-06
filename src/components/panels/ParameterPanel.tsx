import { useSimulationStore } from "@/store/simulation-store";
import { GlassPanel } from "./GlassPanel";
import { ParamSlider } from "@/components/controls/ParamSlider";
import { CATEGORY_COLORS } from "@/types/simulation";

export function ParameterPanel() {
  const paramSchema = useSimulationStore((s) => s.paramSchema);
  const params = useSimulationStore((s) => s.params);
  const setParam = useSimulationStore((s) => s.setParam);
  const category = useSimulationStore((s) => s.category);
  const activeModelId = useSimulationStore((s) => s.activeModelId);

  if (!activeModelId || paramSchema.length === 0) return null;

  const accent = category ? CATEGORY_COLORS[category] : "var(--accent-phase)";

  return (
    <GlassPanel
      title="Parameters"
      active
      className="w-[280px]"
    >
      <div className="py-1 pb-3">
        {paramSchema.map((p) => (
          <ParamSlider
            key={p.name}
            name={p.name}
            label={p.label}
            value={params[p.name] ?? p.default}
            min={p.min}
            max={p.max}
            step={p.step}
            accent={accent}
            onChange={setParam}
          />
        ))}
      </div>
    </GlassPanel>
  );
}
