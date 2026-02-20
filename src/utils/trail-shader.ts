/**
 * Trail shader material with per-vertex alpha for fade-out effect.
 * Older points fade to transparent.
 */

import * as THREE from "three";

const vertexShader = `
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 color;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(color, vAlpha);
  }
`;

export function createTrailMaterial(color: THREE.Color | number): THREE.ShaderMaterial {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: c },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * Update the alpha attribute for a trail buffer geometry.
 * Points go from 0.0 (oldest) to 1.0 (newest).
 */
export function updateTrailAlpha(geometry: THREE.BufferGeometry, count: number, maxLength: number): void {
  let alphaAttr = geometry.getAttribute("alpha") as THREE.BufferAttribute | undefined;
  if (!alphaAttr || alphaAttr.count < maxLength) {
    const alphaArray = new Float32Array(maxLength);
    alphaAttr = new THREE.BufferAttribute(alphaArray, 1);
    geometry.setAttribute("alpha", alphaAttr);
  }
  const arr = alphaAttr.array as Float32Array;
  for (let i = 0; i < count; i++) {
    arr[i] = (i + 1) / count;
  }
  alphaAttr.needsUpdate = true;
}
