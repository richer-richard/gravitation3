import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useEffect, useRef, useMemo } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { AttractorRenderer } from "@/renderers/AttractorRenderer";
import { DiscreteMapRenderer } from "@/renderers/DiscreteMapRenderer";
import { MultiBodyRenderer } from "@/renderers/MultiBodyRenderer";
import { CFDRenderer } from "@/renderers/CFDRenderer";
import { ChemBioRenderer } from "@/renderers/ChemBioRenderer";

// Which renderer to use for each model (by ID, not output kind)
const MODEL_RENDERERS: Record<string, React.FC> = {
  // Attractors
  lorenz: AttractorRenderer,
  rossler: AttractorRenderer,
  aizawa: AttractorRenderer,
  thomas: AttractorRenderer,
  chua: AttractorRenderer,
  // Discrete Maps
  logistic: DiscreteMapRenderer,
  henon: DiscreteMapRenderer,
  ikeda: DiscreteMapRenderer,
  tinkerbell: DiscreteMapRenderer,
  standard_map: DiscreteMapRenderer,
  // Multi-Body
  double_pendulum: MultiBodyRenderer,
  three_body: MultiBodyRenderer,
  malkus_waterwheel: AttractorRenderer,
  duffing: DiscreteMapRenderer,
  // CFD
  lid_driven: CFDRenderer,
  rayleigh_benard: CFDRenderer,
  karman_vortex: CFDRenderer,
  couette: CFDRenderer,
  // ChemBio
  bz_reaction: ChemBioRenderer,
  lotka_volterra: AttractorRenderer,
};

// Camera presets per model
const CAMERA_PRESETS: Record<
  string,
  { position: [number, number, number]; target?: [number, number, number]; fov?: number }
> = {
  lorenz: { position: [40, 30, 40], target: [0, 0, 25], fov: 50 },
  rossler: { position: [20, 20, 15], target: [0, 0, 0], fov: 50 },
  aizawa: { position: [0, 3, 3], target: [0, 0, 0], fov: 45 },
  thomas: { position: [5, 5, 5], target: [0, 0, 0], fov: 50 },
  chua: { position: [5, 5, 5], target: [0, 0, 0], fov: 50 },
  logistic: { position: [3.25, 0.5, 5], target: [3.25, 0.5, 0], fov: 35 },
  henon: { position: [0, 0, 5], target: [0, 0, 0], fov: 40 },
  ikeda: { position: [1, 0, 5], target: [1, 0, 0], fov: 40 },
  tinkerbell: { position: [-0.3, -0.3, 3], target: [-0.3, -0.3, 0], fov: 40 },
  standard_map: { position: [0.5, 0.5, 3], target: [0.5, 0.5, 0], fov: 40 },
  double_pendulum: { position: [0, -1, 8], target: [0, -1, 0], fov: 35 },
  three_body: { position: [0, 0, 8], target: [0, 0, 0], fov: 40 },
  malkus_waterwheel: { position: [10, 10, 10], target: [0, 0, 0], fov: 50 },
  duffing: { position: [0, 0, 8], target: [0, 0, 0], fov: 40 },
  lid_driven: { position: [0, 0, 5], target: [0, 0, 0], fov: 40 },
  rayleigh_benard: { position: [0, 0, 5], target: [0, 0, 0], fov: 40 },
  karman_vortex: { position: [0, 0, 5], target: [0, 0, 0], fov: 40 },
  couette: { position: [0, 0, 5], target: [0, 0, 0], fov: 40 },
  bz_reaction: { position: [0, 0, 5], target: [0, 0, 0], fov: 40 },
  lotka_volterra: { position: [3, 3, 3], target: [1, 1, 1], fov: 50 },
};

function OrbitControlsWrapper({ target }: { target: [number, number, number] }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(...target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.5;
    controls.update();
    controlsRef.current = controls;
    return () => controls.dispose();
  }, [camera, gl, target]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

function SceneContent() {
  const activeModelId = useSimulationStore((s) => s.activeModelId);
  if (!activeModelId) return null;

  const Renderer = MODEL_RENDERERS[activeModelId];
  if (!Renderer) return null;

  return <Renderer />;
}

export function Viewport() {
  const activeModelId = useSimulationStore((s) => s.activeModelId);

  const preset = activeModelId
    ? CAMERA_PRESETS[activeModelId] ?? { position: [10, 10, 10] as [number, number, number], fov: 50 }
    : { position: [10, 10, 10] as [number, number, number], fov: 50 };

  return (
    <Canvas
      key={activeModelId ?? "empty"}
      camera={{
        position: preset.position,
        fov: preset.fov ?? 50,
        near: 0.01,
        far: 2000,
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "#000000" }}
    >
      <ambientLight intensity={0.2} />
      <pointLight position={[20, 20, 20]} intensity={0.4} />

      <OrbitControlsWrapper target={preset.target ?? [0, 0, 0]} />
      <SceneContent />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
