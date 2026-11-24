"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { MAX_RIPPLES, particleFragmentShader, particleVertexShader } from "./shaders/particles";
import { WAVE_SHAPES, createRng } from "./shapes";

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

const _ndc = new THREE.Vector2();
const _normal = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _plane = new THREE.Plane();
const _raycaster = new THREE.Raycaster();

/**
 * Reusable GPU particle system.
 *
 * Props
 *  - count          number of particles
 *  - shapes         { [key]: Float32Array(count * 3) } — morph targets
 *  - initialShape   key of the starting shape
 *  - pointer        mutable { nx, ny, active, lastMove } in NDC (optional)
 *  - interactive    enable cursor repulsion + ripples
 *  - reducedMotion  freezes time and makes morphs instant
 *
 * Imperative API (via ref)
 *  - morphTo(key, { duration, scatter, delay })
 *  - setOpacity(value, duration)
 *  - points       the underlying THREE.Points
 */
const ParticleSystem = forwardRef(function ParticleSystem(
  {
    count,
    shapes,
    initialShape,
    pointer,
    interactive = true,
    reducedMotion = false,
    size = 19,
    stagger = 0.6,
    radius = 0.5,
    drift = 0.01,
    seed = 5,
  },
  ref
) {
  const pointsRef = useRef(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const morphTween = useRef(null);
  const current = useRef(initialShape);

  const geometry = useMemo(() => {
    const rng = createRng(seed);
    const geo = new THREE.BufferGeometry();
    const from = new Float32Array(shapes[initialShape]);
    const to = new Float32Array(shapes[initialShape]);
    const dir = new Float32Array(count * 3);
    const random = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Random unit vector — the swirl direction while a particle is in transit.
      const u = rng() * 2 - 1;
      const th = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      dir[i * 3] = s * Math.cos(th);
      dir[i * 3 + 1] = u;
      dir[i * 3 + 2] = s * Math.sin(th);
      random[i * 4] = rng();
      random[i * 4 + 1] = rng();
      random[i * 4 + 2] = rng();
      random[i * 4 + 3] = rng();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(from, 3));
    geo.setAttribute("aTo", new THREE.BufferAttribute(to, 3));
    geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    geo.setAttribute("aRandom", new THREE.BufferAttribute(random, 4));
    return geo;
    // Shapes are generated once per count; re-creating the geometry would reset the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 1 },
          uStagger: { value: stagger },
          uScatter: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: size },
          uOpacity: { value: 0 },
          uDrift: { value: reducedMotion ? 0 : drift },
          uWaveFrom: { value: WAVE_SHAPES.has(initialShape) ? 1 : 0 },
          uWaveTo: { value: WAVE_SHAPES.has(initialShape) ? 1 : 0 },
          uPointer: { value: new THREE.Vector3(99, 99, 0) },
          uHover: { value: 0 },
          uRadius: { value: radius },
          uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 0, 0)) },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(
    () => () => {
      morphTween.current?.kill();
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  /** Writes the particles' current on-screen morph positions into the `from` buffer. */
  const bakeCurrentPositions = () => {
    const u = material.uniforms;
    const p = u.uProgress.value;
    if (p <= 0) return;
    const st = u.uStagger.value;
    const sc = u.uScatter.value;
    const from = geometry.attributes.position.array;
    const to = geometry.attributes.aTo.array;
    const dir = geometry.attributes.aDir.array;
    const rnd = geometry.attributes.aRandom.array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      // Mirror of the vertex shader's morph (sweep delay, smootherstep, flow swirl).
      const sweep = Math.min(1, Math.max(0, (to[i3] + to[i3 + 1] * 0.6) / 5 + 0.5));
      const delay = sweep * 0.75 + rnd[i4 + 3] * 0.25;
      const t = Math.min(1, Math.max(0, p * (1 + st) - delay * st));
      const e = smootherstep(t);
      const mx = (from[i3] + to[i3]) * 0.5;
      const my = (from[i3 + 1] + to[i3 + 1]) * 0.5;
      const mz = (from[i3 + 2] + to[i3 + 2]) * 0.5;
      const swirl = Math.sin(Math.PI * t) * sc * (0.6 + rnd[i4 + 1] * 0.4);
      const fx = Math.sin(my * 1.7 + 1.3) * 0.85 + dir[i3] * 0.15;
      const fy = Math.sin(mz * 1.9 + 0.4) * 0.85 + dir[i3 + 1] * 0.15;
      const fz = Math.sin(mx * 1.5 + 2.1) * 0.85 + dir[i3 + 2] * 0.15;
      from[i3] = from[i3] + (to[i3] - from[i3]) * e + fx * swirl;
      from[i3 + 1] = from[i3 + 1] + (to[i3 + 1] - from[i3 + 1]) * e + fy * swirl;
      from[i3 + 2] = from[i3 + 2] + (to[i3 + 2] - from[i3 + 2]) * e + fz * swirl;
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      get points() {
        return pointsRef.current;
      },
      /** Morph progress toward the current shape (0 → 1). */
      get progress() {
        return material.uniforms.uProgress.value;
      },
      get shape() {
        return current.current;
      },
      morphTo(key, { duration = 2.4, scatter = 0.5, delay = 0 } = {}) {
        const target = shapes[key];
        if (!target) return;
        const u = material.uniforms;
        if (current.current === key && u.uProgress.value >= 1) return;

        morphTween.current?.kill();
        const waveNow = THREE.MathUtils.lerp(
          u.uWaveFrom.value,
          u.uWaveTo.value,
          easeInOutCubic(Math.min(1, u.uProgress.value))
        );
        bakeCurrentPositions();
        geometry.attributes.aTo.array.set(target);
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aTo.needsUpdate = true;
        current.current = key;
        u.uWaveFrom.value = waveNow;
        u.uWaveTo.value = WAVE_SHAPES.has(key) ? 1 : 0;

        if (reducedMotion) {
          u.uProgress.value = 1;
          u.uScatter.value = 0;
          return;
        }
        u.uProgress.value = 0;
        u.uScatter.value = scatter;
        morphTween.current = gsap.to(u.uProgress, {
          value: 1,
          duration,
          delay,
          ease: "sine.inOut",
        });
      },
      setOpacity(value, duration = 1.2) {
        gsap.to(material.uniforms.uOpacity, {
          value,
          duration: reducedMotion ? 0 : duration,
          ease: "power2.out",
          overwrite: true,
        });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapes, geometry, material, reducedMotion]
  );

  // Pointer tracking state lives in refs: nothing here should trigger a render.
  const local = useRef({
    smoothed: new THREE.Vector3(99, 99, 0),
    lastRipple: new THREE.Vector3(99, 99, 0),
    lastRippleTime: 0,
    rippleIndex: 0,
    initialised: false,
  });

  useFrame((state, delta) => {
    const u = material.uniforms;
    const dt = Math.min(delta, 1 / 20);
    if (!reducedMotion) u.uTime.value += dt;
    u.uPixelRatio.value = dpr;

    const points = pointsRef.current;
    if (!points || !pointer || !interactive || reducedMotion) {
      u.uHover.value = 0;
      return;
    }

    const now = performance.now();
    const engaged = pointer.active && now - pointer.lastMove < 2600;
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, engaged ? 1 : 0, engaged ? 3 : 1.4, dt);
    if (!engaged && u.uHover.value < 0.01) return;

    // Project the pointer onto the particle system's own XY plane (local space).
    _normal.set(0, 0, 1).transformDirection(points.matrixWorld);
    points.getWorldPosition(_origin);
    _plane.setFromNormalAndCoplanarPoint(_normal, _origin);
    _raycaster.setFromCamera(_ndc.set(pointer.nx, pointer.ny), state.camera);
    if (!_raycaster.ray.intersectPlane(_plane, _hit)) return;
    points.worldToLocal(_hit);

    const l = local.current;
    if (!l.initialised) {
      l.smoothed.copy(_hit);
      l.initialised = true;
    }
    l.smoothed.x = THREE.MathUtils.damp(l.smoothed.x, _hit.x, 9, dt);
    l.smoothed.y = THREE.MathUtils.damp(l.smoothed.y, _hit.y, 9, dt);
    u.uPointer.value.copy(l.smoothed);

    // Emit a new wave front whenever the cursor has travelled far enough.
    const travelled = l.lastRipple.distanceTo(l.smoothed);
    if (engaged && travelled > 0.32 && u.uTime.value - l.lastRippleTime > 0.16) {
      const ripple = u.uRipples.value[l.rippleIndex];
      ripple.set(l.smoothed.x, l.smoothed.y, u.uTime.value, Math.min(1, 0.35 + travelled * 0.6));
      l.rippleIndex = (l.rippleIndex + 1) % MAX_RIPPLES;
      l.lastRipple.copy(l.smoothed);
      l.lastRippleTime = u.uTime.value;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
});

export default ParticleSystem;
