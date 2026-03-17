import type { SimulationType } from "../simulations/types";
import type { SimulationManager } from "../simulations/SimulationManager";
import { showToast } from "./Toast";

interface BodyState {
  name: string;
  mass: number;
  position: [number, number, number];
  velocity: [number, number, number];
}

interface PendulumState {
  state: [number, number, number, number];
}

interface GyreParticle {
  x: number;
  y: number;
}

interface CavityParticle {
  x: number;
  y: number;
  age: number;
}

const BODY_COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15", "#f87171", "#818cf8"];

export class SystemControlPanel {
  private container: HTMLElement;
  private simType: SimulationType;
  private manager: SimulationManager;
  private state: Record<string, unknown> | null = null;

  constructor(container: HTMLElement, simType: SimulationType, manager: SimulationManager) {
    this.container = container;
    this.simType = simType;
    this.manager = manager;
  }

  render(): void {
    this.renderContent();
  }

  updateState(state: unknown): void {
    this.state = (state as Record<string, unknown>) ?? null;
    this.renderContent();
  }

  private renderContent(): void {
    this.container.innerHTML = `
      <div class="studio-panel-stack">
        ${this.renderSummary()}
        ${this.renderControls()}
        ${this.renderTelemetry()}
      </div>
    `;
    this.bindEvents();
  }

