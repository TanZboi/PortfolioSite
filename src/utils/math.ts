/** Shared math helpers: none of this depends on Three.js or Spark so it stays trivially testable. */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  return a === b ? 0 : (value - a) / (b - a);
}

export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return lerp(outMin, outMax, clamp(inverseLerp(inMin, inMax, value), 0, 1));
}

/** Smoothstep-flavoured ease, used for the explode gizmo's out/in tween and panel transitions. */
export function easeOutCubic(t: number): number {
  const p = clamp(t, 0, 1) - 1;
  return p * p * p + 1;
}

export function easeInOutCubic(t: number): number {
  const p = clamp(t, 0, 1);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

/**
 * Deterministic 32-bit string hash (FNV-1a). Used to seed the mulberry32 PRNG below so debug
 * zone layouts are reproducible across reloads without pulling in a dependency.
 */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small, fast, deterministic PRNG — good enough for cosmetic randomness (explode directions, etc). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
