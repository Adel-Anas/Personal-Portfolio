"use client";

import { useEffect, useMemo, useRef } from "react";

const TILT = (-11 * Math.PI) / 180;
const COS_T = Math.cos(TILT);
const SIN_T = Math.sin(TILT);
const RY_RATIO = 0.5;
const RADII = [150, 225, 300, 375, 450];

/**
 * Orbital map of the stack. Each category is an elliptical orbit; technologies
 * travel along it. Positions are written straight to the DOM every frame, so
 * the animation never touches React state.
 */
export default function OrbitalDiagram({ orbits, active, onActivate, reducedMotion }) {
  const svg = useRef(null);
  const nodes = useRef([]);
  const links = useRef([]);
  const running = useRef(true);

  const layout = useMemo(
    () =>
      orbits.map((orbit, i) => ({
        ...orbit,
        rx: RADII[i] ?? 150 + i * 75,
        ry: (RADII[i] ?? 150 + i * 75) * RY_RATIO,
        speed: (i % 2 ? -1 : 1) * (0.045 + (orbits.length - i) * 0.012),
        offset: i * 0.9,
      })),
    [orbits]
  );

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => (running.current = entry.isIntersecting), { threshold: 0 });
    io.observe(el);

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
          const x = ex * COS_T - ey * SIN_T;
          const y = ex * SIN_T + ey * COS_T;
          const depth = (Math.sin(a) + 1) / 2; // 0 = back, 1 = front
          node.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          node.dot.setAttribute("r", (2.6 + depth * 2.4).toFixed(2));
          node.g.style.setProperty("--depth", (0.45 + depth * 0.55).toFixed(2));
          const left = x < -20;
          node.label.setAttribute("text-anchor", left ? "end" : "start");
          node.label.setAttribute("x", left ? -12 : 12);
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
  }, [layout, reducedMotion]);

  const tiltDeg = (TILT * 180) / Math.PI;

  return (
    <svg
      ref={svg}
      viewBox="-500 -300 1000 600"
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
      <g transform={`rotate(${tiltDeg})`}>
        {layout.map((orbit) => {
          const isActive = orbit.id === active;
          return (
            <ellipse
              key={orbit.id}
              rx={orbit.rx}
              ry={orbit.ry}
              fill="none"
              stroke="#fff"
              strokeOpacity={isActive ? 0.42 : 0.1}
              strokeDasharray={isActive ? "none" : "2 6"}
              className="cursor-pointer transition-[stroke-opacity] duration-700"
              strokeWidth={isActive ? 1 : 1}
              onMouseEnter={() => onActivate(orbit.id)}
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
              strokeOpacity={orbit.id === active ? 0.16 : 0}
              className="transition-[stroke-opacity] duration-700"
            />
          ))
        )}
      </g>

      {/* Core */}
      <circle r="120" fill="url(#core-glow)" />
      <circle r="54" fill="#0b0b0b" stroke="#fff" strokeOpacity="0.3" />
      <circle r="66" fill="none" stroke="#fff" strokeOpacity="0.12" strokeDasharray="1 5" />
      <text y="-4" textAnchor="middle" className="fill-paper font-sans text-[15px] tracking-[0.2em]">
        CORE
      </text>
      <text y="16" textAnchor="middle" className="fill-ash font-mono text-[9px] tracking-[0.24em]">
        FULL STACK
      </text>

      {/* Technology nodes */}
      {layout.map((orbit, i) => {
        const isActive = orbit.id === active;
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
                onMouseEnter={() => onActivate(orbit.id)}
                style={{ opacity: "var(--depth, 1)" }}
              >
                <circle r="4" className={`transition-[fill] duration-500 ${isActive ? "fill-paper" : "fill-ash"}`} />
                <text
                  x="12"
                  dy="0.35em"
                  className={`font-sans text-[15px] transition-[opacity,fill] duration-700 max-md:text-[26px] ${
                    isActive ? "fill-paper opacity-100" : "fill-ash opacity-40 max-md:opacity-0"
                  }`}
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
