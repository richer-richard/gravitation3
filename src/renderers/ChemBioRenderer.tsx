import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useSimulationStore } from "@/store/simulation-store";
import { OutputKind } from "@/types/simulation";

// Chemical colormap: deep blue -> teal -> amber -> crimson
// 12 control points for a rich, organic-feeling palette
const CHEM_CTRL: [number, number, number][] = [
  [0.020, 0.015, 0.120], // deep navy
  [0.030, 0.060, 0.200], // dark blue
  [0.040, 0.130, 0.280], // medium blue
  [0.050, 0.230, 0.340], // blue-teal
  [0.080, 0.360, 0.370], // teal
  [0.180, 0.480, 0.340], // green-teal
  [0.380, 0.560, 0.260], // olive-green
  [0.580, 0.600, 0.160], // yellow-green
  [0.760, 0.580, 0.100], // amber
  [0.880, 0.440, 0.080], // dark amber
  [0.920, 0.280, 0.090], // orange-red
  [0.820, 0.130, 0.110], // crimson
];

// Pre-bake 256-entry LUT
const CHEM_LUT = new Uint8Array(256 * 3);
{
  const n = CHEM_CTRL.length;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const idx = t * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, n - 1);
    const f = idx - lo;
    CHEM_LUT[i * 3] = Math.round(
      (CHEM_CTRL[lo][0] + f * (CHEM_CTRL[hi][0] - CHEM_CTRL[lo][0])) * 255
    );
    CHEM_LUT[i * 3 + 1] = Math.round(
      (CHEM_CTRL[lo][1] + f * (CHEM_CTRL[hi][1] - CHEM_CTRL[lo][1])) * 255
    );
    CHEM_LUT[i * 3 + 2] = Math.round(
      (CHEM_CTRL[lo][2] + f * (CHEM_CTRL[hi][2] - CHEM_CTRL[lo][2])) * 255
    );
  }
}

export function ChemBioRenderer() {
  const frameData = useSimulationStore((s) => s.frameData);
  const frameHeader = useSimulationStore((s) => s.frameHeader);
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  const meshRef = useRef<THREE.Mesh>(null!);
  const textureRef = useRef<THREE.DataTexture | null>(null);
  const texDataRef = useRef<Uint8Array | null>(null);

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

    // Lotka-Volterra uses Particles3D output kind -- return null and let
    // Viewport fall through to AttractorRenderer
    if (activeModelId === "lotka_volterra") return;

    // Only handle Field2D (BZ reaction)
    if (frameHeader.outputKind !== OutputKind.Field2D) return;

    const data = frameData as Float32Array;
    const totalCells = frameHeader.elementCount;
    const components = frameHeader.components; // 2 for BZ (u, v)
    const gridSize = Math.round(Math.sqrt(totalCells));

    if (gridSize < 2 || gridSize * gridSize !== totalCells) return;
    if (data.length < totalCells * components) return;

    // Allocate texture buffer
    if (!texDataRef.current || texDataRef.current.length !== gridSize * gridSize * 4) {
      texDataRef.current = new Uint8Array(gridSize * gridSize * 4);
    }
    const texData = texDataRef.current;

    // For BZ: use the first component (u concentration) for color mapping
    // Also blend in v for luminance variation
    let maxU = -Infinity;
    let minU = Infinity;
    for (let i = 0; i < totalCells; i++) {
      const u = data[i * components];
      if (isFinite(u)) {
        if (u > maxU) maxU = u;
        if (u < minU) minU = u;
      }
    }
    if (!isFinite(minU)) minU = 0;
    if (!isFinite(maxU) || maxU <= minU) maxU = minU + 0.001;

    const rangeU = maxU - minU;

    for (let i = 0; i < totalCells; i++) {
      const u = data[i * components];
      const v = components >= 2 ? data[i * components + 1] : 0;

      // Normalize u to [0,1]
      const tU = isFinite(u) ? Math.max(0, Math.min(1, (u - minU) / rangeU)) : 0;

      // Use v to slightly modulate brightness (subtle effect)
      const vMod = isFinite(v) ? Math.max(0.7, Math.min(1.3, 0.7 + v * 0.6)) : 1.0;

      const lutIdx = Math.round(tU * 255) * 3;
      texData[i * 4] = Math.min(255, Math.round(CHEM_LUT[lutIdx] * vMod));
      texData[i * 4 + 1] = Math.min(255, Math.round(CHEM_LUT[lutIdx + 1] * vMod));
      texData[i * 4 + 2] = Math.min(255, Math.round(CHEM_LUT[lutIdx + 2] * vMod));
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
      const img = textureRef.current.image as unknown as { data: Uint8Array };
      img.data.set(texData);
      textureRef.current.needsUpdate = true;
    }
  }, [frameData, frameHeader, activeModelId, planeMat]);

  // Cleanup
  useEffect(() => {
    return () => {
      textureRef.current?.dispose();
      planeGeo.dispose();
      planeMat.dispose();
    };
  }, [planeGeo, planeMat]);

  // Lotka-Volterra uses attractor renderer -- return null
  if (activeModelId === "lotka_volterra") return null;

  // Only render if we have field data
  if (!frameHeader || frameHeader.outputKind !== OutputKind.Field2D) return null;

  return (
    <mesh ref={meshRef} geometry={planeGeo} material={planeMat} />
  );
}
