"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { useSectionScene } from "@/lib/useSectionScene";
import SectionHeader from "@/components/ui/SectionHeader";
import RevealText from "@/components/ui/RevealText";
import FadeIn from "@/components/ui/FadeIn";

const PROFILE = [
  { k: "Discipline", v: "Full Stack Developer" },
  { k: "Stack", v: "MERN — MongoDB, Express, React, Node" },
  { k: "Frontend", v: "Modern frontend engineering" },
  { k: "Backend", v: "API & backend architecture" },
  { k: "Focus", v: "Scalable, maintainable applications" },
];

const PILLARS = [
  {
    n: "01",
    word: "Design",
    text: "Every product starts as a question about people. I shape interfaces around clarity, rhythm and intent before a single component exists.",
  },
  {
    n: "02",
    word: "Engineer",
    text: "Clean architecture, explicit data flows and tested behaviour — systems that stay understandable as they grow.",
  },
  {
    n: "03",
    word: "Build",
    text: "From the database schema to the final interaction, I ship complete products that are fast, secure and ready to scale.",
  },
];

export default function About() {
  const root = useRef(null);
  const statement = useRef(null);
  useSectionScene(root, "about");

  useGSAP(
    () => {
      const el = statement.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(el, { visibility: "visible" });
      if (reduced) return;
      // Words light up one after another as the statement is read.
      SplitText.create(el, {
        type: "words",
        autoSplit: true,
        onSplit: (self) =>
          gsap.fromTo(
            self.words,
            { opacity: 0.14 },
            {
              opacity: 1,
              ease: "none",
              stagger: 0.1,
              scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 50%", scrub: 0.6 },
            }
          ),
      });
    },
    { scope: root }
  );

  return (
    <section id="about" ref={root} aria-labelledby="about-title" className="relative px-gutter py-[clamp(7rem,18vh,12rem)]">
      <SectionHeader index="02" label="About" title={<span id="about-title">The mind behind the code.</span>} />

      <p
        ref={statement}
        data-reveal
        className="mt-[clamp(4rem,12vh,8rem)] max-w-[22ch] text-[clamp(1.85rem,3.9vw,4rem)] leading-[1.12] tracking-[-0.025em] text-paper md:max-w-[24ch]"
      >
        I don&rsquo;t just write code. I design, engineer and build digital products&nbsp;— where engineering
        precision meets creative thinking, from the first pixel to the last query.
      </p>

      <div className="mt-[clamp(5rem,14vh,9rem)] grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8">
        {/* Profile index */}
        <div className="lg:col-span-4">
          <FadeIn as="p" className="label-tech mb-8">
            Profile / Index
          </FadeIn>
          <dl className="border-t border-line">
            {PROFILE.map((row, i) => (
              <FadeIn
                key={row.k}
                delay={i * 0.06}
                y={14}
                className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-line py-5 text-[0.95rem]"
              >
                <dt className="label-tech pt-[0.35em]">{row.k}</dt>
                <dd className="text-paper">{row.v}</dd>
              </FadeIn>
            ))}
          </dl>
        </div>

        {/* Pillars */}
        <ol className="lg:col-span-7 lg:col-start-6">
          {PILLARS.map((p) => (
            <li key={p.n} className="group border-t border-line py-9 last:border-b md:py-11">
              <div className="grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.1fr)] md:gap-x-10">
                <span className="label-tech pt-3">{p.n}</span>
                <RevealText
                  as="h3"
                  className="text-[clamp(2.4rem,4.6vw,4.75rem)] leading-none tracking-[-0.04em] text-outline transition-[color,-webkit-text-stroke-color] duration-700 group-hover:text-paper"
                >
                  {p.word}
                </RevealText>
                <FadeIn
                  as="p"
                  className="col-start-2 mt-5 max-w-md text-[0.98rem] leading-relaxed text-ash transition-colors duration-700 group-hover:text-mist md:col-start-3 md:mt-1"
                >
                  {p.text}
                </FadeIn>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
