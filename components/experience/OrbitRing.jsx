"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ringVertexShader, softPointFragmentShader } from "./shaders/particles";
import { createRng } from "./shapes";

/** A comet-like trail orbiting the glyph along a tilted ellipse. */
const OrbitRing = forwardRef(function OrbitRing(
  { count = 2000, radii = [1.55, 1.55], speed = 0.32, size = 20, reducedMotion = false },
  ref
) {
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rng = createRng(77);
    const data = new Float32Array(count * 4);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      data[i * 4] = rng() * Math.PI * 2;
      data[i * 4 + 1] = (rng() - 0.5) * 0.035 * (1 + rng() * 2);
      data[i * 4 + 2] = (rng() - 0.5) * 0.03;
      data[i * 4 + 3] = rng();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aData", new THREE.BufferAttribute(data, 4));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringVertexShader,
        fragmentShader: softPointFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: size },
          uOpacity: { value: 0 },
          uSpeed: { value: speed },
          uRadii: { value: new THREE.Vector2(radii[0], radii[1]) },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  useImperativeHandle(ref, () => ({
    setOpacity(value, duration = 1.2) {
      gsap.to(material.uniforms.uOpacity, {
        value,
        duration: reducedMotion ? 0 : duration,
        ease: "power2.out",
        overwrite: true,
      });
    },
  }));

  useFrame((_, delta) => {
    if (!reducedMotion) material.uniforms.uTime.value += Math.min(delta, 1 / 20);
    material.uniforms.uPixelRatio.value = dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
});

export default OrbitRing;
