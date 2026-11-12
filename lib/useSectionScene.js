"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { experienceStore } from "@/lib/store";

/**
 * Marks a section as the active "scene" while it occupies the viewport centre.
 * The particle director and the navigation both react to this.
 */
export function useSectionScene(ref, id) {
  useEffect(() => {
    if (!ref.current) return;
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (self.isActive) experienceStore.set({ scene: id });
      },
    });
    return () => trigger.kill();
  }, [ref, id]);
}
