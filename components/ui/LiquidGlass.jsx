"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Builds the two maps that drive the glass for a capsule of size w × h.
 *
 *  map   Red / green encode horizontal / vertical displacement (128 = none).
 *        Along the rim, content is pulled hard along the edge normal with a
 *        convex profile (the thick edge of a lens); through the body, a gentle
 *        pull toward the centre magnifies slightly, like a real lens.
 *  edge  White with alpha = how strongly each pixel is bent: used to
 *        concentrate light (brighten) the refracted content along the rim.
 */
function buildMaps(w, h, bevel, magnify) {
  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    return { canvas, ctx, img: ctx.createImageData(w, h) };
  };
  const disp = make();
  const glow = make();
  const r = h / 2;
  const half = w / 2 - r; // half-length of the capsule's straight segment

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Signed distance to a capsule centred in the box.
      const px = x + 0.5 - w / 2;
      const py = y + 0.5 - h / 2;
      const cx = Math.max(-half, Math.min(half, px));
      const dx = px - cx;
      const dy = py;
      const len = Math.hypot(dx, dy) || 1;
      const inside = r - len; // distance from the edge, inward
      const nx = dx / len; // outward edge normal
      const ny = dy / len;
      // Rim: 1 at the edge → 0 past the bevel, convex (fast rise near the edge).
      const t = Math.max(0, Math.min(1, 1 - inside / bevel));
      const rim = Math.pow(t, 1.6);
      // Body: slight magnification toward the centre, fading out into the rim.
      const body = 1 - rim;
      const mx = -(px / (w / 2)) * magnify * 0.12 * body;
      const my = -(py / r) * magnify * body;

      const i = (y * w + x) * 4;
      disp.img.data[i] = Math.round(Math.max(0, Math.min(255, 128 + (nx * rim + mx) * 127)));
      disp.img.data[i + 1] = Math.round(Math.max(0, Math.min(255, 128 + (ny * rim + my) * 127)));
      disp.img.data[i + 2] = 128;
      disp.img.data[i + 3] = 255;

      glow.img.data[i] = 255;
      glow.img.data[i + 1] = 255;
      glow.img.data[i + 2] = 255;
      glow.img.data[i + 3] = Math.round(Math.pow(t, 1.2) * 255);
    }
  }
  disp.ctx.putImageData(disp.img, 0, 0);
  glow.ctx.putImageData(glow.img, 0, 0);
  return { map: disp.canvas.toDataURL("image/png"), edge: glow.canvas.toDataURL("image/png") };
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
 * Liquid glass surface: clear glass that refracts and concentrates the light
 * behind it — strong bending and brightening along the rim, slight
 * magnification through the body, faint chromatic dispersion.
 * Render it as the background layer of a floating element (it fills its parent
 * box via `className`). Falls back to frosted glass where refraction is not
 * supported.
 *
 *  - active     show / hide with a soft transition
 *  - strength   refraction strength in px
 *  - bevel      width of the bending rim in px
 *  - magnify    lens magnification of the body (0 = none)
 *  - brighten   light concentration on refracted content along the rim
 */
export default function LiquidGlass({
  active = true,
  strength = 110,
  bevel = 30,
  magnify = 0.22,
  brighten = 1.9,
  className = "",
}) {
  const ref = useRef(null);
  const id = useId().replace(/:/g, "");
  const filterId = `liquid-glass-${id}`;
  const [maps, setMaps] = useState(null);
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
        setMaps(buildMaps(w, h, Math.min(bevel, h / 2), magnify));
      });
    });
    ro.observe(ref.current);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [refract, bevel, magnify]);

  const useFilter = refract && maps;
  // Clear glass: no dimming, only a hair of blur. The fallback (Safari/Firefox,
  // which cannot refract a backdrop) is frosted instead.
  const backdrop = useFilter
    ? `url(#${filterId}) blur(0.4px) saturate(150%)`
    : "blur(16px) saturate(170%) brightness(1.05)";
  const channel = (c) =>
    ["1 0 0 0 0", "0 1 0 0 0", "0 0 1 0 0"]
      .map((row, i) => (i === c ? row : "0 0 0 0 0"))
      .join(" ") + " 0 0 0 1 0";

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
            <feImage href={maps.map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feImage href={maps.edge} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="edge" />
            {/* Dispersion: each colour channel bends by a slightly different amount. */}
            {[0.975, 1, 1.025].map((k, c) => (
              <feDisplacementMap
                key={c}
                in="SourceGraphic"
                in2="map"
                scale={strength * k}
                xChannelSelector="R"
                yChannelSelector="G"
                result={`d${c}`}
              />
            ))}
            {[0, 1, 2].map((c) => (
              <feColorMatrix key={c} in={`d${c}`} type="matrix" values={channel(c)} result={`c${c}`} />
            ))}
            <feBlend in="c0" in2="c1" mode="screen" result="rg" />
            <feBlend in="rg" in2="c2" mode="screen" result="refracted" />
            {/* Light concentration: the bent content along the rim gets brighter. */}
            <feComponentTransfer in="refracted" result="bright">
              <feFuncR type="linear" slope={brighten} intercept="0.015" />
              <feFuncG type="linear" slope={brighten} intercept="0.015" />
              <feFuncB type="linear" slope={brighten} intercept="0.015" />
            </feComponentTransfer>
            <feComposite in="bright" in2="edge" operator="in" result="rim" />
            <feComposite in="rim" in2="refracted" operator="over" />
          </filter>
        </svg>
      )}

      {/* Lighting: inner glow and a soft drop shadow (no tint: the glass is clear). */}
      <span className="absolute inset-0 rounded-full shadow-[inset_0_0_22px_rgba(255,255,255,0.06),inset_0_-10px_24px_-14px_rgba(255,255,255,0.12),0_14px_44px_-12px_rgba(0,0,0,0.6)]" />
      {/* Specular rim: bright along the top edge, fading around the sides. */}
      <span className="absolute inset-0 rounded-full p-px [background:linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.08)_38%,rgba(255,255,255,0.03)_62%,rgba(255,255,255,0.22))] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [-webkit-mask-composite:xor]" />
      {/* Sheen across the upper half. */}
      <span className="absolute inset-x-[6%] top-0 h-1/2 rounded-full bg-gradient-to-b from-white/[0.08] to-transparent" />
    </div>
  );
}
