"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import RevealText from "./RevealText";

/**
 * Editorial section opener: index, rule that draws in, technical label, headline.
 */
export default function SectionHeader({ index, label, title, aside, className = "" }) {
  const rule = useRef(null);

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    gsap.from(rule.current, {
      scaleX: 0,
      transformOrigin: "left center",
      duration: 1.8,
      ease: "expo.inOut",
      scrollTrigger: { trigger: rule.current, start: "top 90%", once: true },
    });
  });

  return (
    <header className={className}>
      <div className="flex items-center gap-5">
        <span className="label-tech text-paper">{index}</span>
        <span ref={rule} className="h-px flex-1 bg-line" />
        <span className="label-tech">{label}</span>
      </div>
      <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-end md:justify-between">
        <RevealText as="h2" className="text-display max-w-[14ch] text-[clamp(2.6rem,6.4vw,6.5rem)]">
          {title}
        </RevealText>
        {aside && <div className="md:max-w-sm md:pb-3">{aside}</div>}
      </div>
    </header>
  );
}
