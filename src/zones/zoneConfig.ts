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
 * These are still a first-pass estimate for this specific scan/crop and are meant to be
 * tuned visually: run the dev server, press "`" to open the debug zone editor, and nudge
 * the numbers below until each box sits over the real screen/d-pad/cartridge slot/battery
 * cover — Vite's HMR reflects each edit instantly.
 */
export const ZONE_SPECS: ZoneFractionSpec[] = [
  {
    id: "screen",
    label: "Screen",
    description: "Resume",
    at: [0.5, 0.28, 0.95],
    extent: [0.45, 0.28, 0.18],
    normal: [0, 0, 1],
    visibilityThreshold: 0.3,
  },
  {
    id: "controls",
    label: "D-Pad & Buttons",
    description: "Mini game",
    at: [0.5, 0.62, 0.95],
    extent: [0.85, 0.26, 0.18],
    normal: [0, 0, 1],
    visibilityThreshold: 0.3,
  },
  {
    id: "cartridge",
    label: "Cartridge Slot",
    description: "Projects",
    at: [0.5, 0.04, 0.4],
    extent: [0.72, 0.14, 0.55],
    normal: [0, -1, 0.35],
    visibilityThreshold: 0.25,
  },
  {
    id: "back",
    label: "Battery Cover",
    description: "About & contact",
    at: [0.5, 0.58, 0.05],
    extent: [0.55, 0.4, 0.18],
    normal: [0, 0, -1],
    visibilityThreshold: 0.3,
  },
];
