import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useSimulationStore } from "@/store/simulation-store";

// Inferno colormap LUT - 256 entries for smooth gradients
// Generated from matplotlib's inferno, stored as 16 control points and sampled
const INFERNO_CTRL: [number, number, number][] = [
  [0.001462, 0.000466, 0.013866],
  [0.028063, 0.006380, 0.084891],
  [0.095953, 0.020500, 0.210480],
  [0.178962, 0.026670, 0.371758],
  [0.258234, 0.043710, 0.480284],
  [0.331326, 0.074510, 0.517933],
  [0.410113, 0.099064, 0.516532],
  [0.489898, 0.117413, 0.494877],
  [0.570068, 0.132381, 0.459474],
  [0.648280, 0.148073, 0.410756],
  [0.722892, 0.168948, 0.348210],
  [0.793228, 0.201922, 0.271584],
  [0.856037, 0.254728, 0.184545],
  [0.909344, 0.330267, 0.098702],
  [0.947594, 0.431756, 0.036442],
  [0.967516, 0.544834, 0.039050],
  [0.976690, 0.631310, 0.053230],
  [0.982257, 0.721860, 0.075353],
  [0.984876, 0.815440, 0.121503],
  [0.987622, 0.998364, 0.644924],
];

// Pre-bake a 256-entry Uint8 LUT for speed
const INFERNO_LUT = new Uint8Array(256 * 3);
{
  const n = INFERNO_CTRL.length;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const idx = t * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, n - 1);
    const f = idx - lo;
    INFERNO_LUT[i * 3] = Math.round(
      (INFERNO_CTRL[lo][0] + f * (INFERNO_CTRL[hi][0] - INFERNO_CTRL[lo][0])) * 255
    );
    INFERNO_LUT[i * 3 + 1] = Math.round(
      (INFERNO_CTRL[lo][1] + f * (INFERNO_CTRL[hi][1] - INFERNO_CTRL[lo][1])) * 255
    );
    INFERNO_LUT[i * 3 + 2] = Math.round(
      (INFERNO_CTRL[lo][2] + f * (INFERNO_CTRL[hi][2] - INFERNO_CTRL[lo][2])) * 255
    );
  }
}

export function CFDRenderer() {
  const frameData = useSimulationStore((s) => s.frameData);
  const frameHeader = useSimulationStore((s) => s.frameHeader);
  const meshRef = useRef<THREE.Mesh>(null!);
  const textureRef = useRef<THREE.DataTexture | null>(null);
  const texDataRef = useRef<Uint8Array | null>(null);

  // Plane geometry sized to 4x4 world units
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(5, 5), []);

  const planeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    if (!frameData || !frameHeader) return;

    const data = frameData as Float32Array;
    const totalCells = frameHeader.elementCount;
    const components = frameHeader.components;

    // Determine grid dimensions (square grids)
    const gridSize = Math.round(Math.sqrt(totalCells));
    if (gridSize < 2 || gridSize * gridSize !== totalCells) return;

    // Ensure we have the right amount of data
    if (data.length < totalCells * components) return;

    // Allocate texture buffer if needed
    if (!texDataRef.current || texDataRef.current.length !== gridSize * gridSize * 4) {
      texDataRef.current = new Uint8Array(gridSize * gridSize * 4);
    }
    const texData = texDataRef.current;

    // Find magnitude range for auto-normalization
    let minMag = Infinity;
    let maxMag = -Infinity;
    for (let i = 0; i < totalCells; i++) {
      const mag = data[i * components]; // First component is magnitude
      if (isFinite(mag)) {
        if (mag < minMag) minMag = mag;
        if (mag > maxMag) maxMag = mag;
      }
    }
    if (!isFinite(minMag)) minMag = 0;
    if (!isFinite(maxMag) || maxMag <= minMag) maxMag = minMag + 0.001;

    const range = maxMag - minMag;

    // Map each cell to inferno color
    for (let i = 0; i < totalCells; i++) {
      const mag = data[i * components];
      const t = isFinite(mag) ? Math.max(0, Math.min(1, (mag - minMag) / range)) : 0;
      const lutIdx = Math.round(t * 255) * 3;

      texData[i * 4] = INFERNO_LUT[lutIdx];
      texData[i * 4 + 1] = INFERNO_LUT[lutIdx + 1];
      texData[i * 4 + 2] = INFERNO_LUT[lutIdx + 2];
      texData[i * 4 + 3] = 255;
    }

    // Create or update DataTexture
    if (
      !textureRef.current ||
      textureRef.current.image.width !== gridSize ||
      textureRef.current.image.height !== gridSize
    ) {
      if (textureRef.current) textureRef.current.dispose();

      const tex = new THREE.DataTexture(
        texData,
        gridSize,
        gridSize,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      textureRef.current = tex;

      planeMat.map = tex;
      planeMat.needsUpdate = true;
    } else {
      // Update existing texture in-place
      const img = textureRef.current.image as unknown as { data: Uint8Array };
      img.data.set(texData);
      textureRef.current.needsUpdate = true;
    }
  }, [frameData, frameHeader, planeMat]);

  // Cleanup
  useEffect(() => {
    return () => {
      textureRef.current?.dispose();
      planeGeo.dispose();
      planeMat.dispose();
    };
  }, [planeGeo, planeMat]);

  return (
    <mesh ref={meshRef} geometry={planeGeo} material={planeMat} />
  );
}
