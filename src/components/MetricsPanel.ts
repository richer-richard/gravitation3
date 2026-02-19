/**
 * MetricsPanel — displays real-time simulation metrics.
 */

export class MetricsPanel {
  private container: HTMLElement;
  private metrics: Map<string, { label: string; value: string }> = new Map();
  private metricsEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="p-2 space-y-2">
        <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Metrics</h3>
        <div class="metrics-grid space-y-1 font-mono text-xs"></div>
      </div>
    `;
    this.metricsEl = this.container.querySelector(".metrics-grid")!;
  }

  updateFromState(state: unknown): void {
    if (!state || typeof state !== "object") return;
    const s = state as Record<string, unknown>;

    this.metrics.clear();

    if ("time" in s) {
      this.metrics.set("time", {
        label: "Time",
        value: (s.time as number).toFixed(3),
      });
    }

    if ("energy" in s) {
      this.metrics.set("energy", {
        label: "Energy",
        value: (s.energy as number).toFixed(6),
      });
    }

    if ("entropy" in s) {
      this.metrics.set("entropy", {
        label: "Entropy",
        value: (s.entropy as number).toFixed(4),
      });
    }

    if ("momentum" in s && Array.isArray(s.momentum)) {
      const m = s.momentum as number[];
      const mag = Math.sqrt(m[0] * m[0] + m[1] * m[1] + (m[2] ?? 0) * (m[2] ?? 0));
      this.metrics.set("momentum", {
        label: "Momentum",
        value: mag.toFixed(6),
      });
    }

    if ("omega" in s && typeof s.omega === "number") {
      this.metrics.set("omega", {
        label: "Angular Vel.",
        value: (s.omega as number).toFixed(4),
      });
    }

    if ("bodies" in s && Array.isArray(s.bodies)) {
      this.metrics.set("bodies", {
        label: "Bodies",
        value: String((s.bodies as unknown[]).length),
      });
    }

    if ("trajectories" in s && Array.isArray(s.trajectories)) {
      this.metrics.set("trajectories", {
        label: "Trajectories",
        value: String((s.trajectories as unknown[]).length),
      });
    }

    if ("particles" in s && Array.isArray(s.particles)) {
      this.metrics.set("particles", {
        label: "Particles",
        value: String((s.particles as unknown[]).length),
      });
    }

    if ("pendulums" in s && Array.isArray(s.pendulums)) {
      this.metrics.set("pendulums", {
        label: "Pendulums",
        value: String((s.pendulums as unknown[]).length),
      });
    }

    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.metricsEl) return;

    let html = "";
    for (const [, { label, value }] of this.metrics) {
      html += `
        <div class="flex justify-between items-center py-0.5">
          <span class="text-zinc-500">${label}</span>
          <span class="text-zinc-300 tabular-nums">${value}</span>
        </div>
      `;
    }
    this.metricsEl.innerHTML = html;
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
