import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { SimulationVisualizer } from "../SimulationManager";

interface BucketState {
  angle: number;
  mass: number;
}

interface MalkusState {
  omega: number;
  theta: number;
  buckets: BucketState[];
  time: number;
  inflow_rate: number;
  leak_rate: number;
  damping: number;
  omega_history: number[];
  theta_history: number[];
}

interface BucketVisual {
  group: THREE.Group;
  water: THREE.Mesh;
}

const BG_COLOR = 0x0a0e27;
const WATER_COLOR = 0x4cc9f0;
const BUCKET_COLOR = 0x64748b;
const COM_COLOR = 0xec4899;

export class MalkusVisualizer implements SimulationVisualizer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container!: HTMLElement;

  private wheelGroup!: THREE.Group;
  private hub!: THREE.Mesh;
  private rim!: THREE.Mesh;
  private bucketVisuals: BucketVisual[] = [];
  private comMarker!: THREE.Mesh;
  private comTrail: THREE.Vector3[] = [];
  private comLine: THREE.Line | null = null;
  private dripIndicator!: THREE.Mesh;
  private droplets: { mesh: THREE.Mesh; vy: number; life: number }[] = [];
  private wheelRadius = 2;
  private renderLoopId = 0;

  init(container: HTMLElement): void {
    this.container = container;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.FogExp2(BG_COLOR, 0.02);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

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
    const p1 = new THREE.PointLight(0x00d4ff, 1.5, 50);
    p1.position.set(5, 5, 5);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0xec4899, 1, 50);
    p2.position.set(-5, -5, 5);
    this.scene.add(p2);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 15;

    // Grid
    const grid = new THREE.GridHelper(10, 20, 0x1e3a5f, 0x0f1d3a);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -1;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.2;
    this.scene.add(grid);

    // Wheel structure
    this.wheelGroup = new THREE.Group();
    this.scene.add(this.wheelGroup);

    // Hub
    const hubGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const hubMat = new THREE.MeshBasicMaterial({
      color: 0x4a5568,
      transparent: true,
      opacity: 0.6,
    });
    this.hub = new THREE.Mesh(hubGeo, hubMat);
    this.hub.renderOrder = -10;
    this.wheelGroup.add(this.hub);

    // Rim
    const rimGeo = new THREE.TorusGeometry(this.wheelRadius, 0.05, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      metalness: 0.6,
      roughness: 0.4,
    });
    this.rim = new THREE.Mesh(rimGeo, rimMat);
    this.rim.renderOrder = -1;
    this.wheelGroup.add(this.rim);

    // COM marker
    const comGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const comMat = new THREE.MeshBasicMaterial({
      color: COM_COLOR,
      transparent: true,
      opacity: 0.9,
    });
    this.comMarker = new THREE.Mesh(comGeo, comMat);
    this.comMarker.renderOrder = 10;
    this.scene.add(this.comMarker);

    // Drip indicator
    const dripGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const dripMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.8,
    });
    this.dripIndicator = new THREE.Mesh(dripGeo, dripMat);
    this.dripIndicator.position.set(0, 2.5, 0);
    this.scene.add(this.dripIndicator);

    this.renderLoop();
  }

  private ensureBuckets(count: number): void {
    while (this.bucketVisuals.length > count) {
      const bv = this.bucketVisuals.pop()!;
      this.wheelGroup.remove(bv.group);
    }

    while (this.bucketVisuals.length < count) {
      const group = new THREE.Group();

      const bucketMat = new THREE.MeshStandardMaterial({
        color: BUCKET_COLOR,
        metalness: 0.3,
        roughness: 0.6,
      });

      // Bottom
      const bottom = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.03, 0.34),
        bucketMat.clone()
      );
      bottom.position.y = -0.14;
      group.add(bottom);

      // Back wall
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.28, 0.03),
        bucketMat.clone()
      );
      back.position.z = -0.165;
      group.add(back);

      // Left wall
      const left = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.28, 0.33),
        bucketMat.clone()
      );
      left.position.x = -0.165;
      group.add(left);

      // Right wall
      const right = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.28, 0.33),
        bucketMat.clone()
      );
      right.position.x = 0.165;
      group.add(right);

      // Front wall (transparent)
      const frontMat = new THREE.MeshStandardMaterial({
        color: BUCKET_COLOR,
        transparent: true,
        opacity: 0.1,
      });
      const front = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.28, 0.03),
        frontMat
      );
      front.position.z = 0.165;
      group.add(front);

      // Water
      const waterGeo = new THREE.BoxGeometry(0.3, 0.25, 0.3);
      const waterMat = new THREE.MeshStandardMaterial({
        color: WATER_COLOR,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(0x1a8fb5),
        emissiveIntensity: 0.1,
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.y = -0.14;
      water.scale.y = 0;
      group.add(water);

      this.wheelGroup.add(group);
      this.bucketVisuals.push({ group, water });
    }
  }

  update(state: unknown): void {
    const s = state as MalkusState;
    if (!s?.buckets) return;

    this.ensureBuckets(s.buckets.length);

    // Rotate wheel
    this.wheelGroup.rotation.z = s.theta;

    // Find max mass for scaling
    let maxMass = 0;
    for (const b of s.buckets) {
      if (b.mass > maxMass) maxMass = b.mass;
    }

    let comX = 0;
    let comY = 0;
    let totalMass = 0;

    for (let i = 0; i < s.buckets.length; i++) {
      const bucket = s.buckets[i];
      const bv = this.bucketVisuals[i];

      // Position bucket on wheel
      const angle = bucket.angle + s.theta;
      const bx = this.wheelRadius * Math.sin(angle);
      const by = -this.wheelRadius * Math.cos(angle);
      bv.group.position.set(bx, by, 0);

      // Keep bucket upright (counter-rotate against wheel)
      bv.group.rotation.z = -s.theta;

      // Water level
      const waterScale = maxMass > 0 ? bucket.mass / maxMass : 0;
      bv.water.scale.y = waterScale;
      bv.water.position.y = -0.14 + waterScale * 0.125;

      // COM calculation
      comX += bx * bucket.mass;
      comY += by * bucket.mass;
      totalMass += bucket.mass;
    }

    // Update COM marker
    if (totalMass > 0) {
      comX /= totalMass;
      comY /= totalMass;
    }
    this.comMarker.position.set(comX, comY, 0);

    // COM trail
    this.comTrail.push(new THREE.Vector3(comX, comY, 0));
    if (this.comTrail.length > 500) this.comTrail.shift();
    this.updateComTrail();

    // Spawn droplets
    if (Math.random() < 0.4 && this.droplets.length < 50) {
      this.spawnDroplet();
    }
    this.updateDroplets();
  }

  private updateComTrail(): void {
    if (this.comLine) {
      this.scene.remove(this.comLine);
      this.comLine.geometry.dispose();
      (this.comLine.material as THREE.Material).dispose();
      this.comLine = null;
    }
    if (this.comTrail.length > 2) {
      const geo = new THREE.BufferGeometry().setFromPoints(this.comTrail);
      const mat = new THREE.LineBasicMaterial({
        color: COM_COLOR,
        transparent: true,
        opacity: 0.6,
      });
      this.comLine = new THREE.Line(geo, mat);
      this.scene.add(this.comLine);
    }
  }

  private spawnDroplet(): void {
    const geo = new THREE.SphereGeometry(0.04, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: WATER_COLOR,
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color(WATER_COLOR),
      emissiveIntensity: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 0.15,
      2.5,
      (Math.random() - 0.5) * 0.15
    );
    this.scene.add(mesh);
    this.droplets.push({ mesh, vy: 0, life: 120 });
  }

  private updateDroplets(): void {
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.vy -= 0.003;
      d.mesh.position.y += d.vy;
      d.life--;

      if (d.life < 30) {
        (d.mesh.material as THREE.MeshStandardMaterial).opacity =
          d.life / 30 * 0.9;
      }

      if (d.life <= 0 || d.mesh.position.y < -3) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this.droplets.splice(i, 1);
      }
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
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.renderLoopId);
    this.controls.dispose();

    for (const bv of this.bucketVisuals) {
      this.wheelGroup.remove(bv.group);
    }
    this.bucketVisuals = [];

    for (const d of this.droplets) {
      this.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      (d.mesh.material as THREE.Material).dispose();
    }
    this.droplets = [];

    if (this.comLine) {
      this.scene.remove(this.comLine);
      this.comLine.geometry.dispose();
      (this.comLine.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
