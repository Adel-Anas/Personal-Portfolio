"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import SceneDirector from "./SceneDirector";

/** Drops the pixel ratio once if the device cannot sustain a smooth frame rate. */
function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr);
  const stats = useRef({ frames: 0, time: 0, lowered: false });
  useFrame((_, delta) => {
    const s = stats.current;
    if (s.lowered) return;
    s.frames += 1;
    s.time += delta;
    if (s.frames >= 120) {
      if (s.time / s.frames > 1 / 40) {
        setDpr(1);
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
