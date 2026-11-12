"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/** Soft rise + fade for non-typographic blocks. */
export default function FadeIn({ as: Tag = "div", children, className = "", delay = 0, y = 28, start = "top 90%", ...rest }) {
  const ref = useRef(null);
  useGSAP(
    () => {
      const el = ref.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return gsap.set(el, { visibility: "visible" });
      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        { autoAlpha: 1, y: 0, duration: 1.4, delay, ease: "expo.out", scrollTrigger: { trigger: el, start, once: true } }
      );
    },
    { scope: ref }
  );
  return (
    <Tag ref={ref} data-reveal className={className} {...rest}>
      {children}
    </Tag>
  );
}
