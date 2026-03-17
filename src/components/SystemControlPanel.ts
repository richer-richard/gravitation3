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
          <div class="studio-section-copy">Waiting for the Rust engine to publish the first state frame.</div>
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

      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Orbital Assembly</h3>
            </div>
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
          </div>
        </section>
      `;
    }

    if (this.simType === "double-pendulum") {
      const pendulums = (state.pendulums as PendulumState[] | undefined) ?? [];
      const spread = pendulums.length === 0
        ? 0
        : pendulums.reduce((sum, pendulum) => sum + Math.abs(pendulum.state[0] - pendulum.state[2]), 0) / pendulums.length;

      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Pendulum Bank</h3>
            </div>
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
          </div>
        </section>
      `;
    }

    if (this.simType === "lorenz" || this.simType === "rossler") {
      const trajectories = (state.trajectories as Array<{ state: [number, number, number] }> | undefined) ?? [];
      const lyapunov = typeof state.lyapunov_exponent === "number" ? state.lyapunov_exponent : 0;
      const energy = typeof state.energy === "number" ? state.energy : 0;
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Attractor Lab</h3>
            </div>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Trajectories</span>
              <strong>${trajectories.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Lyapunov</span>
              <strong>${lyapunov.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Energy</span>
              <strong>${energy.toFixed(3)}</strong>
            </div>
          </div>
        </section>
      `;
    }

    if (this.simType === "lid-driven-cavity") {
      const particles = (state.particles as CavityParticle[] | undefined) ?? [];
      const divergence = typeof state.divergence_norm === "number" ? state.divergence_norm : 0;
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">CFD Studio</h3>
            </div>
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
      return `
        <section class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">System</p>
              <h3 class="studio-section-title">Wheel Dynamics</h3>
            </div>
          </div>
          <div class="studio-stat-grid">
            <div class="studio-stat-card">
              <span class="studio-stat-label">Buckets</span>
              <strong>${bucketMasses.length}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Omega</span>
              <strong>${omega.toFixed(3)}</strong>
            </div>
            <div class="studio-stat-card">
              <span class="studio-stat-label">Theta</span>
              <strong>${theta.toFixed(3)}</strong>
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
            <div class="studio-inline-actions">
              <button class="studio-pill-button" data-action="add-body">Add Body</button>
              <button class="studio-pill-button" data-action="remove-last-body" ${bodies.length <= 2 ? "disabled" : ""}>Remove Last</button>
            </div>
            <div class="studio-entity-list">
              ${bodies.map((body, index) => {
                const [vx, vy, vz] = body.velocity;
                const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
                return `
                  <article class="studio-entity-card">
                    <div class="studio-entity-head">
                      <div>
                        <h4>${body.name}</h4>
                        <p>Speed ${speed.toFixed(3)}</p>
                      </div>
                      <button class="studio-icon-button" data-action="remove-body" data-index="${index}" ${bodies.length <= 2 ? "disabled" : ""}>×</button>
                    </div>
                    <div class="studio-inline-slider">
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
            <div class="studio-inline-actions">
              <button class="studio-pill-button" data-action="add-pendulum">Add Pendulum</button>
              <button class="studio-pill-button" data-action="remove-last-pendulum" ${pendulums.length <= 1 ? "disabled" : ""}>Remove Last</button>
            </div>
            <div class="studio-entity-list">
              ${pendulums.map((pendulum, index) => `
                <article class="studio-entity-card">
                  <div class="studio-entity-head">
                    <div>
                      <h4>Pendulum ${index + 1}</h4>
                      <p>θ1 ${pendulum.state[0].toFixed(3)} rad</p>
                    </div>
                    <span class="studio-entity-pill">Tip pair</span>
                  </div>
                  <div class="studio-dual-meta">
                    <span>θ2 ${pendulum.state[2].toFixed(3)}</span>
                    <span>ω2 ${pendulum.state[3].toFixed(3)}</span>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>
        `;
      }
      case "double-gyre":
        return `
          <section class="studio-section">
            <div class="studio-inline-actions">
              <button class="studio-pill-button" data-action="seed-gyre" data-count="200">Seed 200</button>
              <button class="studio-pill-button" data-action="seed-gyre" data-count="600">Seed 600</button>
              <button class="studio-pill-button" data-action="seed-gyre" data-count="1200">Seed 1200</button>
            </div>
          </section>
        `;
      case "lid-driven-cavity":
        return `
          <section class="studio-section">
            <div class="studio-inline-actions">
              <button class="studio-pill-button" data-action="seed-cavity" data-count="320">Seed 320</button>
              <button class="studio-pill-button" data-action="seed-cavity" data-count="640">Seed 640</button>
              <button class="studio-pill-button" data-action="seed-cavity" data-count="960">Seed 960</button>
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
            case "seed-gyre":
            case "seed-cavity":
              if (element.dataset.count) {
                await this.manager.seedParticles(Number(element.dataset.count));
              }
              break;
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
