"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ringVertexShader, softPointFragmentShader } from "./shaders/particles";
import { createRng } from "./shapes";

/**
 * A comet-like trail orbiting the glyph along a tilted ellipse.
 * It is born from scattered particles (`form`) and can dissolve back.
 */
const OrbitRing = forwardRef(function OrbitRing(
  { count = 2000, radii = [1.55, 1.55], speed = 0.32, size = 20, reducedMotion = false },
  ref
) {
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rng = createRng(77);
    const data = new Float32Array(count * 4);
    const pos = new Float32Array(count * 3);
    const from = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      data[i * 4] = rng() * Math.PI * 2;
      data[i * 4 + 1] = (rng() - 0.5) * 0.035 * (1 + rng() * 2);
      data[i * 4 + 2] = (rng() - 0.5) * 0.03;
      data[i * 4 + 3] = rng();
      // Scattered origin: a deep shell around the glyph, like the glyph's own particles.
      const u = rng() * 2 - 1;
      const th = rng() * Math.PI * 2;
      const rad = 2.2 + Math.pow(rng(), 0.7) * 2.8;
      const sq = Math.sqrt(1 - u * u);
      from[i * 3] = rad * sq * Math.cos(th);
      from[i * 3 + 1] = rad * u * 0.7;
      from[i * 3 + 2] = rad * sq * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aData", new THREE.BufferAttribute(data, 4));
    geo.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringVertexShader,
        fragmentShader: softPointFragmentShader,
        transparent: true,
        depthWrite: false,
        // Depth-tested so the glyph occluder can hide the far side of the orbit.
        depthTest: true,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: size },
          uOpacity: { value: 0 },
          uSpeed: { value: speed },
          uRadii: { value: new THREE.Vector2(radii[0], radii[1]) },
          uForm: { value: reducedMotion ? 1 : 0 },
          uStagger: { value: 2.6 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  useImperativeHandle(ref, () => ({
    /** Set the formation directly (scroll-driven): 0 = scattered, 1 = drawn. */
    setForm(value) {
      gsap.killTweensOf(material.uniforms.uForm);
      material.uniforms.uForm.value = reducedMotion ? (value > 0.5 ? 1 : 0) : value;
    },
    /** Draw the ring (1) or dissolve it back into scattered particles (0). */
    form(value, { duration = 2.8, delay = 0 } = {}) {
      const u = material.uniforms.uForm;
      if (reducedMotion) {
        gsap.killTweensOf(u);
        u.value = value;
        return;
      }
      gsap.to(u, { value, duration, delay, ease: value > u.value ? "power1.inOut" : "power2.in", overwrite: true });
    },
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
