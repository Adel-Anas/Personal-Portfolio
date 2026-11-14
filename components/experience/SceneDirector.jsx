"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import ParticleSystem from "./ParticleSystem";
import OrbitRing from "./OrbitRing";
import StarDust from "./StarDust";
import GlyphOccluder from "./GlyphOccluder";
import { SHAPE_FACTORIES } from "./shapes";
import { experienceStore, pointer } from "@/lib/store";

/**
 * Choreography: one particle system travels through the whole page and
 * becomes a different form for each section.
 *
 *  x / y   offset as a fraction of the visible viewport (z = 0 plane)
 *  scale   multiplier on the base size (≈ 72% of viewport height)
 *  rot     resting rotation
 *  spin    continuous Y rotation in rad/s
 */
const SCENES = {
  home: { shape: "glyph", x: 0.215, y: 0.06, scale: 0.88, rot: [0.1, -0.4, -0.04], spin: 0, opacity: 1, ring: 1 },
  about: { shape: "mind", x: 0.27, y: 0.0, scale: 0.92, rot: [0.25, 0, 0.12], spin: 0.08, opacity: 0.7, ring: 0 },
  // Sub-scene: the profile + Design / Engineer / Build block. A quieter background layer.
  "about:detail": { shape: "strands", x: 0, y: -0.31, scale: 0.95, rot: [0.3, -0.12, -0.05], spin: 0, opacity: 0.6, ring: 0 },
  expertise: { shape: "galaxy", x: 0.16, y: -0.02, scale: 1.05, rot: [0.62, 0, 0.22], spin: 0.05, opacity: 0.38, ring: 0 },
  projects: { shape: "wave", x: 0, y: -0.3, scale: 1, rot: [0.42, 0, 0], spin: 0, opacity: 0.4, ring: 0 },
  experience: { shape: "helix", x: 0.36, y: 0, scale: 1, rot: [0.1, 0, -0.32], spin: 0.12, opacity: 0.42, ring: 0 },
  contact: { shape: "glyph", x: 0.25, y: 0.04, scale: 0.84, rot: [0.14, -0.4, -0.04], spin: 0, opacity: 0.95, ring: 1 },
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

function resolveScene(id, portrait) {
  const base = SCENES[id] || SCENES.home;
  return portrait ? { ...base, ...(MOBILE_OVERRIDES[id] || {}) } : base;
}

export default function SceneDirector({ profile }) {
  const { count, ring: ringCount, dust: dustCount, reducedMotion } = profile;
  const viewport = useThree((s) => s.viewport);
  const size = useThree((s) => s.size);

  const system = useRef(null);
  const ring = useRef(null);
  const occluder = useRef(null);
  const stage = useRef(null);
  const tilt = useRef(null);
  const pose = useRef(null);
  const spin = useRef(0);
  const stageBase = useRef({ x: 0, y: 0 });
  const follow = useRef(1);
  const sceneId = useRef("home");

  const shapes = useMemo(() => {
    const out = {};
    for (const [key, factory] of Object.entries(SHAPE_FACTORIES)) out[key] = factory(count);
    return out;
  }, [count]);

  const portrait = size.width / size.height < 0.9 || size.width < 768;

  useEffect(() => {
    const play = (id, intro) => {
      const scene = resolveScene(id, portrait);
      sceneId.current = id;
      if (intro) {
        system.current?.setOpacity(scene.opacity, 1.6);
        system.current?.morphTo(scene.shape, { duration: 3.6, scatter: 1.1, delay: 0.1 });
        // The ring is drawn while the glyph condenses, finishing just after it.
        ring.current?.setOpacity(1, 0);
        ring.current?.form(scene.ring, { duration: 3.6, delay: 1.3 });
      } else {
        system.current?.morphTo(scene.shape, { duration: 2.6, scatter: 0.55 });
        system.current?.setOpacity(scene.opacity, 1.4);
        ring.current?.setOpacity(1, 0);
        ring.current?.form(scene.ring, scene.ring ? { duration: 3, delay: 0.6 } : { duration: 1.6 });
      }
    };

    let introPlayed = false;
    const sync = (state, prev) => {
      if (!state.ready) return;
      if (!introPlayed) {
        introPlayed = true;
        play(state.scene, true);
        return;
      }
      if (!prev || state.scene !== prev.scene) play(state.scene, false);
    };

    sync(experienceStore.get(), null);
    return experienceStore.subscribe(sync);
  }, [portrait]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const scene = resolveScene(sceneId.current, portrait);
    const base = Math.min(viewport.height * 0.36, viewport.width * (portrait ? 0.36 : 0.3));
    const k = reducedMotion ? 60 : 2.1;

    // Stage — position and scale glide toward the active scene.
    const s = stage.current;
    if (s) {
      const b = stageBase.current;
      b.x = THREE.MathUtils.damp(b.x, scene.x * viewport.width, k, dt);
      b.y = THREE.MathUtils.damp(b.y, scene.y * viewport.height, k, dt);

      // Hero: the glyph travels up with the page (fully on mobile, as parallax on
      // desktop) so it never slides underneath the copy. Applied without damping
      // so it stays locked to the scroll position, then released on scene change.
      follow.current = THREE.MathUtils.damp(follow.current, sceneId.current === "home" ? 1 : 0, 3, dt);
      const scrolled = Math.min(window.scrollY / Math.max(1, window.innerHeight), 1.5);
      const offset = scrolled * viewport.height * (portrait ? 1 : 0.35) * follow.current;

      s.position.x = b.x;
      s.position.y = b.y + offset;
      const sc = THREE.MathUtils.damp(s.scale.x, base * scene.scale, k, dt);
      s.scale.setScalar(sc);
    }

    // Tilt — subtle parallax following the cursor.
    const t = tilt.current;
    if (t && !reducedMotion) {
      t.rotation.y = THREE.MathUtils.damp(t.rotation.y, pointer.nx * 0.16, 2.2, dt);
      t.rotation.x = THREE.MathUtils.damp(t.rotation.x, -pointer.ny * 0.1, 2.2, dt);
    }

    // Pose — resting rotation, gentle sway and continuous spin.
    // The occluder only exists while the glyph is actually formed, so the ring
    // is never hidden by a letter that isn't there yet (or anymore).
    if (occluder.current && system.current) {
      occluder.current.visible = system.current.shape === "glyph" && system.current.progress > 0.72;
    }

    const p = pose.current;
    if (p) {
      const time = state.clock.elapsedTime;
      if (scene.spin && !reducedMotion) {
        spin.current += scene.spin * dt;
      } else {
        // Unwind to the nearest full turn so the glyph returns facing forward.
        const target = Math.round(spin.current / (Math.PI * 2)) * Math.PI * 2;
        spin.current = THREE.MathUtils.damp(spin.current, target, 1.6, dt);
      }
      const sway = reducedMotion ? 0 : Math.sin(time * 0.22) * 0.1;
      p.rotation.x = THREE.MathUtils.damp(p.rotation.x, scene.rot[0], k, dt);
      p.rotation.y = THREE.MathUtils.damp(p.rotation.y, scene.rot[1] + sway, k, dt) + 0;
      p.rotation.z = THREE.MathUtils.damp(p.rotation.z, scene.rot[2], k, dt);
      p.children[0].rotation.y = spin.current;
    }
  });

  return (
    <>
      <StarDust count={dustCount} pointer={pointer} reducedMotion={reducedMotion} />
      <group ref={stage}>
        <group ref={tilt}>
          <group ref={pose}>
            <group>
              <ParticleSystem
                ref={system}
                count={count}
                shapes={shapes}
                initialShape="scatter"
                pointer={pointer}
                reducedMotion={reducedMotion}
                interactive={!profile.coarse}
              />
              <GlyphOccluder ref={occluder} />
              <group position={[0.1, 0.06, 0.1]} rotation={[0.3, 0.1, 0.28]}>
                <OrbitRing count={ringCount} radii={[1.36, 1.36]} reducedMotion={reducedMotion} ref={ring} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
