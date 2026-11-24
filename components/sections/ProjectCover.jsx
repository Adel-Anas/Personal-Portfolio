"use client";

import Image from "next/image";
import { useRef } from "react";

/**
 * Project visual. Uses the screenshot when one is provided; otherwise renders
 * a generative monochrome cover (never a fake screenshot).
 */
export default function ProjectCover({ project, index }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const initials = project.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className="group/cover relative aspect-[16/10] w-full overflow-hidden bg-ink-2 [--mx:50%] [--my:50%]"
    >
      <div data-cover-inner className="absolute inset-[-8%] will-change-transform">
        {project.image ? (
          <Image
            src={project.image}
            alt={`${project.name} — preview`}
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            quality={90}
            className="object-cover grayscale transition-[filter,transform] duration-[1.4s] ease-[var(--ease-expo)] group-hover/cover:scale-[1.03] group-hover/cover:grayscale-0"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:16px_16px] opacity-40 transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover/cover:scale-[1.04]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mx)_var(--my),rgba(255,255,255,0.12),transparent_45%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(5,5,5,0.9))]" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
              <ellipse cx="96" cy="52" rx="44" ry="13" transform="rotate(-14 96 52)" stroke="#fff" strokeOpacity="0.14" strokeWidth="0.2" />
              <ellipse cx="96" cy="52" rx="30" ry="30" stroke="#fff" strokeOpacity="0.08" strokeWidth="0.2" strokeDasharray="0.4 1.2" />
              <line x1="96" y1="12" x2="96" y2="92" stroke="#fff" strokeOpacity="0.06" strokeWidth="0.15" />
              <line x1="40" y1="52" x2="152" y2="52" stroke="#fff" strokeOpacity="0.06" strokeWidth="0.15" />
            </svg>
            <span className="absolute bottom-[14%] left-[13%] select-none text-[clamp(6rem,13vw,13rem)] leading-[0.8] tracking-[-0.06em] text-outline transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover/cover:-translate-y-2">
              {initials}
            </span>
            <span className="label-tech absolute right-[13%] top-[16%] text-right text-[0.6rem] leading-[1.8] text-smoke">
              {project.stack.slice(0, 3).map((t) => (
                <span key={t} className="block">{t}</span>
              ))}
            </span>
          </>
        )}
      </div>

      {/* Frame chrome */}
      <div className="pointer-events-none absolute inset-0 border border-line" />
      <span className="label-tech absolute left-5 top-5 text-[0.625rem] text-mist">
        {String(index + 1).padStart(2, "0")} — {project.category}
      </span>
      <span className="label-tech absolute right-5 top-5 text-[0.625rem]">{project.year}</span>
      <span className="label-tech absolute bottom-5 right-5 flex items-center gap-2 text-[0.625rem]">
        <span className="size-1 rounded-full bg-paper" />
        {project.image ? "Preview" : "Cover"}
      </span>
    </div>
  );
}
