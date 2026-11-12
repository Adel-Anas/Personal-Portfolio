/**
 * Selected work.
 *
 * Entries marked `sample: true` are layout samples and display a visible
 * "Sample entry" tag on the site. TODO(Adel): replace them with your real
 * projects (name, description, stack, links, screenshot) and remove the flag.
 *
 * `image` is optional: put a screenshot in /public/projects and reference it
 * (e.g. "/projects/my-app.jpg"). Without it, a generative cover is rendered.
 */
export const projects = [
  {
    id: "aether",
    name: "Aether",
    category: "Creative Development",
    year: "2026",
    description:
      "This portfolio. A custom WebGL particle engine written in GLSL that morphs between forms as you scroll, reacts to the cursor with propagating waves, and degrades gracefully on low-power devices.",
    stack: ["Next.js", "React Three Fiber", "GLSL", "GSAP", "Tailwind CSS"],
    image: null,
    live: "/",
    source: "https://github.com/Adel-Anas/Personal-Portfolio",
    sample: false,
  },
  {
    id: "commerce",
    name: "Northwind Commerce",
    category: "Full Stack · E-commerce",
    year: "—",
    description:
      "A MERN storefront with product catalogue, cart and checkout flows, a role-based admin dashboard and a REST API structured around the MVC pattern.",
    stack: ["React.js", "Redux Toolkit", "Node.js", "Express.js", "MongoDB", "JWT"],
    image: null,
    live: null,
    source: null,
    sample: true,
  },
  {
    id: "workspace",
    name: "Pulse Workspace",
    category: "SaaS · Collaboration",
    year: "—",
    description:
      "A team workspace with authentication, boards and real-time status, built with Next.js on the front and Supabase for data, storage and access policies.",
    stack: ["Next.js", "Tailwind CSS", "Supabase", "Vercel"],
    image: null,
    live: null,
    source: null,
    sample: true,
  },
  {
    id: "api",
    name: "Ledger API",
    category: "Backend · Architecture",
    year: "—",
    description:
      "A containerised REST service with layered architecture, hashed credentials, token-based sessions and an automated test suite covering every route.",
    stack: ["Node.js", "Express.js", "MySQL", "Docker", "Jest", "Postman"],
    image: null,
    live: null,
    source: null,
    sample: true,
  },
];
