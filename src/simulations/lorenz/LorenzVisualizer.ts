import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { SimulationVisualizer } from "../SimulationManager";

interface Trajectory {
  state: number[];
  color: number;
  trail: number[][];
}

interface LorenzState {
  trajectories: Trajectory[];
  time: number;
  sigma: number;
  rho: number;
  beta: number;
  entropy: number;
}

interface TrajectoryVisual {
  body: THREE.Mesh;
  trail: {
    positions: THREE.Vector3[];
    geometry: THREE.BufferGeometry;
    line: THREE.Line;
    positionArray: Float32Array;
  };
}

const TRAIL_LENGTH = 2000;
const BG_COLOR = 0x0a0e27;

export class LorenzVisualizer implements SimulationVisualizer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container!: HTMLElement;
  private trajectoryVisuals: TrajectoryVisual[] = [];
  private starfield: THREE.Points | null = null;
  private renderLoopId = 0;

  init(container: HTMLElement): void {
    this.container = container;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    this.camera.position.set(0, -80, 40);
    this.camera.lookAt(0, 0, 25);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const p1 = new THREE.PointLight(0x00d4ff, 1, 100);
    p1.position.set(20, 20, 40);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0xec4899, 1, 100);
    p2.position.set(-20, -20, 10);
    this.scene.add(p2);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = -0.5;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 150;
    this.controls.target.set(0, 0, 25);

    // Starfield
    this.createStarfield();
    this.renderLoop();
  }

  private createStarfield(): void {
    const positions: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const spread = 100;
      positions.push(
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);
  }

  private ensureTrajectories(trajectories: Trajectory[]): void {
    while (this.trajectoryVisuals.length > trajectories.length) {
      const tv = this.trajectoryVisuals.pop()!;
      this.scene.remove(tv.body);
      this.scene.remove(tv.trail.line);
      tv.body.geometry.dispose();
      (tv.body.material as THREE.Material).dispose();
      tv.trail.geometry.dispose();
      (tv.trail.line.material as THREE.Material).dispose();
    }

    while (this.trajectoryVisuals.length < trajectories.length) {
      const idx = this.trajectoryVisuals.length;
      const t = trajectories[idx];
      const color = new THREE.Color(t.color);

      const bodyGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      this.scene.add(body);

      const posArr = new Float32Array(TRAIL_LENGTH * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      trailGeo.setDrawRange(0, 0);
      const trailMat = new THREE.LineBasicMaterial({
        color: t.color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(trailGeo, trailMat);
      this.scene.add(line);

      this.trajectoryVisuals.push({
        body,
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
    const s = state as LorenzState;
    if (!s?.trajectories) return;

    this.ensureTrajectories(s.trajectories);

    for (let i = 0; i < s.trajectories.length; i++) {
      const t = s.trajectories[i];
      const tv = this.trajectoryVisuals[i];
      const [x, y, z] = t.state;

      tv.body.position.set(x, y, z);

      const trail = tv.trail;
      trail.positions.push(new THREE.Vector3(x, y, z));
      if (trail.positions.length > TRAIL_LENGTH) trail.positions.shift();

      for (let j = 0; j < trail.positions.length; j++) {
        const p = trail.positions[j];
        trail.positionArray[j * 3] = p.x;
        trail.positionArray[j * 3 + 1] = p.y;
        trail.positionArray[j * 3 + 2] = p.z;
      }
      trail.geometry.attributes.position.needsUpdate = true;
      trail.geometry.setDrawRange(0, trail.positions.length);
    }
  }

  clearTrails(): void {
    for (const tv of this.trajectoryVisuals) {
      tv.trail.positions.length = 0;
      tv.trail.geometry.setDrawRange(0, 0);
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
    this.controls.update();
    if (this.starfield) this.starfield.rotation.y += 0.0001;
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.renderLoopId);
    this.controls.dispose();

    for (const tv of this.trajectoryVisuals) {
      this.scene.remove(tv.body);
      this.scene.remove(tv.trail.line);
      tv.body.geometry.dispose();
      (tv.body.material as THREE.Material).dispose();
      tv.trail.geometry.dispose();
      (tv.trail.line.material as THREE.Material).dispose();
    }
    this.trajectoryVisuals = [];

    if (this.starfield) {
      this.scene.remove(this.starfield);
      this.starfield.geometry.dispose();
      (this.starfield.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
