"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import SceneDirector from "./SceneDirector";

/**
 * Safety net only: if the device really cannot hold ~30 fps at native
 * resolution, step the pixel ratio down once (never below 1.25 on HiDPI).
 */
function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useThree((s) => s.viewport.dpr);
  const stats = useRef({ frames: 0, time: 0, lowered: false });
  useFrame((_, delta) => {
    const s = stats.current;
    if (s.lowered) return;
    s.frames += 1;
    s.time += delta;
    if (s.frames >= 180) {
      if (s.time / s.frames > 1 / 30 && dpr > 1.25) {
        setDpr(Math.max(1.25, dpr * 0.75));
        s.lowered = true;
      }
      s.frames = 0;
      s.time = 0;
    }
  });
  return null;
}

export default function ParticleCanvas({ profile }) {
  return (
    <Canvas
      dpr={profile.dpr}
      camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 40 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false }}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <AdaptiveResolution />
      <SceneDirector profile={profile} />
    </Canvas>
  );
}
