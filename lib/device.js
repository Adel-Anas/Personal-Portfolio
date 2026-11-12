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
    high: { count: 26000, dust: 2600, ring: 2200, dpr: [1, 1.75] },
    mid: { count: 16000, dust: 1600, ring: 1500, dpr: [1, 1.5] },
    low: { count: 9000, dust: 900, ring: 900, dpr: [1, 1.5] },
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
