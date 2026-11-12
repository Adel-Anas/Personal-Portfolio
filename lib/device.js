/**
 * Device capability profiling — decides particle budgets, pixel ratio and fallbacks.
 * Call only in the browser.
 */
export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getDeviceProfile() {
  const reducedMotion = prefersReducedMotion();
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  const mobile = width < 768 || (coarse && width < 1024);

  let tier = "high";
  if (mobile) tier = "low";
  else if (cores <= 4 || memory <= 4) tier = "mid";

  const budgets = {
    // Rendered at native resolution (up to 2x) so every particle stays pin-sharp.
    high: { count: 44000, dust: 2800, ring: 3200, dpr: [1, 2] },
    mid: { count: 28000, dust: 1800, ring: 2200, dpr: [1, 2] },
    low: { count: 14000, dust: 1000, ring: 1400, dpr: [1, 2] },
  };

  return {
    tier,
    mobile,
    coarse,
    reducedMotion,
    webgl: hasWebGL(),
    ...budgets[tier],
  };
}
