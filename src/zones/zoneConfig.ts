import type { ZoneFractionSpec } from "./types";

/**
 * First-pass zone geometry, guessed from generic Game Boy proportions and the loaded
 * splat's bounding box. +Z is assumed to be the front, since that's the face the default
 * camera framing looks at (see CameraRig.frame()).
 *
 * The raw scan came in upside down (fixed with a 180°-about-Z correction in
 * loadGameBoySplat.ts), which flips which end of the local Y range is physically "up": the
 * splat's local -Y direction is physical up, so physical top-of-device sits near
 * `bounds.min.y` (fraction 0) and physical bottom near `bounds.max.y` (fraction 1) — the
 * opposite of what you'd naively guess. The fractions below already account for that.
 *
 * These started as first-pass estimates for this specific scan/crop; `screen`, `controls`, and
 * `back` have since been checked against the live model via the debug overlay (press "`") and
 * sit reasonably well. `cartridge` had a real bug — its `normal` pointed mostly local +Y (roughly
 * "up" after the correction above), so it registered as facing the camera from almost any angle,
 * including the front — and has been corrected to share `back`'s rear-facing normal, since the
 * cartridge slot is the upper portion of that same physical face, not a separate top-loading one.
 *
 * Still worth another visual pass if you want pixel-tight boxes: run the dev server, press "`"
 * to open the debug zone editor, and nudge the numbers below until each box sits over the real
 * screen/d-pad/cartridge slot/battery cover — Vite's HMR reflects each edit instantly (it does
 * remount the scene, so the camera resets to its default framing on every edit).
 */
export const ZONE_SPECS: ZoneFractionSpec[] = [
  {
    id: "screen",
    label: "Screen",
    description: "Resume",
    boxes: [
      { at: [0.368, 0.392, 0.658], extent: [0.454, 0.240, 0.092], rotation: [0.0000, -0.9250, 0.0000] },
    ],
    normal: [0, 0, 1],
    visibilityThreshold: 0.3,
  },
  {
    id: "controls",
    label: "D-Pad & Buttons",
    description: "Mini game",
    // One small box per physical button rather than one loose box spanning the whole cluster —
    // measured against the live scan (front view, debug overlay) so every hitbox actually sits
    // on a button instead of on the case plastic between them. The d-pad's two arms are enough
    // to cover the whole control cluster, so no separate A/B boxes are needed.
    boxes: [
      { at: [0.123, 0.679, 0.394], extent: [0.130, 0.082, 0.068], rotation: [0.0000, -0.9425, 0.0000] },
      { at: [0.213, 0.723, 0.498], extent: [0.130, 0.082, 0.056], rotation: [0.0000, -0.9250, 0.0000] },
    ],
    normal: [0, 0, 1],
    visibilityThreshold: 0.3,
  },
  {
    id: "cartridge",
    label: "Cartridge Slot",
    description: "Projects",
    // Verified against the live scan (see debug overlay workflow in the README): the cartridge
    // slot is on the same rear face as "back", just the upper portion of it (above the taped
    // note) — not a top-loading slot with an upward-facing opening, which the old `normal`
    // (mostly local +Y) had assumed. Shares `back`'s normal/threshold accordingly.
    boxes: [
      { at: [0.600, 0.264, 0.442], extent: [0.564, 0.180, 0.108], rotation: [0.0000, -0.8378, 0.0000] },
    ],
    normal: [0, 0, -1],
    visibilityThreshold: 0.3,
  },
  {
    id: "back",
    label: "Battery Cover",
    description: "About & contact",
    boxes: [
      { at: [0.596, 0.720, 0.446], extent: [0.550, 0.400, 0.092], rotation: [0.0000, -0.8552, 0.0000] },
    ],
    normal: [0, 0, -1],
    visibilityThreshold: 0.3,
  },
];
