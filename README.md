# Adel Anas — Aether

Personal portfolio of **Adel Anas, Full Stack Developer** — an immersive, monochrome digital experience built around a custom GPU particle engine.

A single field of ~26 000 particles travels through the whole page and changes form with each section:

| Section | Particle form |
| --- | --- |
| 01 Home | The **Aether A** glyph, crossed by an orbiting comet ring |
| 02 About | "The mind" — a banded sphere wrapped in two orbits |
| 03 Expertise | A three-arm spiral galaxy behind the orbital skill map |
| 04 Projects | A flowing wave field |
| 05 Experience | A rotating double helix |
| 06 Contact | The glyph re-forms to close the experience |

The particles react to the cursor (repulsion and propagating ripples) and always settle back into their shape.

## Stack

Next.js (App Router, JavaScript) · React · Tailwind CSS v4 · Three.js / React Three Fiber · custom GLSL · GSAP + ScrollTrigger + SplitText · Lenis · Lucide

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure

```
app/                      layout, page, global design tokens (globals.css)
components/
  experience/             visual effects layer (WebGL) — independent from the UI
    ParticleSystem.jsx    reusable GPU particle system (morphTo / setOpacity API)
    SceneDirector.jsx     per-section choreography of forms, placement and opacity
    shapes.js             seeded point-cloud generators (glyph, sphere, galaxy, wave, helix)
    shaders/particles.js  GLSL: morphing, wave surface, drift, cursor repulsion, ripples
    OrbitRing.jsx         comet ring orbiting the glyph
    StarDust.jsx          deep background field
    ExperienceLayer.jsx   lazy-loads the canvas, device profiling, WebGL fallback
    WebGLFallback.jsx     static dotted-SVG glyph for devices without WebGL
  layout/                 Navigation, Preloader, SmoothScroll
  sections/               Hero, About, Expertise (+ OrbitalDiagram), Projects, Experience, Contact
  ui/                     Logo, RevealText, FadeIn, SectionHeader, MagneticButton, icons
data/                     all content — site, skills, projects, experience
lib/                      gsap registration, render-free store, device profile, scroll helpers
```

### Reusing the particle system

```jsx
const ref = useRef();
<ParticleSystem ref={ref} count={20000} shapes={{ a: createLetterA(20000), b: createMind(20000) }} initialShape="a" pointer={pointer} />
ref.current.morphTo("b", { duration: 2.4, scatter: 0.6 });
ref.current.setOpacity(0.6);
```

Every shape generator returns exactly `count × 3` floats, so any shape can morph into any other. Morphs run on the GPU with a per-particle stagger. When a morph is interrupted, the in-flight positions are baked on the CPU so nothing jumps.

## Performance & accessibility

- The WebGL bundle is code-split and loaded after the page is interactive.
- The particle budget and pixel ratio follow the device tier (desktop / mid / mobile). The DPR drops automatically if frames are slow.
- All per-frame state lives outside React, so there are no re-renders while animating.
- `prefers-reduced-motion`: no smooth scroll, no morph animation, frozen particles, and all content is visible immediately.
- Devices without WebGL get a static SVG rendition of the glyph.

## Content to finish

Edit the files in `data/`:

- `data/site.js` — set `email` (hidden until set) and verify the LinkedIn URL.
- `data/projects.js` — entries flagged `sample: true` display a visible *Sample entry* tag. Replace them with real projects and add screenshots in `public/projects/`.
- `data/experience.js` — replace the chapters with your actual roles, organisations and dates.
