import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulation-store";

export function useSimulationLoop() {
  const running = useSimulationStore((s) => s.running);
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  const fetchFrame = useSimulationStore((s) => s.fetchFrame);
  const updateFps = useSimulationStore((s) => s.updateFps);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(performance.now());
  const fpsFrames = useRef(0);
  const fpsLastUpdate = useRef(performance.now());

  useEffect(() => {
    if (!running || !activeModelId) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      try {
        await fetchFrame();
      } catch (err) {
        console.error("[SimulationLoop] fetchFrame error:", err);
      }

      if (cancelled) return;

      // FPS calculation (update every 500ms)
      fpsFrames.current++;
      const now = performance.now();
      if (now - fpsLastUpdate.current >= 500) {
        const elapsed = now - fpsLastUpdate.current;
        const fps = (fpsFrames.current / elapsed) * 1000;
        updateFps(Math.round(fps));
        fpsFrames.current = 0;
        fpsLastUpdate.current = now;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    // Kick off the loop immediately (don't wait for the first rAF delay)
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [running, activeModelId, fetchFrame, updateFps]);
}
