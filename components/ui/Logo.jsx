import { GLYPH } from "@/components/experience/shapes";

const S = 80;
const pt = ([x, y]) => `${(x * S).toFixed(1)},${(-y * S).toFixed(1)}`;
const { outer: o, counter: c, prism: p } = GLYPH;

/** Body traced with its counter cut out, plus the floating prism. */
const GLYPH_PATH =
  `M${pt(o[0])} L${pt(o[1])} L${pt(c[1])} L${pt(c[0])} L${pt(c[2])} L${pt(o[2])} Z ` +
  `M${pt(p[0])} L${pt(p[1])} L${pt(p[2])} Z`;

/** The "Aether A" mark — same geometry as the particle glyph. */
export default function Logo({ className = "", title = "Adel Anas", ...rest }) {
  return (
    <svg viewBox="-72 -84 144 168" className={className} role="img" aria-label={title} {...rest}>
      <path d={GLYPH_PATH} fill="currentColor" />
    </svg>
  );
}
