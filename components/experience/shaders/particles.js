/**
 * Morphing particle shaders.
 *
 * Every particle carries two positions: `position` (where it comes from) and
 * `aTo` (where it is going). `uProgress` blends them with a per-particle stagger
 * so the form assembles organically instead of all at once. On top of the
 * morph, the vertex shader layers: an animated wave surface, ambient drift,
 * cursor repulsion and up to MAX_RIPPLES expanding wave fronts.
 *
 * The displacements are stateless functions of time and the pointer, so the
 * structure always recovers its original shape on its own.
 */

export const MAX_RIPPLES = 6;

/**
 * Crisp point rasterisation, shared by every particle layer.
 *
 * Points are drawn as anti-aliased discs measured in *device pixels*, never as
 * blurry Gaussian sprites. Particles smaller than ~1.4 px keep a minimum
 * footprint and are dimmed by their area instead of being smeared, which is
 * what keeps the field sharp at any resolution. Only the rare large particles
 * get a faint glow ring.
 */
const POINT_VERTEX = /* glsl */ `
  varying float vPx;
  varying float vCore;
  varying float vGlow;

  // diameter in device pixels -> returns alpha compensation for clamped points.
  // pr = device pixel ratio: the glow threshold is expressed in CSS pixels so
  // only genuinely large particles get a halo, on every screen density.
  float setPointSize(float diameter, float pr) {
    float d = clamp(diameter, 1.4, 9.0 * pr);
    vGlow = smoothstep(3.5 * pr, 6.5 * pr, d);
    vCore = d * 0.5;
    vPx = d * (1.0 + vGlow * 1.2) + 2.0;
    gl_PointSize = vPx;
    float cover = clamp(diameter / d, 0.0, 1.0);
    return cover * cover;
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  varying float vPx;
  varying float vCore;
  varying float vGlow;

  float pointMask() {
    float d = length(gl_PointCoord - 0.5) * vPx;
    float core = clamp(vCore - d + 0.5, 0.0, 1.0);
    float halo = exp(-(d * d) / (vCore * vCore * 3.0)) * 0.16 * vGlow;
    return core + halo;
  }
`;

