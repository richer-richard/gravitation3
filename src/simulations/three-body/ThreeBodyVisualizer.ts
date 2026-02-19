import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { SimulationVisualizer } from "../SimulationManager";

interface Body {
  position: number[];
  velocity: number[];
  mass: number;
  color: number;
  name: string;
}

interface ThreeBodyState {
  bodies: Body[];
  time: number;
  energy: number;
  momentum: number[];
  entropy: number;
  collisions: unknown[];
}

interface BodyVisual {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  trail: {
    positions: THREE.Vector3[];
    geometry: THREE.BufferGeometry;
    line: THREE.Line;
    positionArray: Float32Array;
  };
  arrow: THREE.ArrowHelper;
}

const TRAIL_LENGTH = 2000;
const BG_COLOR = 0x0a0e27;
const BODY_RADIUS = 0.15;
const GLOW_RADIUS = 0.25;

export class ThreeBodyVisualizer implements SimulationVisualizer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container!: HTMLElement;
  private bodyVisuals: BodyVisual[] = [];
  private starfield: THREE.Points | null = null;
  private grid: THREE.GridHelper | null = null;
  private showTrails = true;
  private showVelocities = false;
  private renderLoopId = 0;
  private collisionEffects: {
    particles: THREE.Mesh[];
    velocities: THREE.Vector3[];
    lifetime: number;
    ring: THREE.Mesh | null;
    ringLife: number;
  }[] = [];

  init(container: HTMLElement): void {
    this.container = container;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    this.camera.position.set(0, 3, 8);
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
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const p1 = new THREE.PointLight(0xffffff, 1, 100);
    p1.position.set(10, 10, 10);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0x4488ff, 0.5, 100);
    p2.position.set(-10, -10, -10);
    this.scene.add(p2);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;

    // Grid
    this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.grid.material = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.2,
    });
    this.scene.add(this.grid);

    // Starfield
    this.createStarfield();

    // Render loop
    this.renderLoop();
  }

  private createStarfield(): void {
    const layers = [
      { count: 1200, minR: 200, maxR: 400 },
      { count: 1500, minR: 400, maxR: 800 },
      { count: 2000, minR: 800, maxR: 1400 },
    ];
    const positions: number[] = [];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const r = layer.minR + Math.random() * (layer.maxR - layer.minR);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);
  }

  private ensureBodies(bodies: Body[]): void {
    // Remove excess
    while (this.bodyVisuals.length > bodies.length) {
      const bv = this.bodyVisuals.pop()!;
      this.scene.remove(bv.mesh);
      this.scene.remove(bv.trail.line);
      this.scene.remove(bv.arrow);
      bv.mesh.geometry.dispose();
      (bv.mesh.material as THREE.Material).dispose();
      bv.glow.geometry.dispose();
      (bv.glow.material as THREE.Material).dispose();
      bv.trail.geometry.dispose();
      (bv.trail.line.material as THREE.Material).dispose();
    }

    // Add missing
    while (this.bodyVisuals.length < bodies.length) {
      const idx = this.bodyVisuals.length;
      const body = bodies[idx];
      const color = new THREE.Color(body.color);

      // Main sphere
      const geo = new THREE.SphereGeometry(BODY_RADIUS, 32, 32);
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        shininess: 100,
        specular: new THREE.Color(0xffffff),
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Glow
      const glowGeo = new THREE.SphereGeometry(GLOW_RADIUS, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glow);
      this.scene.add(mesh);

      // Trail
      const posArr = new Float32Array(TRAIL_LENGTH * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(posArr, 3)
      );
      trailGeo.setDrawRange(0, 0);
      const trailMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(trailGeo, trailMat);
      this.scene.add(line);

      // Velocity arrow
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(),
        1,
        body.color,
        0.2,
        0.1
      );
      arrow.visible = this.showVelocities;
      this.scene.add(arrow);

      this.bodyVisuals.push({
        mesh,
        glow,
        trail: {
          positions: [],
          geometry: trailGeo,
          line,
          positionArray: posArr,
        },
        arrow,
      });
    }
  }

  update(state: unknown): void {
    const s = state as ThreeBodyState;
    if (!s?.bodies) return;

    this.ensureBodies(s.bodies);

    for (let i = 0; i < s.bodies.length; i++) {
      const body = s.bodies[i];
      const bv = this.bodyVisuals[i];
      const [x, y, z] = body.position;

      // Update position
      bv.mesh.position.set(x, y, z);

      // Update trail
      const trail = bv.trail;
      trail.positions.push(new THREE.Vector3(x, y, z));
      if (trail.positions.length > TRAIL_LENGTH) trail.positions.shift();

      if (this.showTrails) {
        for (let j = 0; j < trail.positions.length; j++) {
          const p = trail.positions[j];
          trail.positionArray[j * 3] = p.x;
          trail.positionArray[j * 3 + 1] = p.y;
          trail.positionArray[j * 3 + 2] = p.z;
        }
        trail.geometry.attributes.position.needsUpdate = true;
        trail.geometry.setDrawRange(0, trail.positions.length);
        trail.line.visible = true;
      } else {
        trail.line.visible = false;
      }

      // Update velocity arrow
      if (this.showVelocities && body.velocity) {
        const [vx, vy, vz] = body.velocity;
        const dir = new THREE.Vector3(vx, vy, vz);
        const len = dir.length() * 0.5;
        if (len > 0.001) {
          dir.normalize();
          bv.arrow.setDirection(dir);
          bv.arrow.setLength(len, 0.2, 0.1);
          bv.arrow.position.set(x, y, z);
          bv.arrow.visible = true;
        } else {
          bv.arrow.visible = false;
        }
      } else {
        bv.arrow.visible = false;
      }
    }

    // Handle collision effects
    this.updateCollisionEffects();
  }

  private updateCollisionEffects(): void {
    for (let i = this.collisionEffects.length - 1; i >= 0; i--) {
      const effect = this.collisionEffects[i];
      effect.lifetime--;

      for (let j = 0; j < effect.particles.length; j++) {
        const p = effect.particles[j];
        const v = effect.velocities[j];
        p.position.add(v);
        v.y -= 0.005;
        v.multiplyScalar(0.98);
        const progress = 1 - effect.lifetime / 60;
        (p.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
        p.scale.setScalar(1 - progress * 0.5);
      }

      if (effect.ring) {
        const progress = 1 - effect.ringLife / 30;
        effect.ring.scale.setScalar(1 + progress * 3);
        (effect.ring.material as THREE.MeshBasicMaterial).opacity =
          1 - progress;
        effect.ringLife--;
        if (effect.ringLife <= 0) {
          this.scene.remove(effect.ring);
          effect.ring.geometry.dispose();
          (effect.ring.material as THREE.Material).dispose();
          effect.ring = null;
        }
      }

      if (effect.lifetime <= 0) {
        for (const p of effect.particles) {
          this.scene.remove(p);
          p.geometry.dispose();
          (p.material as THREE.Material).dispose();
        }
        this.collisionEffects.splice(i, 1);
      }
    }
  }

  spawnCollisionEffect(position: THREE.Vector3, color1: number, color2: number): void {
    const particles: THREE.Mesh[] = [];
    const velocities: THREE.Vector3[] = [];
    const blendColor = new THREE.Color(color1).lerp(new THREE.Color(color2), 0.5);

    for (let i = 0; i < 50; i++) {
      const geo = new THREE.SphereGeometry(0.02, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: blendColor,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);
      particles.push(mesh);

      const speed = 0.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      velocities.push(
        new THREE.Vector3(
          speed * Math.sin(phi) * Math.cos(theta) * 0.02,
          speed * Math.sin(phi) * Math.sin(theta) * 0.02,
          speed * Math.cos(phi) * 0.02
        )
      );
    }

    // Ring
    const ringGeo = new THREE.RingGeometry(0.1, 0.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.lookAt(this.camera.position);
    this.scene.add(ring);

    this.collisionEffects.push({
      particles,
      velocities,
      lifetime: 60,
      ring,
      ringLife: 30,
    });
  }

  setShowTrails(show: boolean): void {
    this.showTrails = show;
  }

  setShowVelocities(show: boolean): void {
    this.showVelocities = show;
  }

  clearTrails(): void {
    for (const bv of this.bodyVisuals) {
      bv.trail.positions.length = 0;
      bv.trail.geometry.setDrawRange(0, 0);
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
    if (this.starfield) {
      this.starfield.rotation.y += 0.0001;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.renderLoopId);
    this.controls.dispose();

    for (const bv of this.bodyVisuals) {
      this.scene.remove(bv.mesh);
      this.scene.remove(bv.trail.line);
      this.scene.remove(bv.arrow);
      bv.mesh.geometry.dispose();
      (bv.mesh.material as THREE.Material).dispose();
      bv.glow.geometry.dispose();
      (bv.glow.material as THREE.Material).dispose();
      bv.trail.geometry.dispose();
      (bv.trail.line.material as THREE.Material).dispose();
    }
    this.bodyVisuals = [];

    for (const effect of this.collisionEffects) {
      for (const p of effect.particles) {
        this.scene.remove(p);
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      }
      if (effect.ring) {
        this.scene.remove(effect.ring);
        effect.ring.geometry.dispose();
        (effect.ring.material as THREE.Material).dispose();
      }
    }
    this.collisionEffects = [];

    if (this.starfield) {
      this.scene.remove(this.starfield);
      this.starfield.geometry.dispose();
      (this.starfield.material as THREE.Material).dispose();
    }
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      (this.grid.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
