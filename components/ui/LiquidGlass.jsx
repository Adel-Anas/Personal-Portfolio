"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Builds a displacement map for a capsule of size w × h.
 *
 * Red / green encode the horizontal / vertical displacement (128 = none).
 * Near the rounded edge the background is pulled along the edge normal, with
 * a convex (squircle-like) falloff — the way the thick rim of a glass lens
 * bends what is behind it — while the centre stays undistorted.
 */
function buildDisplacementMap(w, h, bevel) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const r = h / 2;
  const half = w / 2 - r; // half-length of the capsule's straight segment

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Signed distance to a capsule centred in the box (negative inside).
      const px = x + 0.5 - w / 2;
      const py = y + 0.5 - h / 2;
      const cx = Math.max(-half, Math.min(half, px));
      const dx = px - cx;
      const dy = py;
      const len = Math.hypot(dx, dy) || 1;
      const inside = r - len; // distance from the edge, inward
      // Edge normal (points outward).
      const nx = dx / len;
      const ny = dy / len;
      // 1 at the edge → 0 once past the bevel, with a convex profile.
      const t = Math.max(0, Math.min(1, 1 - inside / bevel));
      const m = t * t * (3 - 2 * t) * Math.sqrt(t);
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(128 + nx * m * 127);
      img.data[i + 1] = Math.round(128 + ny * m * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/** SVG filters as a backdrop-filter only work in Chromium-based browsers. */
function supportsRefraction() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const chromium = Boolean(window.chrome) || /Chrome|Chromium|Edg\//.test(ua);
  const webkitOnly = /iPhone|iPad|iPod|CriOS|FxiOS/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium/.test(ua));
  return chromium && !webkitOnly && !/Firefox/.test(ua);
}

/**
 * Liquid glass surface: refracts, blurs and lights what is behind it.
 * Render it as the background layer of a floating element (it fills its parent
 * box via `className`). Falls back to frosted glass where refraction is not
 * supported.
 *
 *  - active     show / hide with a soft transition
 *  - strength   refraction strength in px
 *  - bevel      width of the bending rim in px
 */
export default function LiquidGlass({ active = true, strength = 46, bevel = 22, className = "" }) {
  const ref = useRef(null);
  const id = useId().replace(/:/g, "");
  const filterId = `liquid-glass-${id}`;
  const [map, setMap] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [refract, setRefract] = useState(false);

  useEffect(() => {
    setRefract(supportsRefraction());
  }, []);

  useEffect(() => {
    if (!refract || !ref.current) return;
    let frame;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (!w || !h) return;
        setSize({ w, h });
        setMap(buildDisplacementMap(w, h, Math.min(bevel, h / 2)));
      });
    });
    ro.observe(ref.current);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [refract, bevel]);

  const useFilter = refract && map;
  const backdrop = useFilter
    ? `url(#${filterId}) blur(3px) saturate(165%) brightness(0.72)`
    : "blur(18px) saturate(165%) brightness(0.78)";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden rounded-full transition-[opacity,transform] duration-700 ease-[var(--ease-expo)] ${
        active ? "scale-100 opacity-100" : "scale-[0.985] opacity-0"
      } ${className}`}
      style={{ backdropFilter: backdrop, WebkitBackdropFilter: backdrop }}
    >
      {useFilter && (
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <filter
            id={filterId}
            x="0"
            y="0"
            width={size.w}
            height={size.h}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={strength} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}

      {/* Tint + lighting: a dark-mode dim keeps the links legible over bright content,
          plus inner glow and a soft drop shadow. */}
      <span className="absolute inset-0 rounded-full bg-[rgba(10,10,10,0.18)] shadow-[inset_0_0_22px_rgba(255,255,255,0.06),inset_0_-10px_24px_-14px_rgba(255,255,255,0.12),0_14px_44px_-12px_rgba(0,0,0,0.6)]" />
      {/* Specular rim: bright along the top edge, fading around the sides. */}
      <span className="absolute inset-0 rounded-full p-px [background:linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.08)_38%,rgba(255,255,255,0.03)_62%,rgba(255,255,255,0.22))] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [-webkit-mask-composite:xor]" />
      {/* Sheen across the upper half. */}
      <span className="absolute inset-x-[6%] top-0 h-1/2 rounded-full bg-gradient-to-b from-white/[0.08] to-transparent" />
    </div>
  );
}
