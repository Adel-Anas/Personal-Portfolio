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
    float size = uSize * (0.32 + pow(aRandom.x, 4.0) * 2.1);
    gl_PointSize = clamp(size * uPixelRatio / -mvPosition.z, 0.0, 14.0 * uPixelRatio);

    float depthFade = clamp((-mvPosition.z - 3.5) / 7.0, 0.0, 1.0);
    float twinkle = 0.78 + 0.22 * sin(uTime * (0.8 + aRandom.z * 2.4) + phase);

    vShade = mix(0.58, 1.0, aRandom.y);
    vAlpha = uOpacity
           * mix(1.0, 0.3, depthFade)
           * (0.4 + 0.6 * aRandom.y)
           * twinkle
           * (1.0 + influence * 0.9 + rippleGlow * 1.4);
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vShade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    float alpha = pow(core, 1.7) * vAlpha;
    // Neutral silver with the faintest cool cast.
    vec3 color = vec3(0.965, 0.97, 1.0) * vShade;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Orbiting ring — a comet-like trail travelling along a tilted ellipse. */
export const ringVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uOpacity;
  uniform float uSpeed;
  uniform vec2  uRadii;

  attribute vec4 aData; // x: angle, y: radial jitter, z: vertical jitter, w: random

  varying float vAlpha;

  void main() {
    float angle = aData.x + uTime * uSpeed;
    float r = 1.0 + aData.y;
    vec3 pos = vec3(cos(angle) * uRadii.x * r, aData.z, sin(angle) * uRadii.y * r);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Trail: brightness ramps up toward a travelling head.
    float head = fract(aData.x / 6.2831853);
    float trail = pow(head, 1.7);
    float size = uSize * (0.35 + trail * 1.4 + pow(aData.w, 6.0) * 1.2);
    gl_PointSize = clamp(size * uPixelRatio / -mvPosition.z, 0.0, 12.0 * uPixelRatio);
    vAlpha = uOpacity * (0.2 + trail * 0.85) * (0.5 + 0.5 * aData.w);
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

  void main() {
    vec3 pos = position;
    // Slow upward drift, wrapped inside a 12-unit tall volume; scroll adds parallax.
    pos.y = mod(pos.y + uTime * (0.02 + aRandom.x * 0.04) + uScroll * (0.6 + aRandom.y), 12.0) - 6.0;
    pos.x += sin(uTime * 0.1 + aRandom.z * 6.28) * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float size = uSize * (0.4 + pow(aRandom.w, 5.0) * 2.2);
    gl_PointSize = clamp(size * uPixelRatio / -mvPosition.z, 0.0, 6.0 * uPixelRatio);
    float twinkle = 0.6 + 0.4 * sin(uTime * (0.5 + aRandom.x * 2.0) + aRandom.z * 6.28);
    vAlpha = uOpacity * (0.25 + 0.75 * aRandom.y) * twinkle;
  }
`;

export const softPointFragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(vec3(0.96, 0.965, 0.98), pow(core, 1.8) * vAlpha);
  }
`;
