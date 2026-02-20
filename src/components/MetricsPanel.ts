/**
 * MetricsPanel — displays real-time simulation metrics with inline sparkline charts.
 */

const HISTORY_SIZE = 200;

class MetricsHistory {
  private data = new Map<string, number[]>();

  push(key: string, value: number): void {
    let arr = this.data.get(key);
    if (!arr) {
      arr = [];
      this.data.set(key, arr);
    }
    arr.push(value);
    if (arr.length > HISTORY_SIZE) arr.shift();
  }

  get(key: string): number[] {
    return this.data.get(key) || [];
  }

  clear(): void {
    this.data.clear();
  }
}

function renderSparkline(values: number[], width = 80, height = 20, color = "#3b82f6"): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - ((v - min) / range) * height).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  return `<svg width="${width}" height="${height}" class="inline-block ml-2 opacity-70">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" />
  </svg>`;
}

function driftColor(drift: number): string {
  if (drift < 0.1) return "#10b981"; // green
  if (drift < 1.0) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

export class MetricsPanel {
  private container: HTMLElement;
  private metrics: Map<string, { label: string; value: string; numericValue?: number }> = new Map();
  private metricsEl!: HTMLElement;
  private history = new MetricsHistory();

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
      const v = s.time as number;
      this.metrics.set("time", { label: "Time", value: v.toFixed(3), numericValue: v });
      this.history.push("time", v);
    }

    if ("energy" in s) {
      const v = s.energy as number;
      this.metrics.set("energy", { label: "Energy", value: v.toFixed(6), numericValue: v });
      this.history.push("energy", v);
    }

    if ("energy_drift_pct" in s) {
      const v = s.energy_drift_pct as number;
      this.metrics.set("energy_drift_pct", { label: "Energy Drift", value: `${v.toFixed(4)}%`, numericValue: v });
      this.history.push("energy_drift_pct", v);
    }

    if ("entropy" in s) {
      const v = s.entropy as number;
      this.metrics.set("entropy", { label: "Entropy", value: v.toFixed(4), numericValue: v });
      this.history.push("entropy", v);
    }

    if ("momentum" in s && Array.isArray(s.momentum)) {
      const m = s.momentum as number[];
      const mag = Math.sqrt(m[0] * m[0] + m[1] * m[1] + (m[2] ?? 0) * (m[2] ?? 0));
      this.metrics.set("momentum", { label: "Momentum", value: mag.toFixed(6), numericValue: mag });
      this.history.push("momentum", mag);
    }

    if ("omega" in s && typeof s.omega === "number") {
      const v = s.omega as number;
      this.metrics.set("omega", { label: "Angular Vel.", value: v.toFixed(4), numericValue: v });
      this.history.push("omega", v);
    }

    if ("bodies" in s && Array.isArray(s.bodies)) {
      this.metrics.set("bodies", { label: "Bodies", value: String((s.bodies as unknown[]).length) });
    }

    if ("trajectories" in s && Array.isArray(s.trajectories)) {
      this.metrics.set("trajectories", { label: "Trajectories", value: String((s.trajectories as unknown[]).length) });
    }

    if ("particles" in s && Array.isArray(s.particles)) {
      this.metrics.set("particles", { label: "Particles", value: String((s.particles as unknown[]).length) });
    }

    if ("pendulums" in s && Array.isArray(s.pendulums)) {
      this.metrics.set("pendulums", { label: "Pendulums", value: String((s.pendulums as unknown[]).length) });
    }

    if ("min_distance" in s) {
      const v = s.min_distance as number;
      this.metrics.set("min_distance", { label: "Min Distance", value: v.toFixed(4), numericValue: v });
      this.history.push("min_distance", v);
    }

    if ("lyapunov_exponent" in s) {
      const v = s.lyapunov_exponent as number;
      this.metrics.set("lyapunov", { label: "Lyapunov Exp.", value: v.toFixed(4), numericValue: v });
      this.history.push("lyapunov", v);
    }

    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.metricsEl) return;

    let html = "";
    for (const [key, { label, value, numericValue }] of this.metrics) {
      const historyValues = this.history.get(key);
      const sparkline = numericValue !== undefined ? renderSparkline(historyValues) : "";

      // Special styling for energy drift
      let valueStyle = "text-zinc-300";
      if (key === "energy_drift_pct" && numericValue !== undefined) {
        const color = driftColor(numericValue);
        valueStyle = `style="color: ${color}"`;
        html += `
          <div class="flex justify-between items-center py-0.5">
            <span class="text-zinc-500">${label}</span>
            <span class="tabular-nums flex items-center" ${valueStyle}>${value}${renderSparkline(historyValues, 80, 20, color)}</span>
          </div>
        `;
        continue;
      }

      html += `
        <div class="flex justify-between items-center py-0.5">
          <span class="text-zinc-500">${label}</span>
          <span class="text-zinc-300 tabular-nums flex items-center">${value}${sparkline}</span>
        </div>
      `;
    }
    this.metricsEl.innerHTML = html;
  }

  destroy(): void {
    this.history.clear();
    this.container.innerHTML = "";
  }
}