  private renderSummary(): string {
    const state = this.state ?? {};

    if (!this.state) {
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Engine Snapshot</h3>
            </div>
          </div>
          <div class="system-empty-state">
            <span class="system-empty-icon">◎</span>
            <p class="studio-section-copy">Waiting for the Rust engine to publish the first state frame.</p>
          </div>
        </section>
      `;
    }

    if (this.simType === "three-body") {
      const bodies = (state.bodies as BodyState[] | undefined) ?? [];
      const meanSpeed = bodies.length === 0
        ? 0
        : bodies.reduce((sum, body) => {
            const [vx, vy, vz] = body.velocity;
            return sum + Math.sqrt(vx * vx + vy * vy + vz * vz);
          }, 0) / bodies.length;
      const totalMass = bodies.reduce((sum, b) => sum + b.mass, 0);

      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Orbital Assembly</h3>
            </div>
            <span class="studio-entity-pill">${bodies.length} bodies</span>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Bodies</span>
              <strong>${bodies.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Mean speed</span>
              <strong>${meanSpeed.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Total mass</span>
              <strong>${totalMass.toFixed(2)}</strong>
            </div>
          </div>
        </section>
      `;
    }

    if (this.simType === "double-pendulum") {
      const pendulums = (state.pendulums as PendulumState[] | undefined) ?? [];
      const spread = pendulums.length === 0
        ? 0
        : pendulums.reduce((sum, pendulum) => sum + Math.abs(pendulum.state[0] - pendulum.state[2]), 0) / pendulums.length;
      const maxOmega = pendulums.length === 0
        ? 0
        : Math.max(...pendulums.map(p => Math.max(Math.abs(p.state[1]), Math.abs(p.state[3]))));

      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Pendulum Bank</h3>
            </div>
            <span class="studio-entity-pill">${pendulums.length} linked</span>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Pendulums</span>
              <strong>${pendulums.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Angle spread</span>
              <strong>${spread.toFixed(3)} rad</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Max ω</span>
              <strong>${maxOmega.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Chaos</span>
              <strong class="${spread > 0.5 ? "text-red" : spread > 0.1 ? "text-amber" : "text-green"}">${spread > 0.5 ? "High" : spread > 0.1 ? "Medium" : "Low"}</strong>
            </div>
          </div>
        </section>
      `;
    }

    if (this.simType === "lorenz" || this.simType === "rossler") {
      const trajectories = (state.trajectories as Array<{ state: [number, number, number] }> | undefined) ?? [];
      const lyapunov = typeof state.lyapunov_exponent === "number" ? state.lyapunov_exponent : 0;
      const energy = typeof state.energy === "number" ? state.energy : 0;
      const label = this.simType === "lorenz" ? "Lorenz" : "Rössler";
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">${label} Attractor Lab</h3>
            </div>
            <span class="studio-entity-pill">${trajectories.length} traj</span>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Trajectories</span>
              <strong>${trajectories.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Lyapunov λ</span>
              <strong class="${lyapunov > 0 ? "text-red" : "text-green"}">${lyapunov.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Energy</span>
              <strong>${energy.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Regime</span>
              <strong>${lyapunov > 0 ? "Chaotic" : "Stable"}</strong>
            </div>
          </div>
        </section>
      `;
    }

    if (this.simType === "lid-driven-cavity") {
      const particles = (state.particles as CavityParticle[] | undefined) ?? [];
      const divergence = typeof state.divergence_norm === "number" ? state.divergence_norm : 0;
      const reynolds = typeof state.reynolds === "number" ? state.reynolds : 0;
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">CFD Studio</h3>
            </div>
            <span class="studio-entity-pill">Re ${reynolds.toFixed(0)}</span>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Tracers</span>
              <strong>${particles.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Divergence</span>
              <strong>${divergence.toExponential(2)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Reynolds</span>
              <strong>${reynolds.toFixed(0)}</strong>
            </div>
          </div>
        </section>
      `;
    }

    if (this.simType === "double-gyre") {
      const particles = (state.particles as GyreParticle[] | undefined) ?? [];
      const flowField = Array.isArray(state.flow_field) ? state.flow_field.length : 0;
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Particle Seeding</h3>
            </div>
            <span class="studio-entity-pill">${particles.length} pts</span>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Particles</span>
              <strong>${particles.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Flow samples</span>
              <strong>${flowField}</strong>
            </div>
          </div>
        </section>
      `;
    }

    if (this.simType === "malkus-waterwheel") {
      const bucketMasses = (state.bucket_masses as number[] | undefined) ?? [];
      const omega = typeof state.omega === "number" ? state.omega : 0;
      const theta = typeof state.theta === "number" ? state.theta : 0;
      const totalWater = bucketMasses.reduce((a, b) => a + b, 0);
      const direction = omega > 0.01 ? "CW ↻" : omega < -0.01 ? "CCW ↺" : "Stalled";
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Wheel Dynamics</h3>
            </div>
            <span class="studio-entity-pill">${direction}</span>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Buckets</span>
              <strong>${bucketMasses.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">ω</span>
              <strong>${omega.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">θ</span>
              <strong>${theta.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Water mass</span>
              <strong>${totalWater.toFixed(2)}</strong>
            </div>
          </div>
        </section>
      `;
    }

    return "";
  }

  private renderControls(): string {
    const state = this.state ?? {};

    switch (this.simType) {
      case "three-body": {
        const bodies = (state.bodies as BodyState[] | undefined) ?? [];
        return `
          <section class="studio-section">
            <div class="system-action-bar">
              <button class="system-action-button system-action-primary" data-action="add-body">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2v12M2 8h12"/></svg>
                Add Star
              </button>
              <button class="system-action-button" data-action="remove-last-body" ${bodies.length <= 2 ? "disabled" : ""}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8h12"/></svg>
                Remove Last
              </button>
            </div>
            <div class="studio-entity-list">
              ${bodies.map((body, index) => {
                const [vx, vy, vz] = body.velocity;
                const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
                const color = BODY_COLORS[index % BODY_COLORS.length];
                const [px, py] = body.position;
                return `
                  <article class="studio-entity-card" style="--entity-color: ${color}">
                    <div class="studio-entity-head">
                      <div class="entity-identity">
                        <span class="entity-color-dot" style="background: ${color}"></span>
                        <div>
                          <h4>${body.name}</h4>
                          <p class="entity-subtitle">Speed ${speed.toFixed(3)} · Pos (${px.toFixed(1)}, ${py.toFixed(1)})</p>
                        </div>
                      </div>
                      <button class="studio-icon-button entity-remove-btn" data-action="remove-body" data-index="${index}" ${bodies.length <= 2 ? "disabled" : ""} title="Remove">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                      </button>
                    </div>
                    <div class="entity-slider-row">
                      <label>Mass</label>
                      <input type="range" min="0.1" max="20" step="0.1" value="${body.mass.toFixed(2)}" data-role="body-mass-range" data-index="${index}" />
                      <input type="number" min="0.1" max="20" step="0.1" value="${body.mass.toFixed(2)}" data-role="body-mass-number" data-index="${index}" />
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          </section>
        `;
      }
      case "double-pendulum": {
        const pendulums = (state.pendulums as PendulumState[] | undefined) ?? [];
        return `
          <section class="studio-section">
            <div class="system-action-bar">
              <button class="system-action-button system-action-primary" data-action="add-pendulum">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2v12M2 8h12"/></svg>
                Add Pendulum
              </button>
              <button class="system-action-button" data-action="remove-last-pendulum" ${pendulums.length <= 1 ? "disabled" : ""}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8h12"/></svg>
                Remove Last
              </button>
            </div>
            <div class="studio-entity-list">
              ${pendulums.map((pendulum, index) => {
                const color = BODY_COLORS[index % BODY_COLORS.length];
                const omega1 = Math.abs(pendulum.state[1]);
                const omega2 = Math.abs(pendulum.state[3]);
                const energy = 0.5 * (omega1 * omega1 + omega2 * omega2);
                const energyPct = Math.min(energy / 10, 1) * 100;
                return `
                <article class="studio-entity-card" style="--entity-color: ${color}">
                  <div class="studio-entity-head">
                    <div class="entity-identity">
                      <span class="entity-color-dot" style="background: ${color}"></span>
                      <div>
                        <h4>Pendulum ${index + 1}</h4>
                        <p class="entity-subtitle">θ₁ ${pendulum.state[0].toFixed(3)} rad</p>
                      </div>
                    </div>
                    <span class="studio-entity-pill">ω ${omega1.toFixed(1)}</span>
                  </div>
                  <div class="entity-energy-bar">
                    <div class="entity-energy-fill" style="width: ${energyPct}%; background: ${color}"></div>
                  </div>
                  <div class="studio-dual-meta">
                    <span>θ₂ ${pendulum.state[2].toFixed(3)}</span>
                    <span>ω₂ ${pendulum.state[3].toFixed(3)}</span>
                  </div>
                </article>
              `;}).join("")}
            </div>
          </section>
        `;
      }
      case "lorenz":
      case "rossler": {
        const trajectories = (state.trajectories as Array<{ state: [number, number, number] }> | undefined) ?? [];
        const label = this.simType === "lorenz" ? "Trajectory" : "Trajectory";
        return `
          <section class="studio-section">
            <div class="system-action-bar">
              <button class="system-action-button system-action-primary" data-action="add-trajectory">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2v12M2 8h12"/></svg>
                Add ${label}
              </button>
              <button class="system-action-button" data-action="remove-last-trajectory" ${trajectories.length <= 1 ? "disabled" : ""}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8h12"/></svg>
                Remove Last
              </button>
            </div>
            <div class="studio-entity-list">
              ${trajectories.map((traj, index) => {
                const color = BODY_COLORS[index % BODY_COLORS.length];
                const [x, y, z] = traj.state;
                return `
                <article class="studio-entity-card" style="--entity-color: ${color}">
                  <div class="studio-entity-head">
                    <div class="entity-identity">
                      <span class="entity-color-dot" style="background: ${color}"></span>
                      <div>
                        <h4>${label} ${index + 1}</h4>
                        <p class="entity-subtitle">(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})</p>
                      </div>
                    </div>
                  </div>
                </article>
              `;}).join("")}
            </div>
          </section>
        `;
      }
      case "double-gyre":
        return `
          <section class="studio-section">
            <div class="studio-section-heading">
              <div>
                <p class="studio-kicker">Controls</p>
                <h3 class="studio-section-title">Particle Seeding</h3>
              </div>
            </div>
            <div class="system-action-grid">
              <button class="system-action-card" data-action="seed-gyre" data-count="200">
                <strong>200</strong>
                <span>Sparse</span>
              </button>
              <button class="system-action-card" data-action="seed-gyre" data-count="600">
                <strong>600</strong>
                <span>Medium</span>
              </button>
              <button class="system-action-card" data-action="seed-gyre" data-count="1200">
                <strong>1200</strong>
                <span>Dense</span>
              </button>
            </div>
            <div class="system-action-bar" style="margin-top: 0.5rem">
              <button class="system-action-button" data-action="toggle-field">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8c2-4 4 4 6 0s4 4 6 0"/></svg>
                Toggle Flow Field
              </button>
            </div>
          </section>
        `;
      case "lid-driven-cavity": {
        const reynolds = typeof state.reynolds === "number" ? state.reynolds : 400;
        return `
          <section class="studio-section">
            <div class="studio-section-heading">
              <div>
                <p class="studio-kicker">Controls</p>
                <h3 class="studio-section-title">Tracer & Reynolds</h3>
              </div>
            </div>
            <div class="system-action-grid">
              <button class="system-action-card" data-action="seed-cavity" data-count="320">
                <strong>320</strong>
                <span>Sparse</span>
              </button>
              <button class="system-action-card" data-action="seed-cavity" data-count="640">
                <strong>640</strong>
                <span>Medium</span>
              </button>
              <button class="system-action-card" data-action="seed-cavity" data-count="960">
                <strong>960</strong>
                <span>Dense</span>
              </button>
            </div>
            <div class="system-re-presets">
              <span class="system-re-label">Quick Re:</span>
              ${[100, 400, 1000, 2500].map(re => `
                <button class="system-re-button ${Math.abs(reynolds - re) < 5 ? "is-active" : ""}" data-action="set-reynolds" data-value="${re}">${re}</button>
              `).join("")}
            </div>
          </section>
        `;
      }
      case "malkus-waterwheel":
        return `
          <section class="studio-section">
            <div class="studio-section-heading">
              <div>
                <p class="studio-kicker">Controls</p>
                <h3 class="studio-section-title">Wheel Controls</h3>
              </div>
            </div>
            <div class="system-action-bar">
              <button class="system-action-button" data-action="clear-trails">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l12 12M14 2L2 14"/></svg>
                Clear Trails
              </button>
            </div>
          </section>
        `;
      default:
        return "";
    }
  }

  private renderTelemetry(): string {
    const state = this.state ?? {};

    const time =
      typeof state.time === "number" ? state.time.toFixed(2) : "—";
    const steps =
      typeof state.steps === "number" ? String(state.steps) : "—";
    const energy =
      typeof state.energy === "number" ? state.energy.toFixed(4) : "—";
    const entropy =
      typeof state.entropy === "number" ? state.entropy.toFixed(4) : "—";

    return `
      <section class="studio-section">
        <div class="studio-section-heading">
          <div>
            <p class="studio-kicker">Telemetry</p>
            <h3 class="studio-section-title">State Monitor</h3>
          </div>
        </div>
        <div class="studio-telemetry-list">
          <div class="studio-telemetry-row"><span>Time</span><strong>${time}</strong></div>
          <div class="studio-telemetry-row"><span>Steps</span><strong>${steps}</strong></div>
          <div class="studio-telemetry-row"><span>Energy</span><strong>${energy}</strong></div>
          <div class="studio-telemetry-row"><span>Entropy</span><strong>${entropy}</strong></div>
        </div>
      </section>
    `;
  }

  private bindEvents(): void {
    this.container.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
      element.addEventListener("click", async () => {
        const action = element.dataset.action;
        try {
          switch (action) {
            case "add-body":
              await this.manager.addBody();
              break;
            case "remove-last-body": {
              const bodies = ((this.state?.bodies as BodyState[] | undefined) ?? []);
              if (bodies.length > 2) {
                await this.manager.removeBody(bodies.length - 1);
              }
              break;
            }
            case "remove-body":
              if (element.dataset.index) {
                await this.manager.removeBody(Number(element.dataset.index));
              }
              break;
            case "add-pendulum": {
              const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.08;
              await this.manager.addPendulum(angle, 0, angle - 0.015, 0);
              break;
            }
            case "remove-last-pendulum": {
              const pendulums = ((this.state?.pendulums as PendulumState[] | undefined) ?? []);
              if (pendulums.length > 1) {
                await this.manager.removePendulum(pendulums.length - 1);
              }
              break;
            }
            case "add-trajectory": {
              // Add trajectory with slight perturbation
              const vis = this.manager.getVisualizer() as Record<string, unknown> | null;
              if (vis && typeof vis.addTrajectory === "function") {
                vis.addTrajectory();
              }
              break;
            }
            case "remove-last-trajectory": {
              const vis = this.manager.getVisualizer() as Record<string, unknown> | null;
              if (vis && typeof vis.removeLastTrajectory === "function") {
                vis.removeLastTrajectory();
              }
              break;
            }
            case "seed-gyre":
            case "seed-cavity":
              if (element.dataset.count) {
                await this.manager.seedParticles(Number(element.dataset.count));
              }
              break;
            case "set-reynolds":
              if (element.dataset.value) {
                await this.manager.setParameter("reynolds", Number(element.dataset.value));
              }
              break;
            case "toggle-field": {
              const vis = this.manager.getVisualizer() as Record<string, unknown> | null;
              if (vis && typeof vis.setShowFlowField === "function") {
                const current = (vis as { showFlowField?: boolean }).showFlowField !== false;
                (vis as { setShowFlowField: (v: boolean) => void }).setShowFlowField(!current);
              }
              break;
            }
            case "clear-trails": {
              const vis = this.manager.getVisualizer() as Record<string, unknown> | null;
              if (vis && typeof vis.clearTrails === "function") {
                (vis as { clearTrails: () => void }).clearTrails();
              }
              break;
            }
          }
        } catch (error) {
          showToast(error instanceof Error ? error.message : String(error), "error");
        }
      });
    });

    this.container.querySelectorAll<HTMLInputElement>('[data-role="body-mass-range"]').forEach((input) => {
      input.addEventListener("input", () => {
        const index = input.dataset.index;
        const numeric = this.container.querySelector<HTMLInputElement>(`[data-role="body-mass-number"][data-index="${index}"]`);
        if (numeric) numeric.value = input.value;
      });
      input.addEventListener("change", () => this.applyBodyMass(input));
    });

    this.container.querySelectorAll<HTMLInputElement>('[data-role="body-mass-number"]').forEach((input) => {
      input.addEventListener("change", () => {
        const index = input.dataset.index;
        const slider = this.container.querySelector<HTMLInputElement>(`[data-role="body-mass-range"][data-index="${index}"]`);
        if (slider) slider.value = input.value;
        this.applyBodyMass(input);
      });
    });
  }

  private applyBodyMass(input: HTMLInputElement): void {
    const index = input.dataset.index;
    const value = Number(input.value);
    if (!Number.isFinite(value) || index == null) return;

    this.manager
      .setParameter(`body_mass_${index}`, value)
      .catch((error) => showToast(error instanceof Error ? error.message : String(error), "error"));
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
