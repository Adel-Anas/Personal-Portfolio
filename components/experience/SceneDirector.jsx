"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import ParticleSystem from "./ParticleSystem";
import OrbitRing from "./OrbitRing";
import StarDust from "./StarDust";
import GlyphOccluder from "./GlyphOccluder";
import { SHAPE_FACTORIES, coherentOrder } from "./shapes";
import { experienceStore, pointer } from "@/lib/store";

/**
 * Choreography: one particle system travels through the whole page and
 * becomes a different form for each section ([data-scene] elements, in order).
 *
 * Transitions are driven by the scroll position, not by timers: between two
 * sections the old form crumbles into dust, the dust flows to where the next
 * form lives and assembles it there. Scrolling back rewinds it.
 *
 *  x / y   placement as a fraction of the visible viewport (z = 0 plane)
 *  scale   multiplier on the base size (≈ 72% of viewport height)
 *  rot     resting rotation
 *  spin    continuous Y rotation in rad/s
 */
const SCENES = {
  home: { shape: "glyph", x: 0.215, y: 0.06, scale: 0.88, rot: [0.1, -0.4, -0.04], spin: 0, opacity: 1 },
  about: { shape: "mind", x: 0.27, y: 0.0, scale: 0.92, rot: [0.25, 0, 0.12], spin: 0.08, opacity: 0.7 },
  // Sub-scene: the profile + Design / Engineer / Build block. A quieter background layer.
  "about:detail": { shape: "strands", x: 0, y: -0.31, scale: 0.95, rot: [0.3, -0.12, -0.05], spin: 0, opacity: 0.6 },
  expertise: { shape: "galaxy", x: 0.16, y: -0.02, scale: 1.05, rot: [0.62, 0, 0.22], spin: 0.05, opacity: 0.38 },
  projects: { shape: "wave", x: 0, y: -0.3, scale: 1, rot: [0.42, 0, 0], spin: 0, opacity: 0.4 },
  experience: { shape: "helix", x: 0.36, y: 0, scale: 1, rot: [0.1, 0, -0.32], spin: 0.12, opacity: 0.42 },
  contact: { shape: "glyph", x: 0.25, y: 0.04, scale: 0.84, rot: [0.14, -0.4, -0.04], spin: 0, opacity: 0.95 },
};

/** Portrait / small screens: centre the forms and keep them behind the copy. */
const MOBILE_OVERRIDES = {
  home: { x: 0.02, y: 0.26, scale: 0.66, opacity: 0.95 },
  about: { x: 0.22, y: 0.3, scale: 0.8, opacity: 0.3 },
  "about:detail": { x: 0, y: -0.42, scale: 0.75, opacity: 0.3 },
  expertise: { x: 0, y: 0.02, scale: 1.15, opacity: 0.22 },
  projects: { y: -0.32, opacity: 0.32 },
  experience: { x: 0.3, opacity: 0.22 },
  contact: { x: 0.08, y: 0.24, scale: 0.6, opacity: 0.38 },
};

const ORDER = Object.keys(SCENES);
const INTRO = "intro";

/**
 * Scroll window of a transition: it starts when the next section's top
 * reaches START of the viewport height and completes LENGTH of a viewport later.
 */
const START = 0.98;
const LENGTH = 0.9;
/** Inertia of the transitions (lower = slower, softer follow of the scroll). */
const FOLLOW = 2.4;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

function resolveScene(id, portrait) {
  const base = SCENES[id] || SCENES.home;
  return portrait ? { ...base, ...(MOBILE_OVERRIDES[id] || {}) } : base;
}

const _q = new THREE.Quaternion();
const _qSpin = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

