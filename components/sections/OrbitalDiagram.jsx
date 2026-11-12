"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Two layouts of the same universe:
 *  - wide:    flat, tilted ellipses, labels beside each node (desktop)
 *  - compact: rounder, larger orbits filling the phone width, labels centred
 *             above each node so they never leave the frame
 */
const LAYOUTS = {
  wide: {
    viewBox: "-500 -300 1000 600",
    radii: [150, 225, 300, 375, 450],
    ryRatio: 0.5,
    tilt: -11,
    dot: [2.6, 2.4],
    core: 54,
  },
  compact: {
    viewBox: "-480 -390 960 780",
    radii: [128, 186, 244, 302, 360],
    ryRatio: 0.86,
    tilt: -8,
    dot: [5, 4],
    core: 70,
  },
};

const isMouse = (e) => e.pointerType === "mouse";

/**
 * Orbital map of the stack. Each category is an orbit; technologies travel
 * along it. Positions are written straight to the DOM every frame, so the
 * animation never touches React state.
 */
export default function OrbitalDiagram({ orbits, active, onActivate, reducedMotion, compact = false }) {
  const svg = useRef(null);
  const nodes = useRef([]);
  const links = useRef([]);
  const running = useRef(true);
  const cfg = compact ? LAYOUTS.compact : LAYOUTS.wide;

  const layout = useMemo(
    () =>
      orbits.map((orbit, i) => {
        const rx = cfg.radii[i] ?? cfg.radii[0] + i * 65;
        return {
          ...orbit,
          rx,
          ry: rx * cfg.ryRatio,
          speed: (i % 2 ? -1 : 1) * (0.045 + (orbits.length - i) * 0.012),
          offset: i * 0.9,
        };
      }),
    [orbits, cfg]
  );

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => (running.current = entry.isIntersecting), { threshold: 0 });
    io.observe(el);

    const tilt = (cfg.tilt * Math.PI) / 180;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    let raf;
    let last = performance.now();
    let time = 0;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running.current && !reducedMotion) time += dt;

      layout.forEach((orbit, i) => {
        orbit.items.forEach((_, j) => {
          const node = nodes.current[i]?.[j];
          if (!node) return;
          const a = orbit.offset + (j / orbit.items.length) * Math.PI * 2 + time * orbit.speed;
          const ex = Math.cos(a) * orbit.rx;
          const ey = Math.sin(a) * orbit.ry;
          const x = ex * cosT - ey * sinT;
          const y = ex * sinT + ey * cosT;
          const depth = (Math.sin(a) + 1) / 2; // 0 = back, 1 = front
          node.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          node.dot.setAttribute("r", (cfg.dot[0] + depth * cfg.dot[1]).toFixed(2));
          node.g.style.setProperty("--depth", (0.5 + depth * 0.5).toFixed(2));
          // Label placement is owned by this loop in both layouts, so a frame from
          // the previous layout can never leave labels in the wrong position.
          if (compact) {
            node.label.setAttribute("text-anchor", "middle");
            node.label.setAttribute("x", 0);
          } else {
            const left = x < -20;
            node.label.setAttribute("text-anchor", left ? "end" : "start");
            node.label.setAttribute("x", left ? -12 : 12);
          }
          const link = links.current[i]?.[j];
          if (link) {
            link.setAttribute("x2", x.toFixed(1));
            link.setAttribute("y2", y.toFixed(1));
          }
        });
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [layout, reducedMotion, cfg, compact]);

  return (
    <svg
      ref={svg}
      viewBox={cfg.viewBox}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Orbital map of technical expertise"
    >
      <defs>
        <radialGradient id="core-glow">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Orbits */}
      <g transform={`rotate(${cfg.tilt})`}>
        {layout.map((orbit) => {
          const isActive = orbit.id === active;
          return (
            <ellipse
              key={orbit.id}
              rx={orbit.rx}
              ry={orbit.ry}
              fill="none"
              stroke="#fff"
              strokeOpacity={isActive ? 0.42 : compact ? 0.14 : 0.1}
              strokeWidth={compact ? 1.6 : 1}
              strokeDasharray={isActive ? "none" : compact ? "3 9" : "2 6"}
              className="cursor-pointer transition-[stroke-opacity] duration-700"
              onPointerEnter={(e) => isMouse(e) && onActivate(orbit.id)}
              onClick={() => onActivate(orbit.id)}
              style={{ pointerEvents: "stroke" }}
            />
          );
        })}
      </g>

      {/* Links from the core to the active orbit */}
      <g>
        {layout.map((orbit, i) =>
          orbit.items.map((item, j) => (
            <line
              key={`${orbit.id}-${item}`}
              ref={(el) => {
                links.current[i] = links.current[i] || [];
                links.current[i][j] = el;
              }}
              x1="0"
              y1="0"
              x2="0"
              y2="0"
              stroke="#fff"
              strokeWidth={compact ? 1.4 : 1}
              strokeOpacity={orbit.id === active ? 0.18 : 0}
              className="transition-[stroke-opacity] duration-700"
            />
          ))
        )}
      </g>

      {/* Core */}
      <circle r={cfg.core * 2.2} fill="url(#core-glow)" />
      <circle r={cfg.core} fill="#0b0b0b" stroke="#fff" strokeOpacity="0.3" strokeWidth={compact ? 1.5 : 1} />
      <circle r={cfg.core * 1.22} fill="none" stroke="#fff" strokeOpacity="0.12" strokeDasharray="1 5" />
      <text
        y={compact ? -6 : -4}
        textAnchor="middle"
        className={`fill-paper font-sans tracking-[0.2em] ${compact ? "text-[22px]" : "text-[15px]"}`}
      >
        CORE
      </text>
      <text
        y={compact ? 22 : 16}
        textAnchor="middle"
        className={`fill-ash font-mono tracking-[0.24em] ${compact ? "text-[13px]" : "text-[9px]"}`}
      >
        FULL STACK
      </text>

      {/* Technology nodes — the active orbit is painted last so its labels sit on top. */}
      {layout
        .map((orbit, i) => [orbit, i])
        .sort(([a], [b]) => (a.id === active) - (b.id === active))
        .map(([orbit, i]) => {
        const isActive = orbit.id === active;
        const labelClass = compact
          ? isActive
            ? "fill-paper opacity-100 text-[34px]"
            : "fill-ash opacity-50 text-[26px]"
          : isActive
            ? "fill-paper opacity-100 text-[15px]"
            : "fill-ash opacity-40 text-[15px]";
        return (
          <g key={orbit.id} data-orbit={orbit.id}>
            {orbit.items.map((item, j) => (
              <g
                key={item}
                ref={(el) => {
                  if (!el) return;
                  nodes.current[i] = nodes.current[i] || [];
                  nodes.current[i][j] = {
                    g: el,
                    dot: el.querySelector("circle"),
                    label: el.querySelector("text"),
                  };
                }}
                className="cursor-pointer"
                onPointerEnter={(e) => isMouse(e) && onActivate(orbit.id)}
                onClick={() => onActivate(orbit.id)}
                style={{ opacity: "var(--depth, 1)" }}
              >
                <circle r="4" className={`transition-[fill] duration-500 ${isActive ? "fill-paper" : "fill-ash"}`} />
                <text
                  x={compact ? 0 : 12}
                  y={compact ? -18 : 0}
                  dy={compact ? 0 : "0.35em"}
                  textAnchor={compact ? "middle" : "start"}
                  className={`font-sans transition-[opacity,fill,font-size] duration-700 ${labelClass}`}
                >
                  {item}
                </text>
              </g>
            ))}
          </g>
        );
        })}
    </svg>
  );
}
