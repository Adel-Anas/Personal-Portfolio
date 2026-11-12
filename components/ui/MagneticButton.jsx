"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/** A link that leans toward the cursor and springs back on leave. */
export default function MagneticButton({ href, children, className = "", strength = 0.32, ...rest }) {
  const ref = useRef(null);
  const inner = useRef(null);

  useGSAP(() => {
    const el = ref.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const ixTo = gsap.quickTo(inner.current, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const iyTo = gsap.quickTo(inner.current, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * strength);
      yTo(dy * strength);
      ixTo(dx * strength * 0.4);
      iyTo(dy * strength * 0.4);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
      ixTo(0);
      iyTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });

  return (
    <a ref={ref} href={href} className={className} {...rest}>
      <span ref={inner} className="relative z-10 flex flex-col items-center gap-3">
        {children}
      </span>
    </a>
  );
}
