/**
 * Double Gyre Visualizer — 2D Canvas rendering (not Three.js)
 * Renders particles, flow field arrows, and streamlines on a 2D canvas.
 */

import type { SimulationVisualizer } from "../SimulationManager";

interface Particle {
  x: number;
  y: number;
  color: number;
  active: boolean;
}

interface FlowFieldPoint {
  x: number;
  y: number;
  u: number;
  v: number;
}

interface DoubleGyreState {
  particles: Particle[];
  flow_field: FlowFieldPoint[];
  time: number;
  a: number;
  epsilon: number;
  omega: number;
}

const BG_INNER = "#0f1d3a";
const BG_OUTER = "#050812";
const DOMAIN_W = 2;
const DOMAIN_H = 1;

export class DoubleGyreVisualizer implements SimulationVisualizer {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;
  private showFlowField = true;
  private showParticles = true;
  private particleTrails: Map<number, { x: number; y: number }[]> = new Map();
  private trailMaxLength = 30;
  private renderLoopId = 0;
  private lastState: DoubleGyreState | null = null;

  init(container: HTMLElement): void {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.resize();
    this.renderLoop();
  }

  update(state: unknown): void {
    this.lastState = state as DoubleGyreState;
  }

  private draw(): void {
    const state = this.lastState;
    if (!state) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    const scaleX = w / DOMAIN_W;
    const scaleY = h / DOMAIN_H;

    // Background gradient
    const grad = ctx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, Math.max(w, h) * 0.7
    );
    grad.addColorStop(0, BG_INNER);
    grad.addColorStop(1, BG_OUTER);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Flow field arrows
    if (this.showFlowField && state.flow_field) {
      this.drawFlowField(ctx, state.flow_field, scaleX, scaleY, h);
    }

    // Particles + trails
    if (this.showParticles && state.particles) {
      this.drawParticles(ctx, state.particles, scaleX, scaleY, h);
    }

    // Time display
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "12px monospace";
    ctx.fillText(`t = ${state.time.toFixed(2)}`, 10, h - 10);
  }

  private drawFlowField(
    ctx: CanvasRenderingContext2D,
    field: FlowFieldPoint[],
    scaleX: number,
    scaleY: number,
    canvasH: number
  ): void {
    for (const fp of field) {
      const cx = fp.x * scaleX;
      const cy = canvasH - fp.y * scaleY;
      const mag = Math.sqrt(fp.u * fp.u + fp.v * fp.v);
      if (mag < 0.001) continue;

      const angle = Math.atan2(-fp.v, fp.u); // negate v because canvas Y is flipped
      const arrowLen = Math.min(mag * 8, 12);

      // Color based on magnitude
      const hue = 200 + (mag / 3) * 60;
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.5)`;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const ex = cx + Math.cos(angle) * arrowLen;
      const ey = cy + Math.sin(angle) * arrowLen;
      ctx.lineTo(ex, ey);

      // Arrowhead
      const headLen = 3;
      ctx.lineTo(
        ex - headLen * Math.cos(angle - 0.5),
        ey - headLen * Math.sin(angle - 0.5)
      );
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - headLen * Math.cos(angle + 0.5),
        ey - headLen * Math.sin(angle + 0.5)
      );
      ctx.stroke();
    }
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    scaleX: number,
    scaleY: number,
    canvasH: number
  ): void {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) continue;

      const cx = p.x * scaleX;
      const cy = canvasH - p.y * scaleY;

      // Update trails
      let trail = this.particleTrails.get(i);
      if (!trail) {
        trail = [];
        this.particleTrails.set(i, trail);
      }
      trail.push({ x: cx, y: cy });
      if (trail.length > this.trailMaxLength) trail.shift();

      // Draw trail
      if (trail.length > 1) {
        const colorStr = colorToCSS(p.color);
        for (let j = 1; j < trail.length; j++) {
          const alpha = (j / trail.length) * 0.5;
          ctx.strokeStyle = colorStr.replace("1)", `${alpha})`);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(trail[j - 1].x, trail[j - 1].y);
          ctx.lineTo(trail[j].x, trail[j].y);
          ctx.stroke();
        }
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = colorToCSS(p.color);
      ctx.shadowBlur = 5;
      ctx.shadowColor = colorToCSS(p.color);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  setShowFlowField(show: boolean): void {
    this.showFlowField = show;
  }

  setShowParticles(show: boolean): void {
    this.showParticles = show;
  }

  resize(): void {
    if (!this.container) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private renderLoop = (): void => {
    this.renderLoopId = requestAnimationFrame(this.renderLoop);
    this.draw();
  };

  dispose(): void {
    cancelAnimationFrame(this.renderLoopId);
    this.particleTrails.clear();
    this.canvas.remove();
  }
}

function colorToCSS(color: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, 1)`;
}
