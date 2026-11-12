/**
 * Global identity & contact configuration.
 *
 * TODO(Adel): review every value below before going live.
 *  - `email` is intentionally empty: set it to the address you want public.
 *    While empty, the email row is hidden and the contact CTA falls back to LinkedIn.
 *  - Verify the LinkedIn URL.
 */
export const site = {
  name: "Adel Anas",
  role: "Full Stack Developer",
  title: "Adel Anas — Full Stack Developer",
  description:
    "I build modern, scalable and high-performance digital products, combining engineering precision with creative thinking.",
  email: "",
  available: true,
  socials: {
    github: "https://github.com/Adel-Anas",
    linkedin: "https://www.linkedin.com/in/adel-anas",
  },
  repository: "https://github.com/Adel-Anas/Personal-Portfolio",
};

/** Section registry — drives navigation, scroll tracking and the particle scene. */
export const sections = [
  { id: "home", label: "Home", index: "01" },
  { id: "about", label: "About", index: "02" },
  { id: "expertise", label: "Expertise", index: "03" },
  { id: "projects", label: "Projects", index: "04" },
  { id: "experience", label: "Experience", index: "05" },
  { id: "contact", label: "Contact", index: "06" },
];
