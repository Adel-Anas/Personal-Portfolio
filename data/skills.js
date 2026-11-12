/**
 * Technical universe — each category becomes an orbit in the Expertise diagram.
 * Orbits are drawn from the inside out in this order.
 */
export const skillOrbits = [
  {
    id: "frontend",
    label: "Frontend",
    caption: "Interfaces that feel fast, precise and alive.",
    items: ["HTML", "CSS", "JavaScript", "React.js", "Next.js", "Tailwind CSS"],
  },
  {
    id: "backend",
    label: "Backend",
    caption: "Secure, structured services built to scale.",
    items: ["Node.js", "Express.js", "REST APIs", "MVC", "JWT", "Bcrypt"],
  },
  {
    id: "data",
    label: "Databases",
    caption: "Data models designed around real usage.",
    items: ["MongoDB", "MySQL", "MariaDB", "Supabase"],
  },
  {
    id: "state",
    label: "State & Testing",
    caption: "Predictable state, verified behaviour.",
    items: ["Redux Toolkit", "Jest", "React Testing Library"],
  },
  {
    id: "tools",
    label: "Tools & Ecosystem",
    caption: "A delivery pipeline from commit to production.",
    items: ["Git", "GitHub", "GitLab", "Docker", "Postman", "VS Code", "Vercel", "Netlify"],
  },
];
