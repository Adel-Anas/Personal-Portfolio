"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { experienceStore } from "@/lib/store";

/**
 * Marks a section as the active "scene" while it occupies the viewport centre.
 * The particle director and the navigation both react to this.
 *
 * Sub-scenes (e.g. "about:detail") pass the parent id as `fallback`, so
 * scrolling back up out of them restores the parent scene.
 */
export function useSectionScene(ref, id, fallback) {
  useEffect(() => {
    if (!ref.current) return;
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (self.isActive) experienceStore.set({ scene: id });
        else if (fallback && self.direction < 0 && experienceStore.get().scene === id) {
          experienceStore.set({ scene: fallback });
        }
      },
    });
    return () => trigger.kill();
  }, [ref, id, fallback]);
}
