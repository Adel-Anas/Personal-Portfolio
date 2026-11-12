"use client";

import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useSectionScene } from "@/lib/useSectionScene";
import { projects } from "@/data/projects";
import { site } from "@/data/site";
import SectionHeader from "@/components/ui/SectionHeader";
import RevealText from "@/components/ui/RevealText";
import FadeIn from "@/components/ui/FadeIn";
import SampleTag from "@/components/ui/SampleTag";
import ProjectCover from "./ProjectCover";

function ProjectLink({ href, children }) {
  if (!href) return null;
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group/link inline-flex items-center gap-2 text-[0.95rem] text-paper"
    >
      <span className="link-line">{children}</span>
      <ArrowUpRight
        className="size-4 transition-transform duration-500 ease-[var(--ease-expo)] group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
        strokeWidth={1.5}
      />
    </a>
  );
}

function Project({ project, index }) {
  const root = useRef(null);
  const flip = index % 2 === 1;

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const frame = root.current.querySelector("[data-cover-frame]");
      const inner = root.current.querySelector("[data-cover-inner]");
      gsap.set(frame, { visibility: "visible" });
      if (reduced) return;

      // Curtain reveal of the visual, then a slow parallax while it crosses the screen.
      gsap.fromTo(
        frame,
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.8,
          ease: "expo.inOut",
          scrollTrigger: { trigger: frame, start: "top 85%", once: true },
        }
      );
      gsap.fromTo(inner, { scale: 1.18 }, { scale: 1, duration: 2.2, ease: "expo.out", scrollTrigger: { trigger: frame, start: "top 85%", once: true } });
      gsap.fromTo(
        inner,
        { yPercent: -5 },
        { yPercent: 5, ease: "none", scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true } }
      );
      gsap.from(root.current.querySelector("[data-rule]"), {
        scaleX: 0,
        transformOrigin: flip ? "right center" : "left center",
        duration: 1.8,
        ease: "expo.inOut",
        scrollTrigger: { trigger: root.current, start: "top 88%", once: true },
      });
    },
    { scope: root }
  );

  return (
    <article ref={root} className="relative py-[clamp(4rem,10vh,7rem)]" aria-labelledby={`project-${project.id}`}>
      <span data-rule className="absolute inset-x-0 top-0 h-px bg-line" aria-hidden="true" />
      <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12 lg:gap-8">
        <div
          data-cover-frame
          data-reveal
          className={`lg:col-span-7 ${flip ? "lg:order-2 lg:col-start-6" : ""}`}
        >
          <ProjectCover project={project} index={index} />
        </div>

        <div className={`lg:col-span-5 ${flip ? "lg:order-1 lg:col-start-1 lg:pr-10" : "lg:pl-10"}`}>
          <FadeIn className="flex flex-wrap items-center gap-4">
            <span className="label-tech text-paper">{String(index + 1).padStart(2, "0")}</span>
            <span className="h-px w-8 bg-line-strong" />
            <span className="label-tech">{project.category}</span>
            {project.sample && <SampleTag />}
          </FadeIn>

          <RevealText
            as="h3"
            id={`project-${project.id}`}
            className="mt-6 text-[clamp(2.5rem,4.6vw,5rem)] leading-[0.95] tracking-[-0.04em] text-paper"
          >
            {project.name}
          </RevealText>

          <FadeIn as="p" delay={0.1} className="mt-7 max-w-md text-[1rem] leading-relaxed text-mist">
            {project.description}
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8 border-t border-line pt-5">
            <p className="label-tech mb-3">Stack</p>
            <p className="text-[0.92rem] leading-relaxed text-paper/85">{project.stack.join("  /  ")}</p>
          </FadeIn>

          {(project.live || project.source) && (
            <FadeIn delay={0.2} className="mt-8 flex flex-wrap gap-8">
              <ProjectLink href={project.live}>Live demo</ProjectLink>
              <ProjectLink href={project.source}>Source code</ProjectLink>
            </FadeIn>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const root = useRef(null);
  useSectionScene(root, "projects");

  return (
    <section
      id="projects"
      ref={root}
      aria-labelledby="projects-title"
      className="relative px-gutter py-[clamp(7rem,18vh,12rem)]"
    >
      <SectionHeader
        index="04"
        label="Selected work"
        title={<span id="projects-title">Selected work.</span>}
        aside={
          <FadeIn as="p" className="text-[0.98rem] leading-relaxed text-ash">
            <span className="text-paper">({String(projects.length).padStart(2, "0")})</span> products designed and
            engineered end to end — interface, architecture and delivery.
          </FadeIn>
        }
      />

      <div className="mt-[clamp(3rem,8vh,6rem)]">
        {projects.map((p, i) => (
          <Project key={p.id} project={p} index={i} />
        ))}
      </div>

      <FadeIn className="flex items-center justify-between border-t border-line pt-8">
        <span className="label-tech">Archive</span>
        <a href={site.socials.github} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-3 text-paper">
          <span className="link-line text-[1.05rem]">More on GitHub</span>
          <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
        </a>
      </FadeIn>
    </section>
  );
}