export default function SceneDirector({ profile }) {
  const { count, ring: ringCount, dust: dustCount, reducedMotion } = profile;
  const viewport = useThree((s) => s.viewport);
  const size = useThree((s) => s.size);

  const system = useRef(null);
  const ring = useRef(null);
  const occluder = useRef(null);
  const glyphFrame = useRef(null);
  const tilt = useRef(null);

  const spins = useRef({});
  const sceneEls = useRef([]);
  const intro = useRef({ progress: reducedMotion ? 1 : 0, opacity: reducedMotion ? 1 : 0, started: false });
  // The pair of forms currently on screen and how far between them we are.
  // With reduced motion there is no intro: start directly on the glyph.
  // Damped position along the page, in "scene units" (1.5 = halfway between scenes 1 and 2).
  const stage = useRef(0);
  const pair = useRef(
    reducedMotion ? { from: "home", to: "about", p: 0, baked: false } : { from: INTRO, to: "home", p: 0, baked: false }
  );

  const shapes = useMemo(() => {
    const out = {};
    for (const [key, factory] of Object.entries(SHAPE_FACTORIES)) out[key] = coherentOrder(factory(count));
    return out;
  }, [count]);

  const portrait = size.width / size.height < 0.9 || size.width < 768;

  // Section anchors, in document order.
  useEffect(() => {
    const collect = () => {
      sceneEls.current = [...document.querySelectorAll("[data-scene]")]
        .map((el) => ({ id: el.dataset.scene, el }))
        .filter((s) => SCENES[s.id]);
    };
    collect();
    window.addEventListener("resize", collect);
    return () => window.removeEventListener("resize", collect);
  }, []);

  // Load the starting endpoints. The ring's visibility is then driven by its formation.
  useEffect(() => {
    ring.current?.setOpacity(1, 0);
    const cur = pair.current;
    system.current?.setEndpoints(
      cur.from === INTRO ? "scatter" : SCENES[cur.from].shape,
      SCENES[cur.to].shape
    );
  }, [shapes]);

  // Intro: once the preloader hands over, the scattered cloud condenses into the glyph.
  useEffect(() => {
    const start = (state) => {
      if (!state.ready || intro.current.started) return;
      intro.current.started = true;
      if (reducedMotion) return;
      gsap.to(intro.current, { opacity: 1, duration: 1.6, ease: "power2.out" });
      gsap.to(intro.current, { progress: 1, duration: 5, delay: 0.1, ease: "sine.inOut" });
    };
    start(experienceStore.get());
    return experienceStore.subscribe(start);
  }, [reducedMotion]);

  /** Placement matrix of a scene (live: includes sway and spin). */
  const sceneMatrix = (id, target, base, time) => {
    const scene = resolveScene(id, portrait);
    const sway = reducedMotion ? 0 : Math.sin(time * 0.22) * 0.1;
    _e.set(scene.rot[0], scene.rot[1] + sway, scene.rot[2]);
    _q.setFromEuler(_e);
    _qSpin.setFromAxisAngle(_y, spins.current[id] || 0);
    _q.multiply(_qSpin);
    _p.set(scene.x * viewport.width, scene.y * viewport.height, 0);
    _s.setScalar(base * scene.scale);
    return target.compose(_p, _q, _s);
  };

  /** Continuous position along the page: k + p, between scene k and k + 1. */
  const readStage = () => {
    const vh = window.innerHeight;
    const els = sceneEls.current;
    let stageValue = 0;
    for (let i = 1; i < els.length; i++) {
      const top = els[i].el.getBoundingClientRect().top;
      const pi = clamp01((vh * START - top) / (vh * LENGTH));
      if (pi > 0) stageValue = Math.max(stageValue, i - 1 + pi);
    }
    return stageValue;
  };

  /** Which two forms a stage value sits between, and the progress (0..1). */
  const pairAt = (value) => {
    const els = sceneEls.current;
    const last = Math.max(1, els.length - 1);
    const v = Math.min(Math.max(value, 0), last);
    const k = Math.min(Math.floor(v), last - 1);
    return { from: els[k]?.id ?? "home", to: els[k + 1]?.id ?? "about", p: v - k };
  };

  useFrame((state, delta) => {
    const sys = system.current;
    if (!sys) return;
    const u = sys.uniforms;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    const base = Math.min(viewport.height * 0.36, viewport.width * (portrait ? 0.36 : 0.3));

    if (!reducedMotion) for (const id of ORDER) spins.current[id] = (spins.current[id] || 0) + SCENES[id].spin * dt;

    // ---- 1. Desired state ------------------------------------------------
    // The page position is damped once, here: everything downstream follows it
    // with inertia, and boundaries between scenes are crossed continuously.
    const target = readStage();
    stage.current = reducedMotion ? target : THREE.MathUtils.damp(stage.current, target, FOLLOW, dt);
    let desired = pairAt(stage.current);
    const it = intro.current;
    if (it.progress < 1) {
      if (desired.p > 0 || desired.from !== "home") {
        // The visitor scrolled during the intro: hand over to scrolling.
        gsap.killTweensOf(it);
        it.progress = 1;
        it.opacity = 1;
      } else {
        desired = { from: INTRO, to: "home", p: it.progress };
      }
    }

    // ---- 2. Switch the pair of forms when the scroll crosses a boundary ----
    const cur = pair.current;
    if (desired.from !== cur.from || desired.to !== cur.to) {
      const forwardSeam = desired.from === cur.to && cur.p > 0.97;
      const backwardSeam = desired.to === cur.from && cur.p < 0.03;
      if (forwardSeam || backwardSeam) {
        // Seamless: the form on screen is exactly the shared endpoint.
        sys.setEndpoints(SCENES[desired.from].shape, SCENES[desired.to].shape);
        cur.baked = false;
      } else {
        // Abrupt jump (very fast scroll, intro interrupted): freeze what is on screen.
        sys.bake();
        sys.setEndpoints(null, SCENES[desired.to].shape);
        cur.baked = true;
      }
      cur.from = desired.from;
      cur.to = desired.to;
      cur.p = desired.p;
    } else {
      cur.p = desired.p;
    }

    // ---- 3. Uniforms -----------------------------------------------------
    if (!cur.baked) {
      sceneMatrix(cur.from === INTRO ? "home" : cur.from, u.uFromMatrix.value, base, time);
    }
    sceneMatrix(cur.to, u.uToMatrix.value, base, time);
    u.uProgress.value = cur.p;
    u.uRadius.value = 0.5 * base;
    u.uScatter.value = reducedMotion ? 0 : base * (cur.from === INTRO ? 0.85 : 0.6);

    const opFrom = cur.from === INTRO ? resolveScene("home", portrait).opacity : resolveScene(cur.from, portrait).opacity;
    const opTo = resolveScene(cur.to, portrait).opacity;
    u.uOpacity.value = THREE.MathUtils.lerp(opFrom, opTo, smooth(cur.p)) * it.opacity;

    // ---- 4. Ring + occluder follow whichever glyph is in play ----------------
    const fromGlyph = cur.from !== INTRO && SCENES[cur.from].shape === "glyph";
    const toGlyph = SCENES[cur.to].shape === "glyph";
    const glyphScene = toGlyph ? cur.to : fromGlyph ? cur.from : null;
    const frame = glyphFrame.current;
    if (frame && glyphScene) {
      sceneMatrix(glyphScene, frame.matrix, base, time);
      frame.matrixWorldNeedsUpdate = true;
    }
    let glyphWeight;
    if (cur.from === INTRO) glyphWeight = cur.p;
    else glyphWeight = (fromGlyph ? 1 - cur.p : 0) + (toGlyph ? cur.p : 0);
    // The ring dissolves first when leaving and is drawn last when arriving.
    ring.current?.setForm(clamp01((glyphWeight - 0.35) / 0.65));
    if (occluder.current) occluder.current.visible = glyphWeight > 0.85;

    // ---- 5. Cursor parallax --------------------------------------------------
    const tl = tilt.current;
    if (tl && !reducedMotion) {
      tl.rotation.y = THREE.MathUtils.damp(tl.rotation.y, pointer.nx * 0.05, 2.2, dt);
      tl.rotation.x = THREE.MathUtils.damp(tl.rotation.x, -pointer.ny * 0.03, 2.2, dt);
    }
  });

  return (
    <>
      <StarDust count={dustCount} pointer={pointer} reducedMotion={reducedMotion} />
      <group ref={tilt}>
        <ParticleSystem
          ref={system}
          count={count}
          shapes={shapes}
          initialShape="scatter"
          pointer={pointer}
          reducedMotion={reducedMotion}
          interactive={!profile.coarse}
        />
        {/* Placed every frame on the glyph currently in play. */}
        <group ref={glyphFrame} matrixAutoUpdate={false}>
          <GlyphOccluder ref={occluder} />
          <group position={[0.1, 0.06, 0.1]} rotation={[0.3, 0.1, 0.28]}>
            <OrbitRing count={ringCount} radii={[1.36, 1.36]} reducedMotion={reducedMotion} ref={ring} />
          </group>
        </group>
      </group>
    </>
  );
}
