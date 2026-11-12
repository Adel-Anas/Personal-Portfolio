"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { experienceStore } from "@/lib/store";
import Logo from "@/components/ui/Logo";

/**
 * Short cinematic opening: the mark fades in over a counter, then the curtain
 * lifts and hands over to the particle intro. Kept under two seconds.
 */
export default function Preloader() {
  const root = useRef(null);
  const counter = useRef(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);

      const finish = () => {
        experienceStore.set({ ready: true });
        ScrollTrigger.refresh();
      };

      if (reduced) {
        gsap.to(root.current, { autoAlpha: 0, duration: 0.3, onStart: finish, onComplete: () => setDone(true) });
        return;
      }

      const progress = { value: 0 };
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from("[data-pre-logo]", { autoAlpha: 0, scale: 0.9, duration: 1.4 })
        .from("[data-pre-line]", { scaleX: 0, duration: 1.6, ease: "expo.inOut" }, 0)
        .from("[data-pre-meta]", { autoAlpha: 0, y: 8, duration: 1, stagger: 0.08 }, 0.2)
        .to(
          progress,
          {
            value: 100,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
              if (counter.current) counter.current.textContent = String(Math.round(progress.value)).padStart(3, "0");
            },
          },
          0
        )
        .to("[data-pre-content]", { autoAlpha: 0, y: -12, duration: 0.6, ease: "power2.in" }, ">")
        .add(finish, "<0.2")
        .to(root.current, { yPercent: -100, duration: 1.2, ease: "expo.inOut" }, "<")
        .add(() => setDone(true));
    },
    { scope: root }
  );

  if (done) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[100] flex items-center justify-center bg-ink" aria-hidden="true">
      <div data-pre-content className="relative flex w-full flex-col items-center px-gutter">
        <Logo className="h-14 w-auto text-paper" data-pre-logo />
        <span data-pre-line className="mt-10 block h-px w-40 origin-left bg-line-strong" />
        <div className="mt-5 flex w-40 justify-between">
          <span data-pre-meta className="label-tech text-[0.625rem]">Aether</span>
          <span data-pre-meta ref={counter} className="label-tech text-[0.625rem] text-paper">000</span>
        </div>
      </div>
    </div>
  );
}
