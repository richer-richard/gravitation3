/**
 * TrailManager — manages particle trail rendering with BufferGeometry.
 * Provides a ring-buffer trail system for Three.js line rendering.
 */

import * as THREE from "three";

export interface TrailOptions {
  maxPoints: number;
  color: THREE.ColorRepresentation;
  opacity?: number;
  lineWidth?: number;
}

export class TrailManager {
  private geometry: THREE.BufferGeometry;
  private line: THREE.Line;
  private positions: Float32Array;
  private maxPoints: number;
  private head = 0;
  private count = 0;

  constructor(options: TrailOptions) {
    this.maxPoints = options.maxPoints;
    this.positions = new Float32Array(this.maxPoints * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: options.opacity ?? 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.line = new THREE.Line(this.geometry, material);
    this.line.frustumCulled = false;
  }

  addPoint(x: number, y: number, z: number): void {
    const idx = this.head * 3;
    this.positions[idx] = x;
    this.positions[idx + 1] = y;
    this.positions[idx + 2] = z;

    this.head = (this.head + 1) % this.maxPoints;
    if (this.count < this.maxPoints) this.count++;

    const attr = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.geometry.setDrawRange(0, this.count);
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
    this.positions.fill(0);
    const attr = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.geometry.setDrawRange(0, 0);
  }

  getObject(): THREE.Line {
    return this.line;
  }

  setColor(color: THREE.ColorRepresentation): void {
    (this.line.material as THREE.LineBasicMaterial).color.set(color);
  }

  setVisible(visible: boolean): void {
    this.line.visible = visible;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
  }
}

/**
 * MultiTrailManager — manages multiple named trails.
 */
export class MultiTrailManager {
  private trails: Map<string, TrailManager> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createTrail(id: string, options: TrailOptions): TrailManager {
    const trail = new TrailManager(options);
    this.trails.set(id, trail);
    this.scene.add(trail.getObject());
    return trail;
  }

  getTrail(id: string): TrailManager | undefined {
    return this.trails.get(id);
  }

  clearAll(): void {
    for (const trail of this.trails.values()) {
      trail.clear();
    }
  }

  setAllVisible(visible: boolean): void {
    for (const trail of this.trails.values()) {
      trail.setVisible(visible);
    }
  }

  dispose(): void {
    for (const trail of this.trails.values()) {
      this.scene.remove(trail.getObject());
      trail.dispose();
    }
    this.trails.clear();
  }
}
