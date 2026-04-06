import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { useSimulationLoop } from "@/hooks/useSimulationLoop";
import { Viewport } from "@/components/viewport/Viewport";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomBar } from "@/components/layout/BottomBar";
import { ParameterPanel } from "@/components/panels/ParameterPanel";
import { MetricsPanel } from "@/components/panels/MetricsPanel";

export default function App() {
  const loadModels = useSimulationStore((s) => s.loadModels);
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  const toggleRunning = useSimulationStore((s) => s.toggleRunning);
  const reset = useSimulationStore((s) => s.reset);

  useSimulationLoop();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          toggleRunning();
          break;
        case "KeyR":
          reset();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleRunning, reset]);

  return (
    <div className="w-full h-full flex flex-col">
      <TopBar />
      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar />
        {/* Fullscreen viewport */}
        <div className="flex-1 relative">
          <Viewport />

          {/* Floating panels */}
          {activeModelId && (
            <>
              <div className="absolute top-3 right-3 z-10">
                <ParameterPanel />
              </div>
              <div className="absolute bottom-3 right-3 z-10">
                <MetricsPanel />
              </div>
            </>
          )}

          {/* Empty state */}
          {!activeModelId && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-text-tertiary text-sm mb-1">
                  Select a simulation
                </div>
                <div className="text-text-tertiary/40 text-2xs font-mono">
                  20 models across 5 categories
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
