/**
 * Starfield — animated canvas background with twinkling stars and
 * slow-drifting nebula glow. Designed for the landing page.
 */

interface Star {
  x: number;
  y: number;
  z: number; // depth 0–1 (controls size + brightness)
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
}

export class Starfield {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private shootingStars: ShootingStar[] = [];
  private animId = 0;
  private t = 0;
  private dpr: number;
  private w = 0;
  private h = 0;

  constructor(container: HTMLElement, starCount = 400) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;";
    container.prepend(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;
    this.dpr = Math.min(window.devicePixelRatio, 2);

    this.resize();
    this.populate(starCount);

    window.addEventListener("resize", this.resize);
    this.loop();
  }

  private resize = (): void => {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private populate(count: number): void {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        twinkleSpeed: 0.3 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnShootingStar(): void {
    if (this.shootingStars.length >= 2) return;
    if (Math.random() > 0.003) return; // ~0.3% chance per frame

    const angle = -0.3 - Math.random() * 0.5; // downward-right
    const speed = 3 + Math.random() * 4;
    this.shootingStars.push({
      x: Math.random() * this.w * 0.8,
      y: Math.random() * this.h * 0.3,
      vx: Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      life: 1,
      maxLife: 40 + Math.random() * 30,
      length: 60 + Math.random() * 80,
    });
  }

  private loop = (): void => {
    this.animId = requestAnimationFrame(this.loop);
    this.t += 0.016;
    this.draw();
  };

  private draw(): void {
    const { ctx, w, h, t } = this;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Subtle radial nebula glow
    const grd = ctx.createRadialGradient(
      w * 0.3,
      h * 0.2,
      0,
      w * 0.3,
      h * 0.2,
      w * 0.6
    );
    grd.addColorStop(0, "rgba(59, 130, 246, 0.015)");
    grd.addColorStop(0.5, "rgba(139, 92, 246, 0.008)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Second glow — warm accent
    const grd2 = ctx.createRadialGradient(
      w * 0.75,
      h * 0.65,
      0,
      w * 0.75,
      h * 0.65,
      w * 0.5
    );
    grd2.addColorStop(0, "rgba(236, 72, 153, 0.01)");
    grd2.addColorStop(1, "transparent");
    ctx.fillStyle = grd2;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const star of this.stars) {
      const twinkle =
        0.3 +
        0.7 *
          ((Math.sin(t * star.twinkleSpeed + star.twinklePhase) + 1) / 2);
      const brightness = (0.3 + star.z * 0.7) * twinkle;
      const radius = 0.4 + star.z * 1.4;

      const sx = star.x * w;
      const sy = star.y * h;

      // Glow for bright stars
      if (star.z > 0.7 && twinkle > 0.7) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${brightness * 0.08})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);

      // Slight color variation based on depth
      const r = 180 + star.z * 75;
      const g = 190 + star.z * 60;
      const b = 220 + star.z * 35;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`;
      ctx.fill();
    }

    // Shooting stars
    this.spawnShootingStar();
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life += 1;

      const progress = s.life / s.maxLife;
      if (progress >= 1) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      const alpha = progress < 0.1 ? progress * 10 : 1 - (progress - 0.1) / 0.9;
      const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.length;
      const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.length;

      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
      grad.addColorStop(0.3, `rgba(200, 220, 255, ${alpha * 0.4})`);
      grad.addColorStop(1, "rgba(200, 220, 255, 0)");

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.fill();
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.animId);
    window.removeEventListener("resize", this.resize);
    this.canvas.remove();
  }
}
