"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { dustVertexShader, softPointFragmentShader } from "./shaders/particles";
import { createRng } from "./shapes";

/** Deep background field: slow drift, twinkle, scroll and pointer parallax. */
export default function StarDust({ count = 2000, pointer, reducedMotion = false }) {
  const group = useRef(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rng = createRng(99);
    const pos = new Float32Array(count * 3);
    const random = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng() - 0.5) * 18;
      pos[i * 3 + 1] = rng() * 12;
      pos[i * 3 + 2] = -1 - rng() * 9;
      for (let k = 0; k < 4; k++) random[i * 4 + k] = rng();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aRandom", new THREE.BufferAttribute(random, 4));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVertexShader,
        fragmentShader: softPointFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: 17 },
          uOpacity: { value: 0.75 },
          uScroll: { value: 0 },
        },
      }),
    []
  );

  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  useFrame((_, delta) => {
    const u = material.uniforms;
    const dt = Math.min(delta, 1 / 20);
    if (!reducedMotion) u.uTime.value += dt;
    u.uPixelRatio.value = dpr;
    u.uScroll.value = window.scrollY / Math.max(1, window.innerHeight) * 0.35;
    if (group.current && pointer && !reducedMotion) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, pointer.nx * 0.05, 2, dt);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -pointer.ny * 0.03, 2, dt);
    }
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
