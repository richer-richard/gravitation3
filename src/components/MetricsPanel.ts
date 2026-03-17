/**
 * MetricsPanel — rich live dashboard with grouped metrics, sparkline charts,
 * colour-coded thresholds, and simulation-specific data.
 */

import type { SimulationType } from "../simulations/types";

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

function renderSparkline(
  values: number[],
  width = 100,
  height = 28,
  color = "#38bdf8"
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const pad = 2;

  const points = values
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (pad + (height - 2 * pad) - ((v - min) / range) * (height - 2 * pad)).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  // Gradient fill
  const lastX = ((values.length - 1) * step).toFixed(1);
  const gradientId = `sg-${Math.random().toString(36).slice(2, 8)}`;
  const fillPoints = `0,${height} ${points} ${lastX},${height}`;

  return `<svg width="${width}" height="${height}" class="metrics-sparkline">
    <defs>
      <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="${fillPoints}" fill="url(#${gradientId})" />
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
  </svg>`;
}

function thresholdColor(value: number, low: number, high: number): string {
  if (value <= low) return "#10b981"; // green
  if (value <= high) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

interface MetricEntry {
  key: string;
  label: string;
  value: string;
  numericValue?: number;
  color?: string;
  section: string;
}

export class MetricsPanel {
  private container: HTMLElement;
  private simType: SimulationType;
  private metricsEl!: HTMLElement;
  private history = new MetricsHistory();

  constructor(container: HTMLElement, simType?: SimulationType) {
    this.container = container;
    this.simType = simType || "three-body";
  }

  setSimType(type: SimulationType): void {
    this.simType = type;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="metrics-dashboard">
        <div class="metrics-content"></div>
      </div>
    `;
    this.metricsEl = this.container.querySelector(".metrics-content")!;
  }

  updateFromState(state: unknown): void {
    if (!state || typeof state !== "object") return;
    const s = state as Record<string, unknown>;
    const entries: MetricEntry[] = [];

    // === Conserved Quantities ===
    if ("energy" in s && typeof s.energy === "number") {
      this.history.push("energy", s.energy);
      entries.push({
        key: "energy",
        label: "Total Energy",
        value: s.energy.toFixed(6),
        numericValue: s.energy,
        section: "Conserved Quantities",
      });
    }

    if ("energy_drift_pct" in s && typeof s.energy_drift_pct === "number") {
      this.history.push("energy_drift_pct", s.energy_drift_pct);
      const color = thresholdColor(s.energy_drift_pct, 0.1, 1.0);
      entries.push({
        key: "energy_drift_pct",
        label: "Energy Drift",
        value: `${s.energy_drift_pct.toFixed(4)}%`,
        numericValue: s.energy_drift_pct,
        color,
        section: "Conserved Quantities",
      });
    }

    if ("momentum" in s && Array.isArray(s.momentum)) {
      const m = s.momentum as number[];
      const mag = Math.sqrt(m[0] * m[0] + m[1] * m[1] + (m[2] ?? 0) * (m[2] ?? 0));
      this.history.push("momentum", mag);
      entries.push({
        key: "momentum",
        label: "Momentum |p|",
        value: mag.toFixed(6),
        numericValue: mag,
        section: "Conserved Quantities",
      });
    }

    // === Dynamics ===
    if ("time" in s && typeof s.time === "number") {
      this.history.push("time", s.time);
      entries.push({
        key: "time",
        label: "Simulation Time",
        value: s.time.toFixed(3) + "s",
        numericValue: s.time,
        section: "Dynamics",
      });
    }

    if ("steps" in s && typeof s.steps === "number") {
      entries.push({
        key: "steps",
        label: "Integration Steps",
        value: s.steps.toLocaleString(),
        section: "Dynamics",
      });
    }

    if ("entropy" in s && typeof s.entropy === "number") {
      this.history.push("entropy", s.entropy);
      entries.push({
        key: "entropy",
        label: "Entropy",
        value: s.entropy.toFixed(4),
        numericValue: s.entropy,
        section: "Dynamics",
      });
    }

    if ("lyapunov_exponent" in s && typeof s.lyapunov_exponent === "number") {
      this.history.push("lyapunov", s.lyapunov_exponent);
      const color = s.lyapunov_exponent > 0 ? "#ef4444" : "#10b981";
      entries.push({
        key: "lyapunov",
        label: "Lyapunov Exponent",
        value: s.lyapunov_exponent.toFixed(4),
        numericValue: s.lyapunov_exponent,
        color,
        section: "Dynamics",
      });
    }

    if ("omega" in s && typeof s.omega === "number") {
      this.history.push("omega", s.omega);
      entries.push({
        key: "omega",
        label: "Angular Velocity",
        value: s.omega.toFixed(4) + " rad/s",
        numericValue: s.omega,
        section: "Dynamics",
      });
    }

    if ("min_distance" in s && typeof s.min_distance === "number") {
      this.history.push("min_distance", s.min_distance);
      const color = thresholdColor(1 / Math.max(s.min_distance, 0.001), 2, 10);
      entries.push({
        key: "min_distance",
        label: "Min Distance",
        value: s.min_distance.toFixed(4),
        numericValue: s.min_distance,
        color,
        section: "Dynamics",
      });
    }

    // === System ===
    if ("bodies" in s && Array.isArray(s.bodies)) {
      entries.push({
        key: "bodies",
        label: "Active Bodies",
        value: String(s.bodies.length),
        section: "System",
      });
    }

    if ("trajectories" in s && Array.isArray(s.trajectories)) {
      entries.push({
        key: "trajectories",
        label: "Trajectories",
        value: String(s.trajectories.length),
        section: "System",
      });
    }

    if ("particles" in s && Array.isArray(s.particles)) {
      entries.push({
        key: "particles",
        label: "Active Particles",
        value: String(s.particles.length),
        section: "System",
      });
    }

    if ("pendulums" in s && Array.isArray(s.pendulums)) {
      entries.push({
        key: "pendulums",
        label: "Pendulums",
        value: String(s.pendulums.length),
        section: "System",
      });
    }

    if ("bucket_masses" in s && Array.isArray(s.bucket_masses)) {
      const total = (s.bucket_masses as number[]).reduce((a, b) => a + b, 0);
      this.history.push("total_water", total);
      entries.push({
        key: "total_water",
        label: "Total Water Mass",
        value: total.toFixed(3),
        numericValue: total,
        section: "System",
      });
    }

    // Sim-specific extras
    if (this.simType === "lid-driven-cavity") {
      if ("divergence_norm" in s && typeof s.divergence_norm === "number") {
        this.history.push("divergence", s.divergence_norm);
        entries.push({
          key: "divergence",
          label: "Divergence Norm",
          value: s.divergence_norm.toExponential(2),
          numericValue: s.divergence_norm,
          section: "Dynamics",
        });
      }
      if ("circulation" in s && typeof s.circulation === "number") {
        this.history.push("circulation", s.circulation);
        entries.push({
          key: "circulation",
          label: "Circulation",
          value: s.circulation.toFixed(3),
          numericValue: s.circulation,
          section: "Dynamics",
        });
      }
    }

    if (this.simType === "double-gyre") {
      if ("epsilon" in s && typeof s.epsilon === "number") {
        entries.push({
          key: "epsilon",
          label: "Perturbation ε",
          value: s.epsilon.toFixed(3),
          section: "Dynamics",
        });
      }
    }

    if (this.simType === "malkus-waterwheel") {
      if ("theta" in s && typeof s.theta === "number") {
        this.history.push("theta", s.theta);
        entries.push({
          key: "theta",
          label: "Wheel Angle θ",
          value: s.theta.toFixed(3) + " rad",
          numericValue: s.theta,
          section: "Dynamics",
        });
      }
    }

    this.updateDisplay(entries);
  }

  private updateDisplay(entries: MetricEntry[]): void {
    if (!this.metricsEl) return;

    // Group by section
    const sections = new Map<string, MetricEntry[]>();
    for (const entry of entries) {
      const arr = sections.get(entry.section) || [];
      arr.push(entry);
      sections.set(entry.section, arr);
    }

    const sectionOrder = ["Conserved Quantities", "Dynamics", "System"];
    const sectionIcons: Record<string, string> = {
      "Conserved Quantities": "⚡",
      Dynamics: "◉",
      System: "⬡",
    };

    let html = "";
    for (const sectionName of sectionOrder) {
      const sectionEntries = sections.get(sectionName);
      if (!sectionEntries || sectionEntries.length === 0) continue;

      html += `
        <div class="metrics-section">
          <div class="metrics-section-header">
            <span class="metrics-section-icon">${sectionIcons[sectionName] || "●"}</span>
            <span class="metrics-section-title">${sectionName}</span>
          </div>
          <div class="metrics-grid">
      `;

      for (const entry of sectionEntries) {
        const historyValues = this.history.get(entry.key);
        const hasSparkline = entry.numericValue !== undefined && historyValues.length > 2;
        const color = entry.color || "#38bdf8";
        const valueStyle = entry.color ? `style="color: ${entry.color}"` : "";

        html += `
          <div class="metrics-card ${hasSparkline ? "has-sparkline" : ""}">
            <div class="metrics-card-header">
              <span class="metrics-card-label">${entry.label}</span>
              <span class="metrics-card-value" ${valueStyle}>${entry.value}</span>
            </div>
            ${hasSparkline ? `<div class="metrics-card-chart">${renderSparkline(historyValues, 140, 32, color)}</div>` : ""}
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    if (html === "") {
      html = `
        <div class="metrics-empty">
          <span class="metrics-empty-icon">◎</span>
          <p>Waiting for simulation data…</p>
          <p class="metrics-empty-hint">Press <strong>Run</strong> to begin</p>
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
