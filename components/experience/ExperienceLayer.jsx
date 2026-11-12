"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getDeviceProfile } from "@/lib/device";
import { pointer } from "@/lib/store";
import WebGLFallback from "./WebGLFallback";

// The WebGL bundle (three + R3F) is loaded lazily, after the page is interactive.
const ParticleCanvas = dynamic(() => import("./ParticleCanvas"), { ssr: false });

/** Fixed full-screen visual layer that sits behind every section. */
export default function ExperienceLayer() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    setProfile(getDeviceProfile());

    const onMove = (e) => {
      pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.active = true;
      pointer.lastMove = performance.now();
    };
    const onLeave = () => {
      pointer.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      {profile && (profile.webgl ? <ParticleCanvas profile={profile} /> : <WebGLFallback />)}
      {/* Vignette keeps typography readable over the particles. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,5,5,0.55)_100%)]" />
    </div>
  );
}
