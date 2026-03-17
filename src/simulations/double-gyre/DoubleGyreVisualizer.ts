/**
 * Double Gyre Visualizer — 2D Canvas rendering with velocity heatmap.
 * Renders a high-resolution velocity magnitude heatmap, flow arrows, and particles.
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

const DOMAIN_W = 2;
const DOMAIN_H = 1;
const HEATMAP_RES_X = 160;
const HEATMAP_RES_Y = 80;

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
  private heatmapImageData: ImageData | null = null;
  private heatmapFrameCounter = 0;
  private cachedHeatmapW = 0;
  private cachedHeatmapH = 0;

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

    // Draw velocity heatmap (recompute every 3 frames for performance)
    this.heatmapFrameCounter++;
    if (this.heatmapFrameCounter >= 3 || !this.heatmapImageData || this.cachedHeatmapW !== w || this.cachedHeatmapH !== h) {
      this.computeHeatmap(state, w, h);
      this.heatmapFrameCounter = 0;
    }
    if (this.heatmapImageData) {
      ctx.putImageData(this.heatmapImageData, 0, 0);
    }

    // Flow field arrows (sparse overlay)
    if (this.showFlowField && state.flow_field) {
      this.drawFlowArrows(ctx, state, scaleX, scaleY, h);
    }

    // Particles + trails
    if (this.showParticles && state.particles) {
      this.drawParticles(ctx, state.particles, scaleX, scaleY, h);
    }

    // Time display
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "12px monospace";
    ctx.fillText(`t = ${state.time.toFixed(2)}`, 10, h - 10);
  }

  private computeHeatmap(state: DoubleGyreState, w: number, h: number): void {
    this.cachedHeatmapW = w;
    this.cachedHeatmapH = h;
    this.heatmapImageData = this.ctx.createImageData(w, h);
    const data = this.heatmapImageData.data;

    const { a, epsilon, omega, time } = state;
    const pi = Math.PI;

    // Precompute time-dependent terms
    const sinOmegaT = Math.sin(omega * time);
    const aCoeff = epsilon * sinOmegaT;
    const bCoeff = 1.0 - 2.0 * epsilon * sinOmegaT;

    // Compute velocity magnitudes to find min/max
    const mags = new Float32Array(HEATMAP_RES_X * HEATMAP_RES_Y);
    let maxMag = 0;

    for (let iy = 0; iy < HEATMAP_RES_Y; iy++) {
      const y = (iy + 0.5) / HEATMAP_RES_Y * DOMAIN_H;
      const piY = pi * y;
      const cosPiY = Math.cos(piY);
      const sinPiY = Math.sin(piY);

      for (let ix = 0; ix < HEATMAP_RES_X; ix++) {
        const x = (ix + 0.5) / HEATMAP_RES_X * DOMAIN_W;
        const f = aCoeff * x * x + bCoeff * x;
        const dfdx = 2.0 * aCoeff * x + bCoeff;

        const piF = pi * f;
        const u = -pi * a * Math.sin(piF) * cosPiY;
        const v = pi * a * Math.cos(piF) * sinPiY * dfdx;

        const mag = Math.sqrt(u * u + v * v);
        mags[iy * HEATMAP_RES_X + ix] = mag;
        if (mag > maxMag) maxMag = mag;
      }
    }

    if (maxMag < 0.0001) maxMag = 1;

    // Map to pixels using jet-style colormap
    for (let iy = 0; iy < HEATMAP_RES_Y; iy++) {
      const canvasYStart = Math.floor((1 - (iy + 1) / HEATMAP_RES_Y) * h);
      const canvasYEnd = Math.floor((1 - iy / HEATMAP_RES_Y) * h);

      for (let ix = 0; ix < HEATMAP_RES_X; ix++) {
        const mag = mags[iy * HEATMAP_RES_X + ix];
        const t = Math.min(1, mag / maxMag);
        const [r, g, b] = jetColormap(t);

        const canvasXStart = Math.floor(ix / HEATMAP_RES_X * w);
        const canvasXEnd = Math.floor((ix + 1) / HEATMAP_RES_X * w);

        for (let py = canvasYStart; py < canvasYEnd; py++) {
          for (let px = canvasXStart; px < canvasXEnd; px++) {
            const idx = (py * w + px) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  private drawFlowArrows(
    ctx: CanvasRenderingContext2D,
    state: DoubleGyreState,
    scaleX: number,
    scaleY: number,
    canvasH: number
  ): void {
    const arrowCols = 20;
    const arrowRows = 10;
    const { a, epsilon, omega, time } = state;
    const pi = Math.PI;
    const sinOmegaT = Math.sin(omega * time);
    const aCoeff = epsilon * sinOmegaT;
    const bCoeff = 1.0 - 2.0 * epsilon * sinOmegaT;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;

    for (let iy = 0; iy <= arrowRows; iy++) {
      const y = iy / arrowRows * DOMAIN_H;
      for (let ix = 0; ix <= arrowCols; ix++) {
        const x = ix / arrowCols * DOMAIN_W;
        const f = aCoeff * x * x + bCoeff * x;
        const dfdx = 2.0 * aCoeff * x + bCoeff;

        const piF = pi * f;
        const u = -pi * a * Math.sin(piF) * Math.cos(pi * y);
        const v = pi * a * Math.cos(piF) * Math.sin(pi * y) * dfdx;

        const mag = Math.sqrt(u * u + v * v);
        if (mag < 0.001) continue;

        const cx = x * scaleX;
        const cy = canvasH - y * scaleY;
        const angle = Math.atan2(-v, u);
        const arrowLen = Math.min(mag * 10, 14);

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
        for (let j = 1; j < trail.length; j++) {
          const alpha = (j / trail.length) * 0.6;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(trail[j - 1].x, trail[j - 1].y);
          ctx.lineTo(trail[j].x, trail[j].y);
          ctx.stroke();
        }
      }

      // Draw particle (bright white dot on top of heatmap)
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
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

  clearTrails(): void {
    this.particleTrails.clear();
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
    // Reset heatmap cache on resize
    this.heatmapImageData = null;
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
    this.heatmapImageData = null;
    this.canvas.remove();
  }
}

/** Jet-style colormap: 0→dark blue, 0.25→cyan, 0.5→green, 0.75→yellow, 1→red */
function jetColormap(t: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (t < 0.125) {
    r = 0;
    g = 0;
    b = Math.round(128 + t / 0.125 * 127);
  } else if (t < 0.375) {
    r = 0;
    g = Math.round((t - 0.125) / 0.25 * 255);
    b = 255;
  } else if (t < 0.625) {
    r = Math.round((t - 0.375) / 0.25 * 255);
    g = 255;
    b = Math.round(255 - (t - 0.375) / 0.25 * 255);
  } else if (t < 0.875) {
    r = 255;
    g = Math.round(255 - (t - 0.625) / 0.25 * 255);
    b = 0;
  } else {
    r = Math.round(255 - (t - 0.875) / 0.125 * 127);
    g = 0;
    b = 0;
  }
  return [r, g, b];
}
