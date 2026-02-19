/**
 * PerformanceMonitor — FPS/memory overlay for the simulation canvas.
 */

export class PerformanceMonitor {
  private container: HTMLElement;
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private animId = 0;
  private visible = true;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  start(): void {
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.loop();
  }

  stop(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private loop = (): void => {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = now;
      this.updateDisplay();
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  private updateDisplay(): void {
    if (!this.visible) return;

    let text = `FPS: ${this.fps}`;

    // Memory info if available
    const perf = performance as unknown as Record<string, unknown>;
    if (perf.memory) {
      const mem = perf.memory as { usedJSHeapSize: number };
      const mb = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(0);
      text += ` | ${mb}MB`;
    }

    this.container.textContent = text;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? "" : "none";
  }

  getFPS(): number {
    return this.fps;
  }

  destroy(): void {
    this.stop();
  }
}
