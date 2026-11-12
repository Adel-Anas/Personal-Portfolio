/**
 * Minimal mutable store shared between the DOM layer and the WebGL scene.
 * It deliberately lives outside React: the canvas reads it every frame,
 * so routing it through React state would cause needless re-renders.
 */
function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();
  return {
    get: () => state,
    set(partial) {
      const prev = state;
      state = { ...state, ...partial };
      listeners.forEach((fn) => fn(state, prev));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** `scene` = active section id, `ready` = intro finished. */
export const experienceStore = createStore({ scene: "home", ready: false });

/** Pointer in normalised device coordinates, written by a single window listener. */
export const pointer = { nx: 0, ny: 0, active: false, lastMove: 0 };
