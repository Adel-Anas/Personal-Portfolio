/**
 * Point-cloud shape generators.
 *
 * Every generator returns a Float32Array of exactly `count * 3` floats, so any
 * shape can morph into any other on the GPU. Shapes live in "unit space":
 * roughly 2 units tall, centred on the origin. Placement and scale are applied
 * by the scene, not here.
 *
 * All randomness is seeded so the composition is identical on every visit.
 */

export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ */
/* The Adel Anas "A" — the signature glyph, shared with the SVG logo. */
/* ------------------------------------------------------------------ */

/**
 * Glyph geometry in unit space (height 2, y up), traced from the brand mark:
 *  - body:  a chevron with uniform stroke (outer and inner edges are parallel)
 *  - inner: a second, shorter leg parallel to the right stroke, ending at the
 *           top-left in a "beak" cut horizontally.
 */
export const GLYPH = {
  body: [
    [0, 1],
    [-1.23, -1],
    [-0.8, -1],
    [0, 0.3],
    [0.8, -1],
    [1.23, -1],
  ],
  inner: [
    [0, 0],
    [-0.308, -0.5],
    [-0.098, -0.5],
    [0.21, -1],
    [0.615, -1],
  ],
};

const HALF_WIDTH = 1.23;
/** Half-thickness of the extruded glyph (shared with the depth occluder). */
export const GLYPH_DEPTH = 0.24;
const DEPTH = GLYPH_DEPTH;

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inGlyph(x, y) {
  return inPolygon(x, y, GLYPH.body) || inPolygon(x, y, GLYPH.inner);
}

/** Every outline segment of both polygons, weighted by length for sampling. */
const GLYPH_EDGES = (() => {
  const segments = [];
  for (const poly of [GLYPH.body, GLYPH.inner]) {
    poly.forEach((a, i) => segments.push([a, poly[(i + 1) % poly.length]]));
  }
  const withLength = segments.map((seg) => ({
    seg,
    length: Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]),
  }));
  const total = withLength.reduce((sum, e) => sum + e.length, 0);
  let acc = 0;
  return withLength.map((e) => {
    acc += e.length / total;
    return { ...e, cdf: acc };
  });
})();

function pickEdge(rng) {
  const r = rng();
  return GLYPH_EDGES.find((e) => r <= e.cdf) || GLYPH_EDGES[GLYPH_EDGES.length - 1];
}

function sampleArea(rng) {
  for (;;) {
    const x = (rng() * 2 - 1) * HALF_WIDTH;
    const y = rng() * 2 - 1;
    if (inGlyph(x, y)) return { x, y };
  }
}

function pointOnEdge(rng, jitter = 0) {
  const { seg } = pickEdge(rng);
  const t = rng();
  return {
    x: seg[0][0] + (seg[1][0] - seg[0][0]) * t + gaussian(rng) * jitter,
    y: seg[0][1] + (seg[1][1] - seg[0][1]) * t + gaussian(rng) * jitter,
  };
}

export function createLetterA(count, seed = 7) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = rng();
    let x;
    let y;
    let z;

    if (r < 0.3) {
      // Front & back faces — the readable mass of the letter.
      const p = sampleArea(rng);
      x = p.x;
      y = p.y;
      z = (rng() < 0.64 ? DEPTH : -DEPTH) + gaussian(rng) * 0.006;
    } else if (r < 0.55) {
      // Side walls along every outline edge — gives the extrusion its depth.
      const p = pointOnEdge(rng, 0.004);
      x = p.x;
      y = p.y;
      z = (rng() * 2 - 1) * DEPTH;
    } else if (r < 0.68) {
      // Sharp front/back contours — the bright lines that define the form.
      const p = pointOnEdge(rng);
      x = p.x;
      y = p.y;
      z = rng() < 0.7 ? DEPTH : -DEPTH;
    } else if (r < 0.73) {
      // Sparse inner volume.
      const p = sampleArea(rng);
      x = p.x;
      y = p.y;
      z = (rng() * 2 - 1) * DEPTH;
    } else if (r < 0.81) {
      // Close halo — particles that have not fully settled into the form.
      const p = rng() < 0.5 ? sampleArea(rng) : pointOnEdge(rng);
      const s = 0.04 + rng() * 0.2;
      x = p.x + gaussian(rng) * s;
      y = p.y + gaussian(rng) * s;
      z = gaussian(rng) * s * 1.6;
    } else if (r < 0.95) {
      // A flowing ribbon of particles sweeping through the base of the letter.
      const t = rng();
      x = -2.6 + t * 5.6;
      const crest = -0.95 + 0.26 * Math.sin(t * Math.PI * 2 - 0.6) + 0.12 * Math.sin(t * Math.PI * 5.2);
      if (rng() < 0.28) {
        // Bright filament riding the crest.
        y = crest + gaussian(rng) * 0.012;
        z = 0.32 + gaussian(rng) * 0.02;
      } else {
        // Dusty sheet around it, undulating in depth.
        const depth = (rng() * 2 - 1) * 1.1;
        y = crest + 0.16 * Math.sin(x * 1.4 + depth * 2.2) + gaussian(rng) * 0.07;
        z = depth;
      }
    } else {
      // Fine dust rising from the apex and drifting around the form.
      x = gaussian(rng) * 1.1;
      y = 0.3 + Math.abs(gaussian(rng)) * 1.1;
      z = gaussian(rng) * 0.9;
    }

    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Supporting forms used by the other sections.                       */
