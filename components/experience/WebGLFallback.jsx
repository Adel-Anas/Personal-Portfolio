import { GLYPH } from "./shapes";

/**
 * Static fallback for devices without WebGL: the glyph rendered as a dotted
 * SVG pattern, so the identity survives without the particle engine.
 */
const toPoints = (tri) => tri.map(([x, y]) => `${x * 100},${-y * 100}`).join(" ");

export default function WebGLFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-end pr-[8vw] max-md:justify-center max-md:pr-0 max-md:items-start max-md:pt-[18vh]">
      <svg viewBox="-110 -110 220 220" className="h-[62vh] max-h-[640px] w-auto opacity-70 max-md:h-[38vh]">
        <defs>
          <pattern id="fallback-dots" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="0.55" fill="#f5f5f5" />
          </pattern>
          <mask id="fallback-mask">
            <polygon points={toPoints(GLYPH.outer)} fill="white" />
            <polygon points={toPoints(GLYPH.counter)} fill="black" />
            <polygon points={toPoints(GLYPH.prism)} fill="white" />
          </mask>
        </defs>
        <rect x="-110" y="-110" width="220" height="220" fill="url(#fallback-dots)" mask="url(#fallback-mask)" />
      </svg>
    </div>
  );
}
