import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useSimulationStore } from "@/store/simulation-store";
import { CATEGORY_COLORS } from "@/types/simulation";

const MAX_POINTS = 200000;

export function DiscreteMapRenderer() {
  const frameData = useSimulationStore((s) => s.frameData);
  const frameHeader = useSimulationStore((s) => s.frameHeader);
  const category = useSimulationStore((s) => s.category);

  const accent = category ? CATEGORY_COLORS[category] : "#a78bfa";

  // Pre-allocate buffers
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

  // Points material: tiny dots, no size attenuation for 2D scatter feel
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 1.5,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    []
  );

  useEffect(() => {
    if (!frameData || !frameHeader) return;

    const comps = frameHeader.components;
    if (comps < 2) return;

    const data = frameData as Float32Array;
    const totalPts = Math.floor(data.length / comps);
    const count = Math.min(totalPts, MAX_POINTS);
    if (count === 0) return;

    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;

    const accentColor = new THREE.Color(accent);

    for (let i = 0; i < count; i++) {
      const srcIdx = i * comps;
      const dstIdx = i * 3;

      positions[dstIdx] = data[srcIdx];
      positions[dstIdx + 1] = data[srcIdx + 1];
      positions[dstIdx + 2] = 0;

      // Newer points are brighter and more saturated
      const t = i / (count - 1 || 1);
      const alpha = 0.15 + t * 0.85;

      // Slightly shift hue from cool to warm for older→newer
      colors[i * 4] = accentColor.r * (0.3 + 0.7 * t);
      colors[i * 4 + 1] = accentColor.g * (0.3 + 0.7 * t);
      colors[i * 4 + 2] = accentColor.b * (0.3 + 0.7 * t);
      colors[i * 4 + 3] = alpha;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geometry.setDrawRange(0, count);
  }, [frameData, frameHeader, accent, geometry, positionAttr, colorAttr]);

  return <points geometry={geometry} material={material} />;
}
