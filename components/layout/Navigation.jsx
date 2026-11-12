"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { experienceStore } from "@/lib/store";
import { scrollToSection, getLenis } from "@/lib/scroll";
import { sections, site } from "@/data/site";
import Logo from "@/components/ui/Logo";

/**
 * Minimal navigation. A single dot glides to the active section; on small
 * screens the links move into a full-screen editorial menu.
 */
export default function Navigation() {
  const root = useRef(null);
  const linksRef = useRef(null);
  const dot = useRef(null);
  const menu = useRef(null);
  const [active, setActive] = useState("home");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => experienceStore.subscribe((s) => setActive(s.scene)), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Move the indicator dot next to the active link.
  useLayoutEffect(() => {
    const place = () => {
      const list = linksRef.current;
      const link = list?.querySelector(`[data-id="${active}"]`);
      if (!link || !dot.current) return;
      // Measured with rects: the <li>s carry transforms, which would skew offsetLeft.
      const x = link.getBoundingClientRect().left - list.getBoundingClientRect().left;
      gsap.to(dot.current, {
        x: x - 14,
        duration: 0.9,
        ease: "expo.out",
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active]);

  // Entrance once the preloader has finished.
  useGSAP(
    (_, contextSafe) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const items = gsap.utils.toArray("[data-nav-item]", root.current);
      gsap.set(root.current, { visibility: "visible" });
      if (reduced) return;
      gsap.set(items, { autoAlpha: 0, y: -14 });
      const play = contextSafe(() =>
        gsap.to(items, { autoAlpha: 1, y: 0, duration: 1.4, stagger: 0.06, delay: 0.5, ease: "expo.out" })
      );
      if (experienceStore.get().ready) return play();
      const unsub = experienceStore.subscribe((s) => {
        if (s.ready) {
          unsub();
          play();
        }
      });
      return unsub;
    },
    { scope: root }
  );

  // Mobile menu open / close.
  useGSAP(
    () => {
      const el = menu.current;
      if (!el) return;
      const lenis = getLenis();
      if (open) {
        lenis?.stop();
        gsap.set(el, { visibility: "visible" });
        gsap.fromTo(el, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1, ease: "expo.inOut" });
        gsap.fromTo(
          el.querySelectorAll("[data-menu-item]"),
          { yPercent: 110 },
          { yPercent: 0, duration: 1.2, stagger: 0.05, delay: 0.35, ease: "expo.out" }
        );
      } else {
        lenis?.start();
        gsap.to(el, {
          clipPath: "inset(0 0 100% 0)",
          duration: 0.8,
          ease: "expo.inOut",
          onComplete: () => gsap.set(el, { visibility: "hidden" }),
        });
      }
    },
    { dependencies: [open] }
  );

  const go = (id) => (e) => {
    e.preventDefault();
    setOpen(false);
    scrollToSection(id);
  };

  return (
    <>
      <header
        ref={root}
        data-reveal
        className="fixed inset-x-0 top-0 z-50 px-gutter pt-6 md:pt-[2.6rem]"
      >
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink via-ink/70 to-transparent transition-opacity duration-700 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        <nav className="relative flex items-center justify-between" aria-label="Primary">
          <a href="#home" onClick={go("home")} data-nav-item className="group flex items-center gap-6" aria-label="Adel Anas — home">
            <Logo className="h-9 w-auto text-paper transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-95 md:h-[2.75rem]" />
            <span className="h-9 w-px bg-line-strong md:h-10" />
            <span className="text-[0.75rem] font-normal tracking-[0.42em] text-paper md:text-[0.8125rem]">ADEL ANAS</span>
          </a>

          <ul ref={linksRef} className="relative hidden items-center gap-[2.9rem] lg:flex">
            <span
              ref={dot}
              className="absolute left-0 top-1/2 -mt-[2.5px] size-[5px] rounded-full bg-paper"
              aria-hidden="true"
            />
            {sections.map((s) => (
              <li key={s.id} data-nav-item>
                <a
                  href={`#${s.id}`}
                  data-id={s.id}
                  onClick={go(s.id)}
                  aria-current={active === s.id ? "true" : undefined}
                  className={`text-[0.9375rem] transition-colors duration-500 hover:text-paper ${
                    active === s.id ? "text-paper" : "text-ash"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3" data-nav-item>
            {site.available && (
              <a
                href="#contact"
                onClick={go("contact")}
                className="hidden items-center gap-2.5 rounded-full border border-line-strong px-4 py-2.5 text-[0.8125rem] text-paper transition-colors duration-500 hover:border-paper/60 sm:flex"
              >
                <span className="size-[6px] rounded-full bg-paper [animation:pulse-dot_2.4s_ease-in-out_infinite]" />
                Available for hire
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="flex h-10 items-center gap-3 lg:hidden"
            >
              <span className="label-tech text-paper">{open ? "Close" : "Menu"}</span>
              <span className="relative block h-2.5 w-6" aria-hidden="true">
                <span
                  className={`absolute left-0 h-px w-full bg-paper transition-transform duration-500 ${
                    open ? "top-1/2 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 h-px w-full bg-paper transition-transform duration-500 ${
                    open ? "top-1/2 -rotate-45" : "bottom-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <div
        ref={menu}
        id="mobile-menu"
        className="invisible fixed inset-0 z-40 flex flex-col justify-end bg-ink-2 px-gutter pb-12 lg:hidden"
        style={{ clipPath: "inset(0 0 100% 0)" }}
      >
        <ul className="flex flex-col gap-1">
          {sections.map((s) => (
            <li key={s.id} className="overflow-hidden">
              <a
                href={`#${s.id}`}
                onClick={go(s.id)}
                data-menu-item
                className="flex items-baseline gap-5 py-1 text-[clamp(2.5rem,11vw,4rem)] leading-[1.05] tracking-[-0.03em]"
              >
                <span className="label-tech">{s.index}</span>
                <span className={active === s.id ? "text-paper" : "text-ash"}>{s.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex items-center justify-between border-t border-line pt-6">
          <span className="label-tech">Full Stack Developer</span>
          <span className="label-tech text-paper">{site.available ? "Available" : ""}</span>
        </div>
      </div>
    </>
  );
}
