"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { GLYPH, GLYPH_DEPTH } from "./shapes";

function toShape(polygon) {
  const shape = new THREE.Shape();
  polygon.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

/**
 * Invisible, depth-only solid with the exact geometry of the particle glyph.
 *
 * It writes nothing to the colour buffer, only depth. Anything depth-tested
 * that passes behind it (the orbit ring) is hidden, so the ring truly goes
 * around the letter: in front at the bottom, behind it at the top, and still
 * visible through the letter's open gaps.
 */
const GlyphOccluder = forwardRef(function GlyphOccluder(props, ref) {
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry([toShape(GLYPH.body), toShape(GLYPH.inner)], {
      depth: GLYPH_DEPTH * 2,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -GLYPH_DEPTH);
    return geo;
  }, []);

  const material = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false }), []);

  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-1} visible={false} {...props} />;
});

export default GlyphOccluder;