export const particleVertexShader = /* glsl */ `
  #define PI 3.14159265359
  #define MAX_RIPPLES ${MAX_RIPPLES}

  uniform float uTime;
  uniform float uProgress;
  uniform float uStagger;
  uniform float uScatter;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uOpacity;
  uniform float uDrift;
  uniform float uWaveFrom;
  uniform float uWaveTo;
  uniform vec3  uPointer;
  uniform float uHover;
  uniform float uRadius;
  uniform vec4  uRipples[MAX_RIPPLES];

  attribute vec3 aTo;
  attribute vec3 aDir;
  attribute vec4 aRandom; // x: size, y: brightness, z: phase, w: stagger delay

  varying float vAlpha;
  varying float vShade;
  ${POINT_VERTEX}

  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    // --- Morph -------------------------------------------------------
    float t = clamp(uProgress * (1.0 + uStagger) - aRandom.w * uStagger, 0.0, 1.0);
    float e = easeInOutCubic(t);
    vec3 pos = mix(position, aTo, e);
    pos += aDir * sin(PI * t) * uScatter * (0.35 + aRandom.y);

    // --- Fluid wave surface -----------------------------------------
    float waveAmount = mix(uWaveFrom, uWaveTo, e);
    float wave = sin(pos.x * 1.25 + uTime * 0.55) * 0.26
               + sin(pos.z * 1.9 - uTime * 0.7 + pos.x * 0.45) * 0.16
               + sin((pos.x + pos.z) * 3.2 + uTime * 1.1) * 0.035;
    pos.y += wave * waveAmount;

    // --- Ambient drift ----------------------------------------------
    float phase = aRandom.z * 6.2831853;
    pos += vec3(
      sin(uTime * 0.42 + phase),
      cos(uTime * 0.36 + phase * 1.3),
      sin(uTime * 0.29 + phase * 0.7)
    ) * uDrift * (0.25 + aRandom.y);

    // --- Cursor repulsion --------------------------------------------
    vec2 toPointer = pos.xy - uPointer.xy;
    float dist = length(toPointer);
    vec2 away = toPointer / max(dist, 0.0001);
    float influence = 1.0 - smoothstep(0.0, uRadius, dist);
    influence = influence * influence * uHover;
    pos.xy += away * influence * 0.26 * (0.45 + aRandom.y);
    pos.z += influence * (aRandom.z - 0.3) * 0.55;

    // --- Propagating ripples -----------------------------------------
    float rippleGlow = 0.0;
    for (int i = 0; i < MAX_RIPPLES; i++) {
      vec4 r = uRipples[i];
      if (r.w <= 0.0) continue;
      float age = uTime - r.z;
      if (age < 0.0) continue;
      vec2 d = pos.xy - r.xy;
      float rd = length(d);
      float front = rd - age * 1.35;
      float ring = exp(-front * front * 18.0) * exp(-age * 1.25) * r.w;
      pos.z += ring * 0.3;
      pos.xy += (d / max(rd, 0.0001)) * ring * 0.06;
      rippleGlow += ring;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Most particles are tiny; a rare few are larger to add depth and sparkle.
    float diameter = uSize * (0.34 + pow(aRandom.x, 28.0) * 1.6) * uPixelRatio / -mvPosition.z;
    float cover = setPointSize(diameter, uPixelRatio);

    float depthFade = clamp((-mvPosition.z - 3.5) / 7.0, 0.0, 1.0);
    float twinkle = 0.78 + 0.22 * sin(uTime * (0.8 + aRandom.z * 2.4) + phase);

    vShade = mix(0.58, 1.0, aRandom.y);
    vAlpha = uOpacity * cover
           * mix(1.0, 0.3, depthFade)
           * (0.4 + 0.6 * aRandom.y)
           * twinkle
           * (1.0 + influence * 0.9 + rippleGlow * 1.4);
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vShade;
  ${POINT_FRAGMENT}

  void main() {
    float alpha = pointMask() * vAlpha;
    if (alpha < 0.004) discard;
    // Neutral silver with the faintest cool cast.
    vec3 color = vec3(0.965, 0.97, 1.0) * vShade;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Orbiting ring — a comet-like trail travelling along a tilted ellipse. */
export const ringVertexShader = /* glsl */ `
  #define PI 3.14159265359
  #define TAU 6.28318530718

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uOpacity;
  uniform float uSpeed;
  uniform vec2  uRadii;
  uniform float uForm;    // 0 = scattered, 1 = ring fully drawn
  uniform float uStagger;

  attribute vec4 aData; // x: angle, y: radial jitter, z: vertical jitter, w: random
  attribute vec3 aFrom; // scattered origin the particle flies in from

  varying float vAlpha;
  ${POINT_VERTEX}

  void main() {
    float angle = aData.x + uTime * uSpeed;
    float r = 1.0 + aData.y;
    vec3 ringPos = vec3(cos(angle) * uRadii.x * r, aData.z, sin(angle) * uRadii.y * r);

    // Formation: particles land on the orbit in angular order, from the tail
    // to the bright head, so the ring is drawn like a stroke chasing its comet.
    float head = fract(aData.x / TAU);
    float delay = head * 0.93 + aData.w * 0.07;
    float t = clamp(uForm * (1.0 + uStagger) - delay * uStagger, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    vec3 tangent = normalize(vec3(-sin(angle) * uRadii.x, 0.0, cos(angle) * uRadii.y));
    vec3 pos = mix(aFrom, ringPos, e) + tangent * sin(PI * t) * (0.25 + aData.w * 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Trail: brightness ramps up toward a travelling head.
    float trail = pow(head, 1.7);
    float diameter = uSize * (0.34 + trail * 0.45 + pow(aData.w, 16.0) * 1.4) * uPixelRatio / -mvPosition.z;
    float cover = setPointSize(diameter, uPixelRatio);
    float arrival = smoothstep(0.0, 0.3, t) * (1.0 + sin(PI * t) * 0.9);
    vAlpha = uOpacity * cover * arrival * (0.22 + trail * 0.85) * (0.5 + 0.5 * aData.w);
  }
`;

/** Ambient dust — the deep background star field. */
export const dustVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uOpacity;
  uniform float uScroll;

  attribute vec4 aRandom;

  varying float vAlpha;
  ${POINT_VERTEX}

  void main() {
    vec3 pos = position;
    // Slow upward drift, wrapped inside a 12-unit tall volume; scroll adds parallax.
    pos.y = mod(pos.y + uTime * (0.02 + aRandom.x * 0.04) + uScroll * (0.6 + aRandom.y), 12.0) - 6.0;
    pos.x += sin(uTime * 0.1 + aRandom.z * 6.28) * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float diameter = uSize * (0.42 + pow(aRandom.w, 16.0) * 1.8) * uPixelRatio / -mvPosition.z;
    float cover = setPointSize(diameter, uPixelRatio);
    float twinkle = 0.6 + 0.4 * sin(uTime * (0.5 + aRandom.x * 2.0) + aRandom.z * 6.28);
    vAlpha = uOpacity * cover * (0.25 + 0.75 * aRandom.y) * twinkle;
  }
`;

export const softPointFragmentShader = /* glsl */ `
  varying float vAlpha;
  ${POINT_FRAGMENT}

  void main() {
    float alpha = pointMask() * vAlpha;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vec3(0.96, 0.965, 0.98), alpha);
  }
`;
