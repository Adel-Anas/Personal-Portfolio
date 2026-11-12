"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

/**
 * Masked line-by-line text reveal, triggered when the element scrolls into view.
 * Re-splits automatically on resize (SplitText autoSplit).
 */
export default function RevealText({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  stagger = 0.09,
  start = "top 88%",
  ...rest
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(el, { visibility: "visible" });
      if (reduced) return;
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.5,
            stagger,
            delay,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start, once: true },
          }),
      });
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} data-reveal className={className} {...rest}>
      {children}
    </Tag>
  );
}
