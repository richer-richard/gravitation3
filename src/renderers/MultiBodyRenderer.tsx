import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/store/simulation-store";
import { CATEGORY_COLORS } from "@/types/simulation";

const MAX_TRAIL = 10000;

// Body colors for three-body problem
const BODY_COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d"];

// Helper: create a trail geometry + line object
function createTrail(color: string) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_TRAIL * 3);
  const col = new Float32Array(MAX_TRAIL * 4);
  const posAttr = new THREE.BufferAttribute(pos, 3);
  const colAttr = new THREE.BufferAttribute(col, 4);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  colAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("color", colAttr);
  geo.setDrawRange(0, 0);

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const line = new THREE.Line(geo, mat);

  return { geo, posAttr, colAttr, mat, line, color: new THREE.Color(color) };
}

// Fill trail buffer from flat xy data
function fillTrail2D(
  trail: ReturnType<typeof createTrail>,
  data: Float32Array,
  offset: number,
  count: number
) {
  const positions = trail.posAttr.array as Float32Array;
  const colors = trail.colAttr.array as Float32Array;
  const c = trail.color;

  const pts = Math.min(count, MAX_TRAIL);
  for (let i = 0; i < pts; i++) {
    const srcIdx = offset + i * 2;
    if (srcIdx + 1 >= data.length) break;

    positions[i * 3] = data[srcIdx];
    positions[i * 3 + 1] = data[srcIdx + 1];
    positions[i * 3 + 2] = 0;

    const t = i / (pts - 1 || 1);
    const tSq = t * t;
    colors[i * 4] = c.r * (0.15 + 0.85 * tSq);
    colors[i * 4 + 1] = c.g * (0.15 + 0.85 * tSq);
    colors[i * 4 + 2] = c.b * (0.15 + 0.85 * tSq);
    colors[i * 4 + 3] = 0.05 + tSq * 0.95;
  }

  trail.posAttr.needsUpdate = true;
  trail.colAttr.needsUpdate = true;
  trail.geo.setDrawRange(0, pts);
}

// Fill trail buffer from flat xyz data
function fillTrail3D(
  trail: ReturnType<typeof createTrail>,
  data: Float32Array,
  offset: number,
  count: number
) {
  const positions = trail.posAttr.array as Float32Array;
  const colors = trail.colAttr.array as Float32Array;
  const c = trail.color;

  const pts = Math.min(count, MAX_TRAIL);
  for (let i = 0; i < pts; i++) {
    const srcIdx = offset + i * 3;
    if (srcIdx + 2 >= data.length) break;

    positions[i * 3] = data[srcIdx];
    positions[i * 3 + 1] = data[srcIdx + 1];
    positions[i * 3 + 2] = data[srcIdx + 2];

    const t = i / (pts - 1 || 1);
    const tSq = t * t;
    colors[i * 4] = c.r * (0.15 + 0.85 * tSq);
    colors[i * 4 + 1] = c.g * (0.15 + 0.85 * tSq);
    colors[i * 4 + 2] = c.b * (0.15 + 0.85 * tSq);
    colors[i * 4 + 3] = 0.05 + tSq * 0.95;
  }

  trail.posAttr.needsUpdate = true;
  trail.colAttr.needsUpdate = true;
  trail.geo.setDrawRange(0, pts);
}

// ─── Double Pendulum sub-renderer ───────────────────────────────────────────

