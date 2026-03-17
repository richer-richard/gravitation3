import type { SimulationVisualizer } from "../SimulationManager";

interface FlowPoint {
  x: number;
  y: number;
  u: number;
  v: number;
  speed: number;
  pressure: number;
  vorticity: number;
}

interface Particle {
  x: number;
  y: number;
  hue: number;
  age: number;
}

interface LidDrivenCavityState {
  flow_field: FlowPoint[];
  particles: Particle[];
  time: number;
  reynolds: number;
  lid_velocity: number;
  viscosity: number;
  divergence_norm: number;
  circulation: number;
}

export class LidDrivenCavityVisualizer implements SimulationVisualizer {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private container!: HTMLElement;
  private renderLoopId = 0;
  private lastState: LidDrivenCavityState | null = null;
  private fieldCanvas: HTMLCanvasElement | null = null;
  private fieldCtx: CanvasRenderingContext2D | null = null;
  private particleTrails = new Map<number, { x: number; y: number }[]>();

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
    this.lastState = state as LidDrivenCavityState;
  }

  private draw(): void {
    const state = this.lastState;
    if (!state) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const scaleX = width;
    const scaleY = height;

    ctx.clearRect(0, 0, width, height);
    this.drawFlowField(state);

    if (this.fieldCanvas) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.fieldCanvas, 0, 0, width, height);
      ctx.restore();
    }

    this.drawChassis(ctx, width, height, state);
    this.drawVelocityVectors(ctx, state.flow_field, width, height);
    this.drawParticles(ctx, state.particles, scaleX, scaleY, height);
    this.drawReadout(ctx, state, width, height);
  }

  private drawFlowField(state: LidDrivenCavityState): void {
    const field = state.flow_field;
    if (field.length === 0) return;

    const gridSize = Math.round(Math.sqrt(field.length));
    if (!this.fieldCanvas || this.fieldCanvas.width !== gridSize || this.fieldCanvas.height !== gridSize) {
      this.fieldCanvas = document.createElement("canvas");
      this.fieldCanvas.width = gridSize;
      this.fieldCanvas.height = gridSize;
      this.fieldCtx = this.fieldCanvas.getContext("2d")!;
    }

    const fieldCtx = this.fieldCtx;
    if (!fieldCtx) return;

    const image = fieldCtx.createImageData(gridSize, gridSize);
    const data = image.data;
    let maxSpeed = 0.001;
    let maxVorticity = 0.001;

    for (const point of field) {
      maxSpeed = Math.max(maxSpeed, point.speed);
      maxVorticity = Math.max(maxVorticity, Math.abs(point.vorticity));
    }

    for (let i = 0; i < field.length; i++) {
      const point = field[i];
      const speedT = Math.min(1, point.speed / maxSpeed);
      const vortT = 0.5 + 0.5 * (point.vorticity / maxVorticity);
      const [r, g, b] = cavityPalette(speedT, vortT);
      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }

    fieldCtx.putImageData(image, 0, 0);
  }

  private drawChassis(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: LidDrivenCavityState
  ): void {
    ctx.save();
    ctx.strokeStyle = "rgba(191, 219, 254, 0.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -state.time * 50;
    ctx.beginPath();
    ctx.moveTo(28, 26);
    ctx.lineTo(width - 28, 26);
    ctx.stroke();
    ctx.restore();
  }

  private drawVelocityVectors(
    ctx: CanvasRenderingContext2D,
    field: FlowPoint[],
    width: number,
    height: number
  ): void {
    const gridSize = Math.round(Math.sqrt(field.length));
    if (!gridSize) return;

    ctx.save();
    ctx.strokeStyle = "rgba(226, 232, 240, 0.32)";
    ctx.lineWidth = 1;

    const stride = Math.max(2, Math.floor(gridSize / 14));
    for (let y = 1; y < gridSize - 1; y += stride) {
      for (let x = 1; x < gridSize - 1; x += stride) {
        const point = field[y * gridSize + x];
        if (!point) continue;
        const px = 18 + point.x * (width - 36);
        const py = height - 18 - point.y * (height - 36);
        const angle = Math.atan2(-point.v, point.u);
        const length = Math.min(16, 4 + point.speed * 18);
        const ex = px + Math.cos(angle) * length;
        const ey = py + Math.sin(angle) * length;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.lineTo(
          ex - 3 * Math.cos(angle - 0.5),
          ey - 3 * Math.sin(angle - 0.5)
        );
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - 3 * Math.cos(angle + 0.5),
          ey - 3 * Math.sin(angle + 0.5)
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    scaleX: number,
    scaleY: number,
    height: number
  ): void {
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      const x = 18 + particle.x * (scaleX - 36);
      const y = height - 18 - particle.y * (scaleY - 36);

      let trail = this.particleTrails.get(index);
      if (!trail) {
        trail = [];
        this.particleTrails.set(index, trail);
      }
      trail.push({ x, y });
      if (trail.length > 22) trail.shift();

      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const alpha = (i / trail.length) * 0.45;
          ctx.strokeStyle = `hsla(${particle.hue.toFixed(0)}, 90%, 70%, ${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle.hue.toFixed(0)}, 90%, 72%, 0.95)`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsla(${particle.hue.toFixed(0)}, 90%, 72%, 0.8)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawReadout(
    ctx: CanvasRenderingContext2D,
    state: LidDrivenCavityState,
    width: number,
    height: number
  ): void {
    ctx.save();
    ctx.fillStyle = "rgba(3, 7, 18, 0.78)";
    roundRect(ctx, 28, height - 70, 220, 44, 12);
    ctx.fill();

    ctx.fillStyle = "rgba(226, 232, 240, 0.78)";
    ctx.font = '12px "SF Mono", "JetBrains Mono", monospace';
    ctx.fillText(`Re ${state.reynolds.toFixed(0)}  |  Lid ${state.lid_velocity.toFixed(2)}`, 42, height - 44);
    ctx.fillStyle = "rgba(148, 163, 184, 0.88)";
    ctx.fillText(`div ${state.divergence_norm.toExponential(2)}  circ ${state.circulation.toFixed(2)}`, 42, height - 28);

    ctx.fillStyle = "rgba(207, 250, 254, 0.78)";
    ctx.font = '11px "SF Mono", "JetBrains Mono", monospace';
    ctx.fillText(`t ${state.time.toFixed(2)} s`, width - 112, height - 30);
    ctx.restore();
  }

  resize(): void {
    if (!this.container) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  clearTrails(): void {
    this.particleTrails.clear();
  }

  private renderLoop = (): void => {
    this.renderLoopId = requestAnimationFrame(this.renderLoop);
    this.draw();
  };

  dispose(): void {
    cancelAnimationFrame(this.renderLoopId);
    this.particleTrails.clear();
    this.fieldCanvas = null;
    this.fieldCtx = null;
    this.canvas.remove();
  }
}

function cavityPalette(speedT: number, vortT: number): [number, number, number] {
  const hue = 210 + (vortT - 0.5) * 140;
  const saturation = 78 + speedT * 18;
  const lightness = 12 + speedT * 48;
  return hslToRgb(hue, saturation / 100, lightness / 100);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
