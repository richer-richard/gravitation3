import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/store/simulation-store";
import { CATEGORY_COLORS } from "@/types/simulation";

const MAX_POINTS = 50000;

export function AttractorRenderer() {
  const frameData = useSimulationStore((s) => s.frameData);
  const frameHeader = useSimulationStore((s) => s.frameHeader);
  const category = useSimulationStore((s) => s.category);
  const headRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  const accent = category ? CATEGORY_COLORS[category] : "#5bf0d8";

  // Pre-allocate geometry and attributes once
  const { geometry, positionAttr, colorAttr } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX_POINTS * 3);
    const col = new Float32Array(MAX_POINTS * 4);
    const posAttr = new THREE.BufferAttribute(pos, 3);
    const colAttr = new THREE.BufferAttribute(col, 4);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("color", colAttr);
    geo.setDrawRange(0, 0);
    return { geometry: geo, positionAttr: posAttr, colorAttr: colAttr };
  }, []);

  // Line material with additive glow
  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 1,
      }),
    []
  );

  // Create the THREE.Line object imperatively
  const lineObj = useMemo(
    () => new THREE.Line(geometry, lineMaterial),
    [geometry, lineMaterial]
  );

  // Update vertex data whenever a new frame arrives
  useEffect(() => {
    if (!frameData || !frameHeader) return;
    // Accept both 2-component and 3-component data
    const comps = frameHeader.components;
    if (comps !== 2 && comps !== 3) return;

    const data = frameData as Float32Array;
    const totalPts = Math.floor(data.length / comps);
    const count = Math.min(totalPts, MAX_POINTS);
    if (count === 0) return;

    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;

    const accentColor = new THREE.Color(accent);
    const tailR = 0.08;
    const tailG = 0.08;
    const tailB = 0.12;

    for (let i = 0; i < count; i++) {
      const srcIdx = i * comps;
      const dstIdx = i * 3;

      positions[dstIdx] = data[srcIdx];
      positions[dstIdx + 1] = data[srcIdx + 1];
      positions[dstIdx + 2] = comps === 3 ? data[srcIdx + 2] : 0;

      // Quadratic ramp: tail is very dim, head is bright accent
      const t = i / (count - 1 || 1);
      const tSq = t * t;
      const alpha = 0.03 + tSq * 0.97;

      colors[i * 4] = tailR + tSq * (accentColor.r - tailR);
      colors[i * 4 + 1] = tailG + tSq * (accentColor.g - tailG);
      colors[i * 4 + 2] = tailB + tSq * (accentColor.b - tailB);
      colors[i * 4 + 3] = alpha;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geometry.setDrawRange(0, count);

    // Position head sphere at newest point
    if (headRef.current && count > 0) {
      const last = (count - 1) * 3;
      headRef.current.position.set(
        positions[last],
        positions[last + 1],
        positions[last + 2]
      );
    }
    if (glowRef.current && count > 0) {
      const last = (count - 1) * 3;
      glowRef.current.position.set(
        positions[last],
        positions[last + 1],
        positions[last + 2]
      );
    }
  }, [frameData, frameHeader, accent, geometry, positionAttr, colorAttr]);

  // Subtle pulsing glow on the head sphere
  useFrame(({ clock }) => {
    if (glowRef.current) {
      const s = 0.3 + 0.1 * Math.sin(clock.getElapsedTime() * 4);
      glowRef.current.scale.setScalar(s);
    }
  });

  const headMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.95,
      }),
    [accent]
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [accent]
  );

  return (
    <>
      <primitive object={lineObj} />

      {/* Bright head dot */}
      <mesh ref={headRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <primitive object={headMat} attach="material" />
      </mesh>

      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <primitive object={glowMat} attach="material" />
      </mesh>

      {/* Subtle reference grid */}
      <gridHelper
        args={[80, 40, 0x111122, 0x080810]}
        position={[0, -25, 0]}
      />
    </>
  );
}
