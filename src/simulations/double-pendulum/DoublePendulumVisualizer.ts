import * as THREE from "three";
import type { SimulationVisualizer } from "../SimulationManager";
import { createTrailMaterial, updateTrailAlpha } from "../../utils/trail-shader";

interface PendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  energy: number;
  color: number;
}

interface DoublePendulumState {
  pendulums: PendulumState[];
  time: number;
  l1: number;
  l2: number;
  entropy: number;
}

interface PendulumVisual {
  bob1: THREE.Mesh;
  bob2: THREE.Mesh;
  rod1: THREE.Mesh | null;
  rod2: THREE.Mesh | null;
  trail: {
    positions: THREE.Vector3[];
    geometry: THREE.BufferGeometry;
    line: THREE.Line;
    positionArray: Float32Array;
  };
}

const TRAIL_LENGTH = 5000;
const BG_COLOR = 0x0a0e27;

export class DoublePendulumVisualizer implements SimulationVisualizer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;
  private pivot!: THREE.Mesh;
  private pendulumVisuals: PendulumVisual[] = [];
  private cameraDistance = 5;
  private cameraOffset = new THREE.Vector2(0, 0);
  private targetOffset = new THREE.Vector2(0, 0);
  private targetDistance = 5;
  private isDragging = false;
  private lastMouse = new THREE.Vector2();
  private renderLoopId = 0;

  init(container: HTMLElement): void {
    this.container = container;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const p1 = new THREE.PointLight(0xffffff, 1);
    p1.position.set(5, 5, 5);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0xffffff, 0.5);
    p2.position.set(-5, -5, 5);
    this.scene.add(p2);

    // Grid
    const grid = new THREE.GridHelper(6, 20, 0x00d4ff, 0x1a1f3a);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.3;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.15;
    this.scene.add(grid);

    // Pivot
    const pivotGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const pivotMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.5,
    });
    this.pivot = new THREE.Mesh(pivotGeo, pivotMat);
    this.scene.add(this.pivot);

    // Mouse interaction
    this.setupInteraction();
    this.renderLoop();
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouse.set(e.clientX, e.clientY);
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse.set(e.clientX, e.clientY);
      const scale = (this.cameraDistance / 500) * 0.5;
      this.targetOffset.x -= dx * scale;
      this.targetOffset.y += dy * scale;
    });

    canvas.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetDistance *= 1 + e.deltaY * 0.001;
      this.targetDistance = Math.max(2, Math.min(15, this.targetDistance));
    }, { passive: false });
  }

  private createRod(color: number): THREE.Mesh {
    // Create unit-length rod; will be scaled/positioned in updateRod()
    const geo = new THREE.CylinderGeometry(0.015, 0.015, 1, 8);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
    });
    return new THREE.Mesh(geo, mat);
  }

  private updateRod(rod: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    rod.scale.set(1, len, 1);
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    rod.position.copy(mid);
    rod.lookAt(to);
    rod.rotateX(Math.PI / 2);
  }

  private ensurePendulums(pendulums: PendulumState[]): void {
    while (this.pendulumVisuals.length > pendulums.length) {
      const pv = this.pendulumVisuals.pop()!;
      this.scene.remove(pv.bob1);
      this.scene.remove(pv.bob2);
      if (pv.rod1) this.scene.remove(pv.rod1);
      if (pv.rod2) this.scene.remove(pv.rod2);
      this.scene.remove(pv.trail.line);
      pv.bob1.geometry.dispose();
      (pv.bob1.material as THREE.Material).dispose();
      pv.bob2.geometry.dispose();
      (pv.bob2.material as THREE.Material).dispose();
      pv.trail.geometry.dispose();
      (pv.trail.line.material as THREE.Material).dispose();
    }

    while (this.pendulumVisuals.length < pendulums.length) {
      const idx = this.pendulumVisuals.length;
      const p = pendulums[idx];
      const color = new THREE.Color(p.color);

      const bobGeo = new THREE.SphereGeometry(0.12, 32, 32);
      const bob1Mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
      });
      const bob1 = new THREE.Mesh(bobGeo.clone(), bob1Mat);
      this.scene.add(bob1);

      const bob2Mat = new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.8),
        emissive: color.clone().multiplyScalar(0.8),
        emissiveIntensity: 0.3,
      });
      const bob2 = new THREE.Mesh(bobGeo, bob2Mat);
      this.scene.add(bob2);

      // Trail for bob2 (tip) with fade-out shader
      const posArr = new Float32Array(TRAIL_LENGTH * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      trailGeo.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH), 1));
      trailGeo.setDrawRange(0, 0);
      const trailMat = createTrailMaterial(p.color);
      const line = new THREE.Line(trailGeo, trailMat);
      this.scene.add(line);

      const rod1 = this.createRod(p.color);
      this.scene.add(rod1);
      const rod2 = this.createRod(p.color);
      this.scene.add(rod2);

      this.pendulumVisuals.push({
        bob1,
        bob2,
        rod1,
        rod2,
        trail: {
          positions: [],
          geometry: trailGeo,
          line,
          positionArray: posArr,
        },
      });
    }
  }

  update(state: unknown): void {
    const s = state as DoublePendulumState;
    if (!s?.pendulums) return;

    this.ensurePendulums(s.pendulums);

    for (let i = 0; i < s.pendulums.length; i++) {
      const p = s.pendulums[i];
      const pv = this.pendulumVisuals[i];

      const p1 = new THREE.Vector3(p.x1, p.y1, 0);
      const p2 = new THREE.Vector3(p.x2, p.y2, 0);

      pv.bob1.position.copy(p1);
      pv.bob2.position.copy(p2);

      // Update rod transforms (reuse existing meshes)
      if (pv.rod1) this.updateRod(pv.rod1, new THREE.Vector3(0, 0, 0), p1);
      if (pv.rod2) this.updateRod(pv.rod2, p1, p2);

      // Trail (bob2)
      const trail = pv.trail;
      trail.positions.push(p2.clone());
      if (trail.positions.length > TRAIL_LENGTH) trail.positions.shift();
      for (let j = 0; j < trail.positions.length; j++) {
        const tp = trail.positions[j];
        trail.positionArray[j * 3] = tp.x;
        trail.positionArray[j * 3 + 1] = tp.y;
        trail.positionArray[j * 3 + 2] = tp.z;
      }
      trail.geometry.attributes.position.needsUpdate = true;
      updateTrailAlpha(trail.geometry, trail.positions.length, TRAIL_LENGTH);
      trail.geometry.setDrawRange(0, trail.positions.length);
    }
  }

  clearTrails(): void {
    for (const pv of this.pendulumVisuals) {
      pv.trail.positions.length = 0;
      pv.trail.geometry.setDrawRange(0, 0);
    }
  }

  resize(): void {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private renderLoop = (): void => {
    this.renderLoopId = requestAnimationFrame(this.renderLoop);

    // Smooth camera
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * 0.1;
    this.cameraOffset.lerp(this.targetOffset, 0.1);

    this.camera.position.set(
      this.cameraOffset.x,
      this.cameraOffset.y,
      this.cameraDistance
    );
    this.camera.lookAt(
      this.cameraOffset.x,
      this.cameraOffset.y,
      0
    );

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.renderLoopId);

    for (const pv of this.pendulumVisuals) {
      this.scene.remove(pv.bob1);
      this.scene.remove(pv.bob2);
      if (pv.rod1) {
        this.scene.remove(pv.rod1);
        pv.rod1.geometry.dispose();
        (pv.rod1.material as THREE.Material).dispose();
      }
      if (pv.rod2) {
        this.scene.remove(pv.rod2);
        pv.rod2.geometry.dispose();
        (pv.rod2.material as THREE.Material).dispose();
      }
      this.scene.remove(pv.trail.line);
      pv.bob1.geometry.dispose();
      (pv.bob1.material as THREE.Material).dispose();
      pv.bob2.geometry.dispose();
      (pv.bob2.material as THREE.Material).dispose();
      pv.trail.geometry.dispose();
      (pv.trail.line.material as THREE.Material).dispose();
    }
    this.pendulumVisuals = [];

    if (this.pivot) {
      this.scene.remove(this.pivot);
      this.pivot.geometry.dispose();
      (this.pivot.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
