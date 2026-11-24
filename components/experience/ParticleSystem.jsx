"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MAX_RIPPLES, particleFragmentShader, particleVertexShader } from "./shaders/particles";
import { WAVE_SHAPES, createRng } from "./shapes";

const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Mirror of the shader's animated wave surface (shape space). */
const waveAt = (x, z, time) =>
  Math.sin(x * 1.25 + time * 0.55) * 0.26 +
  Math.sin(z * 1.9 - time * 0.7 + x * 0.45) * 0.16 +
  Math.sin((x + z) * 3.2 + time * 1.1) * 0.035;

const _ndc = new THREE.Vector2();
const _normal = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _plane = new THREE.Plane();
const _raycaster = new THREE.Raycaster();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/**
 * Reusable GPU particle system that morphs between two point clouds.
 *
 * Each endpoint has its own shape *and* its own placement matrix
 * (uFromMatrix / uToMatrix). Particles therefore travel individually from
 * where the old form is to where the new form is — the form dissolves into
 * dust and re-assembles elsewhere, instead of being moved as one rigid block.
 *
 * Props
 *  - count, shapes ({ [key]: Float32Array(count * 3) }), initialShape
 *  - pointer        mutable { nx, ny, active, lastMove } in NDC (optional)
 *  - interactive    cursor repulsion + ripples
 *  - reducedMotion  freezes time-based motion
 *
 * Imperative API (via ref) — the caller drives the uniforms every frame
 *  - uniforms                  uProgress, uOpacity, uScatter, uFromMatrix, uToMatrix, uRadius…
 *  - setEndpoints(from, to)    load shapes into the two endpoints (from = null keeps baked positions)
 *  - bake()                    freeze what is on screen into the `from` endpoint (world space)
 *  - points
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

  const geometry = useMemo(() => {
    const rng = createRng(seed);
    const geo = new THREE.BufferGeometry();
    const from = new Float32Array(shapes[initialShape]);
    const to = new Float32Array(shapes[initialShape]);
    const dir = new Float32Array(count * 3);
    const random = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Random unit vector — the individual part of a particle's flight as dust.
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
          uProgress: { value: 0 },
          uStagger: { value: stagger },
          uScatter: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: size },
          uOpacity: { value: 0 },
          uDrift: { value: reducedMotion ? 0 : drift },
          uWaveFrom: { value: WAVE_SHAPES.has(initialShape) ? 1 : 0 },
          uWaveTo: { value: WAVE_SHAPES.has(initialShape) ? 1 : 0 },
          uFromMatrix: { value: new THREE.Matrix4() },
          uToMatrix: { value: new THREE.Matrix4() },
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
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useImperativeHandle(
    ref,
    () => ({
      get points() {
        return pointsRef.current;
      },
      get uniforms() {
        return material.uniforms;
      },

      setEndpoints(fromKey, toKey) {
        const u = material.uniforms;
        if (fromKey !== null && shapes[fromKey]) {
          geometry.attributes.position.array.set(shapes[fromKey]);
          geometry.attributes.position.needsUpdate = true;
          u.uWaveFrom.value = WAVE_SHAPES.has(fromKey) ? 1 : 0;
        }
        if (shapes[toKey]) {
          geometry.attributes.aTo.array.set(shapes[toKey]);
          geometry.attributes.aTo.needsUpdate = true;
          u.uWaveTo.value = WAVE_SHAPES.has(toKey) ? 1 : 0;
        }
      },

      /**
       * Freezes the current on-screen morph state into the `from` endpoint,
       * expressed directly in world space (uFromMatrix becomes identity).
       * Used when the target changes abruptly mid-flight, so nothing jumps.
       */
      bake() {
        const u = material.uniforms;
        const p = u.uProgress.value;
        const st = u.uStagger.value;
        const sc = u.uScatter.value;
        const time = u.uTime.value;
        const wf = u.uWaveFrom.value;
        const wt = u.uWaveTo.value;
        const mf = u.uFromMatrix.value;
        const mt = u.uToMatrix.value;
        const from = geometry.attributes.position.array;
        const to = geometry.attributes.aTo.array;
        const dir = geometry.attributes.aDir.array;
        const rnd = geometry.attributes.aRandom.array;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const i4 = i * 4;
          _a.set(from[i3], from[i3 + 1] + waveAt(from[i3], from[i3 + 2], time) * wf, from[i3 + 2]).applyMatrix4(mf);
          _b.set(to[i3], to[i3 + 1] + waveAt(to[i3], to[i3 + 2], time) * wt, to[i3 + 2]).applyMatrix4(mt);
          const sweep = clamp01((to[i3] + to[i3 + 1] * 0.6) / 5 + 0.5);
          const delay = sweep * 0.75 + rnd[i4 + 3] * 0.25;
          const t = clamp01(p * (1 + st) - delay * st);
          const e = smootherstep(t);
          const mx = (_a.x + _b.x) * 0.5;
          const my = (_a.y + _b.y) * 0.5;
          const mz = (_a.z + _b.z) * 0.5;
          const swirl = Math.sin(Math.PI * t) * sc * (0.5 + rnd[i4 + 1] * 0.5);
          const fx = Math.sin(my * 1.3 + 1.3 + time * 0.35) * 0.6 + dir[i3] * 0.4;
          const fy = Math.sin(mz * 1.5 + 0.4 + time * 0.3) * 0.6 + dir[i3 + 1] * 0.4;
          const fz = Math.sin(mx * 1.1 + 2.1 + time * 0.25) * 0.6 + dir[i3 + 2] * 0.4;
          from[i3] = _a.x + (_b.x - _a.x) * e + fx * swirl;
          from[i3 + 1] = _a.y + (_b.y - _a.y) * e + fy * swirl;
          from[i3 + 2] = _a.z + (_b.z - _a.z) * e + fz * swirl;
        }
        geometry.attributes.position.needsUpdate = true;
        mf.identity();
        u.uWaveFrom.value = 0;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapes, geometry, material]
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

    // Project the pointer onto the particle system's XY plane (its local space).
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
    if (engaged && travelled > 0.4 && u.uTime.value - l.lastRippleTime > 0.16) {
      const ripple = u.uRipples.value[l.rippleIndex];
      ripple.set(l.smoothed.x, l.smoothed.y, u.uTime.value, Math.min(1, 0.35 + travelled * 0.5));
      l.rippleIndex = (l.rippleIndex + 1) % MAX_RIPPLES;
      l.lastRipple.copy(l.smoothed);
      l.lastRippleTime = u.uTime.value;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
});

export default ParticleSystem;
