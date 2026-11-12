"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useSectionScene } from "@/lib/useSectionScene";
import { experience } from "@/data/experience";
import SectionHeader from "@/components/ui/SectionHeader";
import RevealText from "@/components/ui/RevealText";
import FadeIn from "@/components/ui/FadeIn";

export default function Experience() {
  const root = useRef(null);
  const track = useRef(null);
  const progress = useRef(null);
  useSectionScene(root, "experience");

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // The timeline draws itself as you read.
      gsap.fromTo(
        progress.current,
        { scaleY: reduced ? 1 : 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: reduced
            ? undefined
            : { trigger: track.current, start: "top 60%", end: "bottom 60%", scrub: 0.5 },
        }
      );
      // Each chapter lights up when the line reaches it.
      gsap.utils.toArray("[data-entry]").forEach((entry) => {
        ScrollTrigger.create({
          trigger: entry,
          start: "top 60%",
          onEnter: () => entry.setAttribute("data-active", "true"),
          onLeaveBack: () => entry.removeAttribute("data-active"),
        });
      });
    },
    { scope: root }
  );

  return (
    <section
      id="experience"
      ref={root}
      aria-labelledby="experience-title"
      className="relative px-gutter py-[clamp(7rem,18vh,12rem)]"
    >
      <SectionHeader
        index="05"
        label="Experience"
        title={<span id="experience-title">Professional journey.</span>}
        aside={
          <FadeIn as="p" className="text-[0.98rem] leading-relaxed text-ash">
            Responsibilities, technical contributions and the disciplines that shaped how I build.
          </FadeIn>
        }
      />

      <ol ref={track} className="relative mt-[clamp(4rem,10vh,7rem)]">
        {/* Rail */}
        <span className="absolute bottom-0 left-[0.3rem] top-0 w-px bg-line md:left-[calc(25%-0.5px)]" aria-hidden="true" />
        <span
          ref={progress}
          className="absolute bottom-0 left-[0.3rem] top-0 w-px origin-top bg-gradient-to-b from-paper via-paper/70 to-paper/20 md:left-[calc(25%-0.5px)]"
          aria-hidden="true"
        />

        {experience.map((item) => (
          <li
            key={`${item.period}-${item.role}`}
            data-entry
            className="group relative grid grid-cols-1 gap-y-4 pb-[clamp(4rem,10vh,7rem)] pl-10 last:pb-0 md:grid-cols-12 md:gap-x-8 md:pl-0"
          >
            {/* Node */}
            <span
              className="absolute left-0 top-[0.55rem] size-[0.65rem] rounded-full border border-line-strong bg-ink transition-[background-color,box-shadow,border-color] duration-700 group-data-[active]:border-paper group-data-[active]:bg-paper group-data-[active]:shadow-[0_0_0_6px_rgba(245,245,245,0.08)] md:left-[calc(25%-0.325rem)]"
              aria-hidden="true"
            />

            <div className="md:col-span-3 md:pr-10 md:text-right">
              <span className="label-tech transition-colors duration-700 group-data-[active]:text-paper">{item.period}</span>
            </div>

            <div className="md:col-span-6 md:col-start-5">
              <RevealText
                as="h3"
                className="text-[clamp(1.9rem,3.2vw,3.25rem)] leading-[1] tracking-[-0.035em] text-ash transition-colors duration-700 group-data-[active]:text-paper"
              >
                {item.role}
              </RevealText>
              <FadeIn as="p" className="label-tech mt-4">
                {item.org}
              </FadeIn>
              <FadeIn as="p" delay={0.05} className="mt-6 max-w-xl text-[1rem] leading-relaxed text-mist">
                {item.summary}
              </FadeIn>
              <FadeIn as="ul" delay={0.1} className="mt-6 space-y-3 text-[0.95rem] text-ash">
                {item.contributions.map((c) => (
                  <li key={c} className="flex gap-4">
                    <span className="mt-[0.7em] h-px w-4 shrink-0 bg-line-strong" aria-hidden="true" />
                    <span>{c}</span>
                  </li>
                ))}
              </FadeIn>
              <FadeIn as="p" delay={0.15} className="label-tech mt-7 text-[0.625rem] leading-relaxed">
                {item.stack.join(" · ")}
              </FadeIn>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
