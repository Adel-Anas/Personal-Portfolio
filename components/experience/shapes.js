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
/* The "Aether A" — the signature glyph, shared with the SVG logo.     */
/* ------------------------------------------------------------------ */

/** Glyph geometry in unit space (height 2). Exported for the SVG logo. */
export const GLYPH = {
  outer: [
    [0, 1],
    [-0.86, -1],
    [0.86, -1],
  ],
  counter: [
    [-0.04, 0.34],
    [-0.5, -1],
    [0.4, -1],
  ],
  prism: [
    [0.02, -0.36],
    [-0.26, -1],
    [0.24, -1],
  ],
};

function inTriangle(px, py, [a, b, c]) {
  const d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
  const d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1]);
  const d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function inBody(x, y) {
  return inTriangle(x, y, GLYPH.outer) && !inTriangle(x, y, GLYPH.counter);
}

function inPrism(x, y) {
  return inTriangle(x, y, GLYPH.prism);
}

const BODY_DEPTH = 0.26;
const PRISM_DEPTH = 0.14;
const PRISM_Z = 0.2;

/** Outline segments, each tagged with its extrusion depth and z offset. */
const GLYPH_EDGES = (() => {
  const { outer: o, counter: c, prism: p } = GLYPH;
  const body = [
    [o[0], o[1]],
    [o[0], o[2]],
    [c[0], c[1]],
    [c[0], c[2]],
    [o[1], c[1]],
    [c[2], o[2]],
  ].map((seg) => ({ seg, depth: BODY_DEPTH, z: 0 }));
  const prism = [
    [p[0], p[1]],
    [p[0], p[2]],
    [p[1], p[2]],
  ].map((seg) => ({ seg, depth: PRISM_DEPTH, z: PRISM_Z }));
  const all = [...body, ...prism].map((e) => ({
    ...e,
    length: Math.hypot(e.seg[1][0] - e.seg[0][0], e.seg[1][1] - e.seg[0][1]),
  }));
  const total = all.reduce((s, e) => s + e.length, 0);
  let acc = 0;
  return all.map((e) => {
    acc += e.length / total;
    return { ...e, cdf: acc };
  });
})();

function pickEdge(rng) {
  const r = rng();
  return GLYPH_EDGES.find((e) => r <= e.cdf) || GLYPH_EDGES[GLYPH_EDGES.length - 1];
}

function sampleArea(rng) {
  // Rejection sampling inside the glyph silhouette (body or prism).
  for (;;) {
    const x = (rng() * 2 - 1) * 0.86;
    const y = rng() * 2 - 1;
    if (inPrism(x, y)) return { x, y, depth: PRISM_DEPTH, z: PRISM_Z };
    if (inBody(x, y)) return { x, y, depth: BODY_DEPTH, z: 0 };
  }
}

export function createLetterA(count, seed = 7) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = rng();
    let x;
    let y;
    let z;

    if (r < 0.34) {
      // Front & back faces — gives the glyph its readable mass.
      const p = sampleArea(rng);
      x = p.x;
      y = p.y;
      z = p.z + (rng() < 0.62 ? p.depth : -p.depth) + gaussian(rng) * 0.008;
    } else if (r < 0.66) {
      // Side walls along every outline edge.
      const e = pickEdge(rng);
      const t = rng();
      x = e.seg[0][0] + (e.seg[1][0] - e.seg[0][0]) * t + gaussian(rng) * 0.006;
      y = e.seg[0][1] + (e.seg[1][1] - e.seg[0][1]) * t + gaussian(rng) * 0.006;
      z = e.z + (rng() * 2 - 1) * e.depth;
    } else if (r < 0.78) {
      // Crisp front/back contour lines — the bright edges that define the form.
      const e = pickEdge(rng);
      const t = rng();
      x = e.seg[0][0] + (e.seg[1][0] - e.seg[0][0]) * t;
      y = e.seg[0][1] + (e.seg[1][1] - e.seg[0][1]) * t;
      z = e.z + (rng() < 0.7 ? e.depth : -e.depth);
    } else if (r < 0.86) {
      // Sparse inner volume.
      const p = sampleArea(rng);
      x = p.x;
      y = p.y;
      z = p.z + (rng() * 2 - 1) * p.depth;
    } else if (r < 0.96) {
      // Close halo — particles that have not fully settled into the form.
      const p = sampleArea(rng);
      const s = 0.06 + rng() * 0.22;
      x = p.x + gaussian(rng) * s;
      y = p.y + gaussian(rng) * s;
      z = p.z + gaussian(rng) * s * 1.5;
    } else {
      // A diffuse dust cloud spilling from the base toward the lower left.
      const t = Math.pow(rng(), 0.7);
      x = 0.4 - t * 2.6 + gaussian(rng) * 0.5;
      y = -1.0 - t * 0.35 + gaussian(rng) * 0.32;
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

/** "The mind": a breathing sphere wrapped in two thin orbits. */
export function createMind(count, seed = 11) {
  const rng = createRng(seed);
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const surface = Math.floor(count * 0.72);

  for (let i = 0; i < count; i++) {
    let x;
    let y;
    let z;
    if (i < surface) {
      const k = i + 0.5;
      const yy = 1 - (k / surface) * 2;
      const r = Math.sqrt(1 - yy * yy);
      const th = golden * k;
      const lat = Math.asin(yy);
      const bands = 1 + 0.05 * Math.sin(lat * 14) + gaussian(rng) * 0.012;
      const radius = 0.95 * bands;
      x = Math.cos(th) * r * radius;
      y = yy * radius;
      z = Math.sin(th) * r * radius;
    } else if (rng() < 0.75) {
      const th = rng() * Math.PI * 2;
      const tilt = rng() < 0.5 ? 0.42 : -0.9;
      const R = (rng() < 0.5 ? 1.35 : 1.62) + gaussian(rng) * 0.015;
      const ox = Math.cos(th) * R;
      const oz = Math.sin(th) * R;
      x = ox;
      y = oz * Math.sin(tilt) + gaussian(rng) * 0.01;
      z = oz * Math.cos(tilt);
    } else {
      const u = rng() * 2 - 1;
      const th = rng() * Math.PI * 2;
      const r = 1.1 + Math.pow(rng(), 2) * 1.4;
      const s = Math.sqrt(1 - u * u);
      x = r * s * Math.cos(th);
      y = r * u;
      z = r * s * Math.sin(th);
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
  mind: createMind,
  galaxy: createGalaxy,
  wave: createWaveField,
  helix: createHelix,
};

/** Shapes that the vertex shader animates as a wave surface. */
export const WAVE_SHAPES = new Set(["wave"]);
