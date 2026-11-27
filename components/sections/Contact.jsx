"use client";

import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { useSectionScene } from "@/lib/useSectionScene";
import { site } from "@/data/site";
import RevealText from "@/components/ui/RevealText";
import FadeIn from "@/components/ui/FadeIn";
import MagneticButton from "@/components/ui/MagneticButton";
import Footer from "@/components/layout/Footer";

export default function Contact() {
  const root = useRef(null);
  useSectionScene(root, "contact");

  const channels = [
    site.email && { label: "Email", value: site.email, href: `mailto:${site.email}` },
    { label: "LinkedIn", value: "in/adel-anas", href: site.socials.linkedin, external: true },
    { label: "GitHub", value: "@Adel-Anas", href: site.socials.github, external: true },
  ].filter(Boolean);

  const primary = site.email ? `mailto:${site.email}` : site.socials.linkedin;


  return (
    <section
      id="contact"
      data-scene="contact"
      ref={root}
      aria-labelledby="contact-title"
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden px-gutter pt-[clamp(7rem,18vh,12rem)]"
    >
      <div>
        <FadeIn className="flex items-center gap-5">
          <span className="label-tech text-paper">06</span>
          <span className="h-px w-16 bg-line" />
          <span className="label-tech">Contact</span>
        </FadeIn>

        <RevealText
          as="h2"
          id="contact-title"
          stagger={0.14}
          className="mt-10 text-[clamp(3rem,7.2vw,8.5rem)] leading-[0.98] tracking-[-0.045em] text-paper md:mt-14"
        >
          <span className="text-dim">Have an idea?</span>
          <br />
          Let&rsquo;s make it real.
        </RevealText>

        <div className="mt-[clamp(3rem,8vh,5rem)] flex flex-col gap-12 md:flex-row md:items-center md:gap-20">
          <MagneticButton
            href={primary}
            target={site.email ? undefined : "_blank"}
            rel={site.email ? undefined : "noreferrer"}
            className="group relative flex size-[10.5rem] shrink-0 items-center justify-center rounded-full border border-white/40 text-paper shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-colors duration-700 hover:border-paper md:size-[12.5rem]"
          >
            <span className="absolute inset-0 -z-0 scale-0 rounded-full bg-paper transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-100" />
            <ArrowUpRight className="relative size-6 transition-colors duration-500 group-hover:text-ink" strokeWidth={1.3} />
            <span className="relative text-[0.95rem] transition-colors duration-500 group-hover:text-ink">Start a project</span>
          </MagneticButton>

          <FadeIn as="p" className="max-w-sm text-[1.05rem] leading-relaxed text-mist">
            Open to full-time roles, freelance missions and ambitious collaborations. Tell me what you&rsquo;re building —
            I usually reply within a day.
          </FadeIn>
        </div>

        <ul className="mt-[clamp(4rem,10vh,7rem)] grid grid-cols-1 border-t border-line md:grid-cols-3">
          {channels.map((c, i) => (
            <li key={c.label} className="border-b border-line md:border-b-0 md:[&:not(:last-child)]:border-r">
              <FadeIn delay={i * 0.08} y={16}>
                <a
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noreferrer" : undefined}
                  className="group flex items-center justify-between gap-6 py-7 md:px-8 md:first:pl-0"
                >
                  <span className="flex flex-col gap-3">
                    <span className="label-tech">{c.label}</span>
                    <span className="text-[1.15rem] tracking-[-0.01em] text-paper transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-1.5">
                      {c.value}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="size-5 text-ash transition-[transform,color] duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-paper"
                    strokeWidth={1.4}
                  />
                </a>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>

      <Footer />
    </section>
  );
}
