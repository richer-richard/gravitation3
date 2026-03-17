import * as THREE from "three";
import type { SimulationVisualizer } from "../SimulationManager";
import { createTrailMaterial, updateTrailAlpha } from "../../utils/trail-shader";

interface PendulumState {
  state: [number, number, number, number]; // [theta1, omega1, theta2, omega2]
  l1: number;
  l2: number;
  m1: number;
  m2: number;
  trail: [number, number][]; // [x2, y2] pairs from Rust
}

interface DoublePendulumData {
  pendulums: PendulumState[];
  time: number;
  energy: number;
  entropy: number;
}

interface PendulumVisual {
  bob1: THREE.Mesh;
  bob2: THREE.Mesh;
  rod1: THREE.Mesh;
  rod2: THREE.Mesh;
  trail: {
    positions: THREE.Vector3[];
    geometry: THREE.BufferGeometry;
    line: THREE.Line;
    positionArray: Float32Array;
  };
}

const TRAIL_LENGTH = 5000;
const BG_COLOR = 0x0a0e27;
const SCALE = 1.5; // Scale factor: pendulum coords -> scene units
const COLORS = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];

export class DoublePendulumVisualizer implements SimulationVisualizer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;
  private pivot!: THREE.Mesh;
  private pendulumVisuals: PendulumVisual[] = [];
  private cameraDistance = 7;
  private cameraOffset = new THREE.Vector2(0, 0);
  private targetOffset = new THREE.Vector2(0, -0.5);
  private targetDistance = 7;
  private isDragging = false;
  private lastMouse = new THREE.Vector2();
  private renderLoopId = 0;
  private horizonLine: THREE.Line | null = null;

  init(container: HTMLElement): void {
    this.container = container;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(0, -0.5, 7);
    this.camera.lookAt(0, -0.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 5, 5);
    this.scene.add(dirLight);
    const p2 = new THREE.PointLight(0xffffff, 0.4);
    p2.position.set(-5, -5, 5);
    this.scene.add(p2);

    // Grid (XY plane in background)
    const grid = new THREE.GridHelper(8, 20, 0x00d4ff, 0x1a1f3a);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.3;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.12;
    this.scene.add(grid);

    // Horizon line at y=0 (pivot height reference)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.4 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, 0, 0),
      new THREE.Vector3(5, 0, 0),
    ]);
    this.horizonLine = new THREE.Line(lineGeo, lineMat);
    this.scene.add(this.horizonLine);

    // Pivot
    const pivotGeo = new THREE.SphereGeometry(0.07, 16, 16);
    const pivotMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: new THREE.Color(0x94a3b8),
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.4,
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
      this.targetDistance = Math.max(3, Math.min(20, this.targetDistance));
    }, { passive: false });
  }

  private createRod(color: number): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.15,
      metalness: 0.5,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9,
    });
    return new THREE.Mesh(geo, mat);
  }

  private updateRod(rod: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    rod.position.copy(mid);

    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    rod.scale.set(1, length, 1);

    // Compute angle from Y-axis in the XY plane
    const angle = Math.atan2(dir.x, dir.y);
    rod.rotation.set(0, 0, -angle);
  }

  private ensurePendulums(pendulums: PendulumState[]): void {
    while (this.pendulumVisuals.length > pendulums.length) {
      const pv = this.pendulumVisuals.pop()!;
      this.scene.remove(pv.bob1);
      this.scene.remove(pv.bob2);
      this.scene.remove(pv.rod1);
      this.scene.remove(pv.rod2);
      this.scene.remove(pv.trail.line);
      pv.bob1.geometry.dispose();
      (pv.bob1.material as THREE.Material).dispose();
      pv.bob2.geometry.dispose();
      (pv.bob2.material as THREE.Material).dispose();
      pv.rod1.geometry.dispose();
      (pv.rod1.material as THREE.Material).dispose();
      pv.rod2.geometry.dispose();
      (pv.rod2.material as THREE.Material).dispose();
      pv.trail.geometry.dispose();
      (pv.trail.line.material as THREE.Material).dispose();
    }

    while (this.pendulumVisuals.length < pendulums.length) {
      const idx = this.pendulumVisuals.length;
      const colorHex = COLORS[idx % COLORS.length];
      const color = new THREE.Color(colorHex);
      const p = pendulums[idx];

      // Bob1
      const bob1Radius = 0.06 + p.m1 * 0.03;
      const bob1Geo = new THREE.SphereGeometry(bob1Radius, 32, 32);
      const bob1Mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.5,
      });
      const bob1 = new THREE.Mesh(bob1Geo, bob1Mat);
      this.scene.add(bob1);

      // Bob2
      const bob2Radius = 0.06 + p.m2 * 0.03;
      const bob2Geo = new THREE.SphereGeometry(bob2Radius, 32, 32);
      const bob2Color = color.clone().multiplyScalar(0.85);
      const bob2Mat = new THREE.MeshStandardMaterial({
        color: bob2Color,
        emissive: bob2Color,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.5,
      });
      const bob2 = new THREE.Mesh(bob2Geo, bob2Mat);
      this.scene.add(bob2);

      // Rods
      const rod1 = this.createRod(colorHex);
      this.scene.add(rod1);
      const rod2 = this.createRod(colorHex);
      this.scene.add(rod2);

      // Trail for bob2 (tip)
      const posArr = new Float32Array(TRAIL_LENGTH * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      trailGeo.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH), 1));
      trailGeo.setDrawRange(0, 0);
      const trailMat = createTrailMaterial(colorHex);
      const line = new THREE.Line(trailGeo, trailMat);
      this.scene.add(line);

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
    const s = state as DoublePendulumData;
    if (!s?.pendulums) return;

    this.ensurePendulums(s.pendulums);

    for (let i = 0; i < s.pendulums.length; i++) {
      const p = s.pendulums[i];
      const pv = this.pendulumVisuals[i];
      const [theta1, , theta2] = p.state;

      // Compute Cartesian positions from angles
      const x1 = p.l1 * Math.sin(theta1) * SCALE;
      const y1 = -p.l1 * Math.cos(theta1) * SCALE;
      const x2 = x1 + p.l2 * Math.sin(theta2) * SCALE;
      const y2 = y1 - p.l2 * Math.cos(theta2) * SCALE;

      const p1 = new THREE.Vector3(x1, y1, 0);
      const p2 = new THREE.Vector3(x2, y2, 0);

      pv.bob1.position.copy(p1);
      pv.bob2.position.copy(p2);

      // Update rods
      this.updateRod(pv.rod1, new THREE.Vector3(0, 0, 0), p1);
      this.updateRod(pv.rod2, p1, p2);

      // Trail from Rust data or computed position
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
      this.scene.remove(pv.rod1);
      pv.rod1.geometry.dispose();
      (pv.rod1.material as THREE.Material).dispose();
      this.scene.remove(pv.rod2);
      pv.rod2.geometry.dispose();
      (pv.rod2.material as THREE.Material).dispose();
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
    if (this.horizonLine) {
      this.scene.remove(this.horizonLine);
      this.horizonLine.geometry.dispose();
      (this.horizonLine.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