function DoublePendulumScene() {
  const frameData = useSimulationStore((s) => s.frameData);
  const frameHeader = useSimulationStore((s) => s.frameHeader);

  const pivotRef = useRef<THREE.Mesh>(null!);
  const body1Ref = useRef<THREE.Mesh>(null!);
  const body2Ref = useRef<THREE.Mesh>(null!);
  const rod1Ref = useRef<THREE.Mesh>(null!);
  const rod2Ref = useRef<THREE.Mesh>(null!);

  const trail = useMemo(() => createTrail("#f857a6"), []);

  // Rod geometry (thin cylinder, reused)
  const rodGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 1, 8), []);

  useEffect(() => {
    if (!frameData || !frameHeader) return;
    const data = frameData as Float32Array;
    if (data.length < 7) return;

    const x1 = data[0],
      y1 = data[1];
    const x2 = data[2],
      y2 = data[3];
    // data[4]=theta1, data[5]=theta2
    const trailCount = Math.floor(data[6]);

    // Position bodies
    if (body1Ref.current) body1Ref.current.position.set(x1, y1, 0);
    if (body2Ref.current) body2Ref.current.position.set(x2, y2, 0);

    // Position rod 1: from pivot(0,0) to body1
    if (rod1Ref.current) {
      const len1 = Math.sqrt(x1 * x1 + y1 * y1);
      rod1Ref.current.scale.set(1, len1, 1);
      rod1Ref.current.position.set(x1 / 2, y1 / 2, 0);
      rod1Ref.current.rotation.z = Math.atan2(x1, y1) * -1;
    }

    // Position rod 2: from body1 to body2
    if (rod2Ref.current) {
      const dx = x2 - x1,
        dy = y2 - y1;
      const len2 = Math.sqrt(dx * dx + dy * dy);
      rod2Ref.current.scale.set(1, len2, 1);
      rod2Ref.current.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      rod2Ref.current.rotation.z = Math.atan2(dx, dy) * -1;
    }

    // Trail (tip of second pendulum)
    fillTrail2D(trail, data, 7, trailCount);
  }, [frameData, frameHeader, trail]);

  return (
    <>
      {/* Pivot */}
      <mesh ref={pivotRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#666" />
      </mesh>

      {/* Rod 1 */}
      <mesh ref={rod1Ref} geometry={rodGeo}>
        <meshBasicMaterial color="#555" transparent opacity={0.6} />
      </mesh>

      {/* Body 1 */}
      <mesh ref={body1Ref}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color="#4ecdc4"
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Rod 2 */}
      <mesh ref={rod2Ref} geometry={rodGeo}>
        <meshBasicMaterial color="#444" transparent opacity={0.6} />
      </mesh>

      {/* Body 2 */}
      <mesh ref={body2Ref}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color="#f857a6"
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Trail */}
      <primitive object={trail.line} />
    </>
  );
}

// ─── Three Body sub-renderer ────────────────────────────────────────────────

function ThreeBodyScene() {
  const frameData = useSimulationStore((s) => s.frameData);
  const frameHeader = useSimulationStore((s) => s.frameHeader);

  const bodyRefs = [
    useRef<THREE.Mesh>(null!),
    useRef<THREE.Mesh>(null!),
    useRef<THREE.Mesh>(null!),
  ];

  const trails = useMemo(
    () => BODY_COLORS.map((c) => createTrail(c)),
    []
  );

  // Pulse bodies
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    bodyRefs.forEach((ref, i) => {
      if (ref.current) {
        const s = 0.1 + 0.02 * Math.sin(t * 3 + i * 2.1);
        ref.current.scale.setScalar(s / 0.1);
      }
    });
  });

  useEffect(() => {
    if (!frameData || !frameHeader) return;
    const data = frameData as Float32Array;
    if (data.length < 7) return;

    // Payload: [x1,y1, x2,y2, x3,y3, trail_count, ...trail_data]
    for (let b = 0; b < 3; b++) {
      const x = data[b * 2];
      const y = data[b * 2 + 1];
      if (bodyRefs[b].current) {
        bodyRefs[b].current.position.set(x, y, 0);
      }
    }

    const trailCount = Math.floor(data[6]);

    // Each trail has trailCount xy pairs, concatenated: trail0 then trail1 then trail2
    const trailStart = 7;
    for (let b = 0; b < 3; b++) {
      const offset = trailStart + b * trailCount * 2;
      fillTrail2D(trails[b], data, offset, trailCount);
    }
  }, [frameData, frameHeader, trails]);

  return (
    <>
      {BODY_COLORS.map((color, i) => (
        <mesh key={i} ref={bodyRefs[i]}>
          <sphereGeometry args={[0.1, 20, 20]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.95}
          />
        </mesh>
      ))}
      {trails.map((t, i) => (
        <primitive key={i} object={t.line} />
      ))}
    </>
  );
}

// ─── Generic attractor-style trail fallback (malkus, duffing) ───────────────

function GenericTrailScene() {
  const frameData = useSimulationStore((s) => s.frameData);
  const frameHeader = useSimulationStore((s) => s.frameHeader);
  const category = useSimulationStore((s) => s.category);

  const accent = category ? CATEGORY_COLORS[category] : "#f857a6";
  const trail = useMemo(() => createTrail(accent), [accent]);

  useEffect(() => {
    if (!frameData || !frameHeader) return;
    const data = frameData as Float32Array;
    const comps = frameHeader.components;
    const count = Math.floor(data.length / comps);

    if (comps >= 3) {
      fillTrail3D(trail, data, 0, count);
    } else if (comps >= 2) {
      fillTrail2D(trail, data, 0, count);
    }
  }, [frameData, frameHeader, trail]);

  return <primitive object={trail.line} />;
}

// ─── Main export ────────────────────────────────────────────────────────────

export function MultiBodyRenderer() {
  const activeModelId = useSimulationStore((s) => s.activeModelId);

  if (activeModelId === "double_pendulum") return <DoublePendulumScene />;
  if (activeModelId === "three_body") return <ThreeBodyScene />;

  // malkus_waterwheel, duffing, or any other multibody model
  return <GenericTrailScene />;
}
