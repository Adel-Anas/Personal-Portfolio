import { GLYPH } from "@/components/experience/shapes";

const S = 80;
const toPath = (poly) =>
  "M" + poly.map(([x, y]) => `${(x * S).toFixed(2)},${(-y * S).toFixed(2)}`).join(" L") + " Z";

/** Chevron body + inner leg — the exact geometry used by the particle glyph. */
export const GLYPH_PATH = `${toPath(GLYPH.body)} ${toPath(GLYPH.inner)}`;

/** The Adel Anas "A" mark. */
export default function Logo({ className = "", title = "Adel Anas", ...rest }) {
  return (
    <svg viewBox="-100 -82 200 164" className={className} role="img" aria-label={title} {...rest}>
      <path d={GLYPH_PATH} fill="currentColor" />
    </svg>
  );
}
