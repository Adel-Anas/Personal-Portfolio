"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { scrollToSection } from "@/lib/scroll";
import { sections, site } from "@/data/site";

const TICKER = ["Full Stack Developer", "MERN", "Next.js", "Creative engineering", "Scalable products", "Clean code"];

/** Back-to-top control whose ring fills with the page scroll progress. */
function BackToTop() {
  const ring = useRef(null);
  const C = 2 * Math.PI * 46;

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => ring.current?.setAttribute("stroke-dashoffset", String(C * (1 - self.progress))),
    });
    return () => st.kill();
  }, [C]);

  return (
    <button
      type="button"
      onClick={() => scrollToSection("home")}
      aria-label="Back to top"
      className="group relative flex size-[6.5rem] shrink-0 items-center justify-center rounded-full text-paper"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle
          ref={ring}
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="#f5f5f5"
          strokeWidth="1"
          strokeDasharray={C}
          strokeDashoffset={C}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-[10%] scale-0 rounded-full bg-paper transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-100" />
      <ArrowUp
        className="relative size-5 transition-[transform,color] duration-500 group-hover:-translate-y-1 group-hover:text-ink"
        strokeWidth={1.4}
      />
    </button>
  );
}

/**
 * Closing signature of the site.
 *  1. a slow marquee of what I do
 *  2. an editorial index: sections, contact channels, status, back to top
 *  3. the name, full width — solid letters lit by a spotlight that follows the
 *     cursor (and sweeps by itself on touch screens)
 *  4. the credit bar
 */
export default function Footer() {
  const root = useRef(null);
  const mark = useRef(null);

  const channels = [
    { label: "GitHub", href: site.socials.github },
    { label: "LinkedIn", href: site.socials.linkedin },
    site.email && { label: "Email", href: `mailto:${site.email}` },
  ].filter(Boolean);

  useGSAP(
    () => {
      const el = mark.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      gsap.set(q("[data-reveal]"), { visibility: "visible" });
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "45%");
      if (reduced) return;

      // The name rises letter by letter, on both layers at once.
      const chars = q("[data-mark-layer]").flatMap(
        // Mask the whole line, not each letter: per-letter masks are only as wide
        // as the letter's advance and would crop wide glyphs (D, A, S).
        (layer) => SplitText.create(layer, { type: "lines,chars", mask: "lines", linesClass: "mark-line" }).chars
      );
      gsap.from(chars, {
        yPercent: 110,
        duration: 1.8,
        stagger: { each: 0.05, from: "start" },
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 95%", once: true },
      });

      gsap.from(q("[data-foot-item]"), {
        autoAlpha: 0,
        y: 24,
        duration: 1.4,
        stagger: 0.06,
        ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });

      // Spotlight: follows the cursor; on touch screens it sweeps on its own.
      const light = { x: 50, y: 45 };
      const apply = () => {
        el.style.setProperty("--mx", `${light.x}%`);
        el.style.setProperty("--my", `${light.y}%`);
      };
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch) {
        light.x = -10;
        gsap.to(light, { x: 110, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true, onUpdate: apply });
        return;
      }
      const xTo = gsap.quickTo(light, "x", { duration: 0.9, ease: "power3.out", onUpdate: apply });
      const yTo = gsap.quickTo(light, "y", { duration: 0.9, ease: "power3.out", onUpdate: apply });
      const move = (e) => {
        const r = el.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width) * 100);
        yTo(((e.clientY - r.top) / r.height) * 100);
      };
      root.current.addEventListener("pointermove", move);
      return () => root.current?.removeEventListener("pointermove", move);
    },
    { scope: root }
  );

  return (
    <footer ref={root} data-scene="footer" className="relative mt-[clamp(5rem,12vh,8rem)]">
      {/* 1 — Marquee */}
      <div className="relative -mx-[var(--gutter)] overflow-hidden border-y border-line py-5" aria-hidden="true">
        <div className="flex w-max [animation:marquee_48s_linear_infinite]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={`${copy}-${i}`} className="flex items-center">
                  <span className="px-8 text-[clamp(1rem,1.6vw,1.4rem)] tracking-[-0.01em] text-ash">{t}</span>
                  <span className="size-1 rounded-full bg-paper/50" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 2 — Index */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 py-[clamp(3rem,8vh,5rem)] md:grid-cols-12">
        <nav data-foot-item data-reveal aria-label="Footer" className="md:col-span-4">
          <p className="label-tech mb-6">Index</p>
          <ul className="space-y-2.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(s.id);
                  }}
                  className="group inline-flex items-baseline gap-4 text-[1.05rem] text-mist transition-colors duration-500 hover:text-paper"
                >
                  <span className="label-tech w-5 text-[0.6rem]">{s.index}</span>
                  <span className="transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-2">
                    {s.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div data-foot-item data-reveal className="md:col-span-3">
          <p className="label-tech mb-6">Elsewhere</p>
          <ul className="space-y-2.5">
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noreferrer" : undefined}
                  className="group inline-flex items-center gap-2 text-[1.05rem] text-mist transition-colors duration-500 hover:text-paper"
                >
                  {c.label}
                  <ArrowUpRight
                    className="size-4 opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                    strokeWidth={1.5}
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div data-foot-item data-reveal className="col-span-2 md:col-span-3">
          <p className="label-tech mb-6">Status</p>
          <p className="flex items-center gap-3 text-[1.05rem] text-paper">
            <span className="size-[7px] rounded-full bg-paper [animation:pulse-dot_2.4s_ease-in-out_infinite]" />
            {site.available ? "Available for new projects" : "Currently booked"}
          </p>
          <p className="mt-3 max-w-[16rem] text-[0.95rem] leading-relaxed text-ash">
            Full-time roles, freelance missions and ambitious collaborations.
          </p>
        </div>

        <div data-foot-item data-reveal className="col-span-2 flex md:col-span-2 md:justify-end">
          <BackToTop />
        </div>
      </div>

      {/* 3 — Signature */}
      <div
        ref={mark}
        className="relative select-none whitespace-nowrap text-center text-[clamp(3.4rem,15vw,19rem)] font-medium leading-[0.86] tracking-[-0.045em]"
        aria-label="Adel Anas"
        role="img"
      >
        {/* Base: solid letters fading toward the bottom (a mask survives the letter split). */}
        <p
          data-mark-layer
          data-reveal
          className="text-[#6e6e6e] [mask-image:linear-gradient(to_bottom,#000_25%,rgba(0,0,0,0.3)_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_25%,rgba(0,0,0,0.3)_100%)]"
        >
          ADEL ANAS
        </p>
        {/* Spotlight: a bright copy revealed around the light. */}
        <p
          data-mark-layer
          data-reveal
          aria-hidden="true"
          className="absolute inset-0 text-paper [mask-image:radial-gradient(circle_at_var(--mx)_var(--my),#000_0%,rgba(0,0,0,0.55)_10%,transparent_26%)] [-webkit-mask-image:radial-gradient(circle_at_var(--mx)_var(--my),#000_0%,rgba(0,0,0,0.55)_10%,transparent_26%)]"
        >
          ADEL ANAS
        </p>
      </div>

      {/* 4 — Credits */}
      <div className="mt-[clamp(1.5rem,4vh,3rem)] flex flex-col gap-3 border-t border-line py-7 sm:flex-row sm:items-center sm:justify-between">
        <span className="label-tech">© {new Date().getFullYear()} Adel Anas</span>
        <span className="label-tech text-mist">Designed &amp; engineered by Adel Anas</span>
        <span className="label-tech">Next.js · Three.js · GLSL</span>
      </div>
    </footer>
  );
}
