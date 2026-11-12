"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { experienceStore, pointer } from "@/lib/store";
import { scrollToSection } from "@/lib/scroll";
import { useSectionScene } from "@/lib/useSectionScene";
import { site } from "@/data/site";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/Icons";

/** Live, low-key technical readout of the cursor position (no React renders). */
function PointerReadout() {
  const x = useRef(null);
  const y = useRef(null);
  useEffect(() => {
    // Only shown on wide screens; don't spend frames on it elsewhere.
    if (!window.matchMedia("(min-width: 1280px)").matches) return;
    let raf;
    const loop = () => {
      if (x.current) x.current.textContent = (pointer.nx >= 0 ? "+" : "−") + Math.abs(pointer.nx).toFixed(3);
      if (y.current) y.current.textContent = (pointer.ny >= 0 ? "+" : "−") + Math.abs(pointer.ny).toFixed(3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span className="tabular-nums">
      X <span ref={x}>+0.000</span>&nbsp;&nbsp;Y <span ref={y}>+0.000</span>
    </span>
  );
}

export default function Hero() {
  const root = useRef(null);
  const content = useRef(null);
  useSectionScene(root, "home");

  useGSAP(
    (_, contextSafe) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Resolve elements now: the intro fires later from another timeline's callback,
      // where string selectors would be scoped to that timeline's context instead.
      const q = gsap.utils.selector(root);
      gsap.set(q("[data-hero]"), { visibility: "visible" });
      if (reduced) return;

      const split = SplitText.create(q("[data-hero-title]"), {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
      });
      gsap.set(split.lines, { yPercent: 115 });
      const eyebrow = q("[data-hero-eyebrow]");
      const fades = q("[data-hero-fade]:not([data-hero-eyebrow])");
      const rule = q("[data-hero-rule]");
      const vline = q("[data-hero-vline]");
      gsap.set([eyebrow, fades], { autoAlpha: 0, y: 24 });
      gsap.set(rule, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(vline, { scaleY: 0, transformOrigin: "top center" });

      const intro = contextSafe(() => {
        const tl = gsap.timeline({ delay: 0.35, defaults: { ease: "expo.out" } });
        tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: 1.4 })
          .to(rule, { scaleX: 1, duration: 1.8, ease: "expo.inOut" }, "<0.1")
          .to(split.lines, { yPercent: 0, duration: 1.8, stagger: 0.12 }, "<0.05")
          .to(fades, { autoAlpha: 1, y: 0, duration: 1.5, stagger: 0.08 }, "<0.45")
          .to(vline, { scaleY: 1, duration: 1.6, ease: "expo.inOut" }, "<0.2");
      });

      let unsub = () => {};
      if (experienceStore.get().ready) intro();
      else
        unsub = experienceStore.subscribe((s) => {
          if (s.ready) {
            unsub();
            intro();
          }
        });

      // Parallax exit: the copy drifts up and dissolves as the hero scrolls away.
      gsap.to(content.current, {
        yPercent: -18,
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom 25%", scrub: true },
      });
      gsap.to(q("[data-hero-chrome]"), {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "25% top", scrub: true },
      });
      gsap.to(q("[data-hero-progress]"), {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.4 },
      });

      return () => unsub();
    },
    { scope: root }
  );

  return (
    <section
      id="home"
      ref={root}
      aria-label="Introduction"
      className="relative flex h-[100svh] min-h-[620px] items-center overflow-hidden px-gutter max-md:items-end max-md:pb-[9svh]"
    >
      {/* Orbital hairlines — quiet structure behind the composition. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1672 941"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
      >
        <ellipse cx="1180" cy="520" rx="760" ry="700" stroke="url(#hero-arc-a)" strokeWidth="1" />
        <ellipse cx="900" cy="300" rx="610" ry="640" stroke="url(#hero-arc-b)" strokeWidth="1" />
        <defs>
          <linearGradient id="hero-arc-a" x1="300" y1="0" x2="800" y2="941" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0.09" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0.035" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hero-arc-b" x1="300" y1="941" x2="900" y2="600" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0.07" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div ref={content} className="relative z-10 w-full">
        <div className="max-w-[47rem]">
          <p data-hero data-hero-fade data-hero-eyebrow data-reveal className="flex items-center gap-5 text-[clamp(0.95rem,1.1vw,1.15rem)] text-paper">
            <span>Full Stack Developer</span>
            <span data-hero-rule className="h-px w-[7.5rem] bg-gradient-to-r from-white/30 to-white/5" aria-hidden="true" />
          </p>

          <h1
            data-hero
            data-hero-title
            data-reveal
            className="mt-[clamp(1.25rem,2.6vh,2rem)] text-[clamp(2.75rem,4.4vw,6.25rem)] font-normal leading-[1.02] tracking-[-0.025em] text-paper"
          >
            Crafting the next
            <br />
            <span className="text-dim">digital</span> experience.
          </h1>

          <p
            data-hero
            data-hero-fade
            data-reveal
            className="mt-[clamp(1.5rem,4vh,2.5rem)] max-w-[34rem] text-[clamp(1rem,1.15vw,1.25rem)] leading-[1.6] text-mist"
          >
            {site.description}
          </p>

          <div data-hero data-hero-fade data-reveal className="mt-[clamp(2rem,5.5vh,3.5rem)] flex flex-wrap items-center gap-x-10 gap-y-6">
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("projects");
              }}
              className="group relative inline-flex h-[3.375rem] items-center gap-4 rounded-full border border-white/55 pl-6 pr-7 text-[0.98rem] text-paper shadow-[0_0_28px_-6px_rgba(255,255,255,0.28),inset_0_0_18px_-8px_rgba(255,255,255,0.35)] transition-[border-color,box-shadow] duration-700 hover:border-white/90 hover:shadow-[0_0_38px_-4px_rgba(255,255,255,0.4),inset_0_0_18px_-6px_rgba(255,255,255,0.45)]"
            >
              <span className="size-[6px] rounded-full bg-paper transition-transform duration-700 group-hover:scale-150" />
              <span className="pl-1">Explore my work</span>
              <ArrowRight
                className="size-[1.1rem] transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-1.5"
                strokeWidth={1.4}
              />
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("about");
              }}
              className="link-line text-[0.98rem] text-paper"
            >
              Discover my journey
            </a>
          </div>
        </div>
      </div>

      {/* Bottom-left: scroll cue */}
      <div data-hero-chrome className="absolute bottom-[clamp(1.5rem,6vh,4rem)] left-[var(--gutter)] z-10 hidden items-stretch gap-6 md:flex">
        <span data-hero data-hero-vline data-reveal className="w-px bg-line-strong" aria-hidden="true" />
        <div data-hero data-hero-fade data-reveal className="flex flex-col gap-4 py-1">
          <span className="relative block h-[1.9rem] w-[1.15rem] rounded-full border border-white/50" aria-hidden="true">
            <span className="absolute left-1/2 top-[0.35rem] -ml-px h-[0.35rem] w-[2px] rounded-full bg-paper [animation:scroll-wheel_1.8s_var(--ease-smooth)_infinite]" />
          </span>
          <span className="text-[0.8125rem] tracking-[0.22em] text-mist">Scroll to explore</span>
        </div>
      </div>

      {/* Bottom-right: socials + page progress */}
      <div
        data-hero-chrome
        className="absolute bottom-[clamp(1.5rem,6vh,4rem)] right-[var(--gutter)] z-10 hidden items-center gap-8 sm:flex"
      >
        <div data-hero data-hero-fade data-reveal className="flex items-center gap-7 text-paper/90">
          <a href={site.socials.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="transition-opacity hover:opacity-60">
            <GitHubIcon className="size-[1.3rem]" />
          </a>
          <a href={site.socials.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="transition-opacity hover:opacity-60">
            <LinkedInIcon className="size-[1.15rem]" />
          </a>
          {site.email && (
            <a href={`mailto:${site.email}`} aria-label="Email" className="transition-opacity hover:opacity-60">
              <Mail className="size-[1.25rem]" strokeWidth={1.5} />
            </a>
          )}
        </div>
        <span className="h-8 w-px bg-line-strong" aria-hidden="true" />
        <div data-hero data-hero-fade data-reveal className="relative h-px w-[4.25rem] bg-white/15" aria-label="Page progress">
          <span data-hero-progress className="absolute inset-0 origin-left scale-x-[0.08] bg-gradient-to-r from-white/20 to-white/80" />
          <span className="absolute -right-[3px] -top-[2.5px] size-[6px] rounded-full bg-paper" />
        </div>
      </div>

      {/* Technical detail — right edge. */}
      <div
        data-hero-chrome
        className="label-tech pointer-events-none absolute right-[var(--gutter)] top-1/2 z-10 hidden origin-right -translate-y-1/2 translate-x-[calc(50%-0.5rem)] rotate-90 text-[0.6rem] text-smoke xl:block"
      >
        <span data-hero data-hero-fade data-reveal className="flex items-center gap-4">
          <span>Aether · Particle field</span>
          <span className="h-px w-10 bg-line" />
          <PointerReadout />
        </span>
      </div>
    </section>
  );
}
