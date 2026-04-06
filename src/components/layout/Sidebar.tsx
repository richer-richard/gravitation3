import { motion, AnimatePresence } from "framer-motion";
import { useSimulationStore } from "@/store/simulation-store";
import {
  ModelCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/types/simulation";
import { useState } from "react";
import {
  Atom,
  Grid3X3,
  Orbit,
  Waves,
  FlaskConical,
  ChevronRight,
} from "lucide-react";

const CATEGORY_ICONS: Record<ModelCategory, typeof Atom> = {
  attractors: Atom,
  discrete: Grid3X3,
  multibody: Orbit,
  cfd: Waves,
  chembio: FlaskConical,
};

const CATEGORIES: ModelCategory[] = [
  "attractors",
  "discrete",
  "multibody",
  "cfd",
  "chembio",
];

export function Sidebar() {
  const models = useSimulationStore((s) => s.models);
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  const selectModel = useSimulationStore((s) => s.selectModel);
  const [expandedCat, setExpandedCat] = useState<ModelCategory | null>(
    "attractors"
  );

  return (
    <div className="w-[240px] h-full glass-panel rounded-none border-l-0 border-t-0 border-b-0 flex flex-col no-select overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="text-sm font-medium tracking-tight text-text-primary">
          Models
        </div>
        <div className="label mt-0.5">{models.length} simulations</div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const catModels = models.filter((m) => m.category === cat);
          const isExpanded = expandedCat === cat;
          const color = CATEGORY_COLORS[cat];

          return (
            <div key={cat}>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-surface-hover transition-colors duration-150"
                onClick={() =>
                  setExpandedCat(isExpanded ? null : cat)
                }
              >
                <Icon size={14} style={{ color }} />
                <span className="text-xs font-medium text-text-secondary flex-1 text-left">
                  {CATEGORY_LABELS[cat]}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <ChevronRight size={12} className="text-text-tertiary" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    {catModels.map((model) => {
                      const isActive = model.id === activeModelId;
                      return (
                        <button
                          key={model.id}
                          className={`w-full text-left px-4 py-1.5 pl-9 text-xs transition-colors duration-150 ${
                            isActive
                              ? "text-text-primary bg-surface-active"
                              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                          }`}
                          onClick={() => selectModel(model.id)}
                        >
                          <span className="flex items-center gap-2">
                            {isActive && (
                              <div
                                className="w-1 h-1 rounded-full"
                                style={{ background: color }}
                              />
                            )}
                            {model.name}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