/* ------------------------------------------------------------------ */

/** Initial state: a wide, deep cloud the glyph condenses from. */
export function createScatter(count, seed = 3) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const radius = 2.5 + Math.pow(rng(), 0.6) * 5.5;
    const s = Math.sqrt(1 - u * u);
    out[i * 3] = radius * s * Math.cos(theta) * 1.4;
    out[i * 3 + 1] = radius * u * 0.8;
    out[i * 3 + 2] = radius * s * Math.sin(theta) - 1.5;
  }
  return out;
}

/**
 * "The mind": neural strands — thin signal lines sweeping across the screen,
 * dotted with small bright synapses. Open by design so text stays readable
 * over it; the vertex shader animates it as a wave surface, so the strands
 * flow and weave through each other.
 */
export function createStrands(count, seed = 11) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);
  const STRANDS = 7;
  const HALF_LENGTH = 5.8;
  const strands = Array.from({ length: STRANDS }, (_, k) => {
    const c = k - (STRANDS - 1) / 2;
    return {
      z: c * 0.26,
      y: c * 0.1,
      phase: k * 1.7,
      freq: 0.55 + (k % 3) * 0.12,
      amp: 0.16 + (k % 2) * 0.1,
      // Alternate crisp filaments and softer, wispier ones.
      width: k % 3 === 1 ? 0.022 : 0.004,
    };
  });
  const curve = (st, x) => st.y + Math.sin(x * st.freq + st.phase) * st.amp * Math.exp(-(x * x) / 40);

  for (let i = 0; i < count; i++) {
    const r = rng();
    const st = strands[i % STRANDS];
    let x;
    let y;
    let z;
    if (r < 0.86) {
      // The strand itself — a fine filament.
      x = (rng() * 2 - 1) * HALF_LENGTH;
      y = curve(st, x) + gaussian(rng) * st.width;
      z = st.z + gaussian(rng) * st.width;
    } else if (r < 0.95) {
      // Synapses: small bright knots at regular intervals along each strand.
      const node = Math.round(((rng() * 2 - 1) * HALF_LENGTH) / 0.9) * 0.9 + st.phase * 0.1;
      x = node + gaussian(rng) * 0.02;
      y = curve(st, node) + gaussian(rng) * 0.02;
      z = st.z + gaussian(rng) * 0.02;
    } else {
      // Sparse signal dust drifting between the strands.
      x = (rng() * 2 - 1) * HALF_LENGTH;
      y = gaussian(rng) * 0.35;
      z = gaussian(rng) * 0.9;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

/** "Technical universe": a three-arm spiral galaxy. */
export function createGalaxy(count, seed = 23) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);
  const arms = 3;
  for (let i = 0; i < count; i++) {
    const radius = Math.pow(rng(), 1.6) * 3.4;
    const arm = (i % arms) / arms;
    const angle = arm * Math.PI * 2 + radius * 1.15;
    const spread = 0.12 + radius * 0.12;
    out[i * 3] = Math.cos(angle) * radius + gaussian(rng) * spread;
    out[i * 3 + 1] = gaussian(rng) * (0.05 + 0.1 * Math.exp(-radius));
    out[i * 3 + 2] = Math.sin(angle) * radius + gaussian(rng) * spread;
  }
  return out;
}

/** Flat grid that the vertex shader animates into a fluid wave field. */
export function createWaveField(count, seed = 31) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);
  const cols = Math.ceil(Math.sqrt(count * 2.2));
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const cx = (i % cols) / (cols - 1);
    const cz = Math.floor(i / cols) / Math.max(1, rows - 1);
    out[i * 3] = (cx - 0.5) * 10 + (rng() - 0.5) * 0.02;
    out[i * 3 + 1] = (rng() - 0.5) * 0.02;
    out[i * 3 + 2] = (cz - 0.5) * 5 + (rng() - 0.5) * 0.02;
  }
  return out;
}

/** "Journey": a double helix — two strands bound by rungs. */
export function createHelix(count, seed = 41) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);
  const height = 3.6;
  const turns = 3.2;
  for (let i = 0; i < count; i++) {
    const t = rng();
    const y = (t - 0.5) * height;
    const a = t * turns * Math.PI * 2;
    let x;
    let z;
    const r = rng();
    if (r < 0.8) {
      const phase = r < 0.4 ? 0 : Math.PI;
      const R = 0.62 + gaussian(rng) * 0.035;
      x = Math.cos(a + phase) * R;
      z = Math.sin(a + phase) * R;
    } else {
      // Rungs between the strands, at regular steps.
      const step = Math.round(t * 46) / 46;
      const ar = step * turns * Math.PI * 2;
      const k = rng() * 2 - 1;
      x = Math.cos(ar) * 0.62 * k;
      z = Math.sin(ar) * 0.62 * k;
      out[i * 3 + 1] = (step - 0.5) * height;
      out[i * 3] = x;
      out[i * 3 + 2] = z;
      continue;
    }
    out[i * 3] = x + gaussian(rng) * 0.02;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z + gaussian(rng) * 0.02;
  }
  return out;
}

export const SHAPE_FACTORIES = {
  scatter: createScatter,
  glyph: createLetterA,
  strands: createStrands,
  galaxy: createGalaxy,
  wave: createWaveField,
  helix: createHelix,
};

/** Shapes that the vertex shader animates as a wave surface. */
export const WAVE_SHAPES = new Set(["wave", "strands"]);
