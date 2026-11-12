"use client";

import { useEffect, useRef, useState } from "react";
import { useSectionScene } from "@/lib/useSectionScene";
import { skillOrbits } from "@/data/skills";
import SectionHeader from "@/components/ui/SectionHeader";
import FadeIn from "@/components/ui/FadeIn";
import OrbitalDiagram from "./OrbitalDiagram";

export default function Expertise() {
  const root = useRef(null);
  const [active, setActive] = useState(skillOrbits[0].id);
  const [reduced, setReduced] = useState(false);
  const [compact, setCompact] = useState(false);
  useSectionScene(root, "expertise");

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const total = skillOrbits.reduce((n, o) => n + o.items.length, 0);

  return (
    <section
      id="expertise"
      ref={root}
      aria-labelledby="expertise-title"
      className="relative px-gutter py-[clamp(7rem,18vh,12rem)]"
    >
      <SectionHeader
        index="03"
        label="Expertise"
        title={<span id="expertise-title">Technical universe.</span>}
        aside={
          <FadeIn as="p" className="text-[0.98rem] leading-relaxed text-ash">
            {skillOrbits.length} orbits, {total} technologies, one system. Select an orbit to trace how each layer
            connects back to the core.
          </FadeIn>
        }
      />

      <div className="mt-[clamp(3rem,10vh,7rem)] grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
        {/* Category index — the readable, accessible view of the same data. */}
        <div className="order-2 lg:order-1 lg:col-span-4">
          <ul className="border-t border-line" role="list">
            {skillOrbits.map((orbit, i) => {
              const isActive = orbit.id === active;
              return (
                <li key={orbit.id} className="border-b border-line">
                  <button
                    type="button"
                    onPointerEnter={(e) => e.pointerType === "mouse" && setActive(orbit.id)}
                    onFocus={() => setActive(orbit.id)}
                    onClick={() => setActive(orbit.id)}
                    aria-expanded={isActive}
                    aria-controls={`orbit-panel-${orbit.id}`}
                    className="group flex w-full touch-manipulation items-baseline gap-5 py-5 text-left [-webkit-tap-highlight-color:transparent]"
                  >
                    <span className="label-tech w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={`flex-1 text-[clamp(1.25rem,1.7vw,1.6rem)] tracking-[-0.02em] transition-[color,transform] duration-700 ease-[var(--ease-expo)] ${
                        isActive ? "translate-x-2 text-paper" : "text-ash group-hover:text-mist"
                      }`}
                    >
                      {orbit.label}
                    </span>
                    <span className="label-tech tabular-nums">{String(orbit.items.length).padStart(2, "0")}</span>
                  </button>
                  <div
                    id={`orbit-panel-${orbit.id}`}
                    className={`grid transition-[grid-template-rows,opacity] duration-700 ease-[var(--ease-expo)] ${
                      isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pl-11 text-[0.92rem] text-ash">{orbit.caption}</p>
                      <p className="pb-6 pl-11 pt-3 text-[0.95rem] leading-relaxed text-paper">
                        {orbit.items.join("  ·  ")}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <FadeIn className="order-1 -mx-2 lg:order-2 lg:col-span-8 lg:mx-0" y={40}>
          <OrbitalDiagram
            orbits={skillOrbits}
            active={active}
            onActivate={setActive}
            reducedMotion={reduced}
            compact={compact}
          />
        </FadeIn>
      </div>
    </section>
  );
}
