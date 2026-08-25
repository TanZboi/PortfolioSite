import type * as THREE from "three";

export type ZoneId = "screen" | "controls" | "cartridge" | "back";

/**
 * Author-time zone definition, expressed as fractions of the splat's bounding box rather
 * than absolute coordinates. 0 = box min on that axis, 1 = box max, 0.5 = center. This is
 * what actually needs re-tuning against the live splat (see the debug zone editor —
 * press "`" in dev) since the exact geometry depends on how the scan was cropped.
 */
export interface ZoneFractionSpec {
  id: ZoneId;
  label: string;
  description: string;
  /** Fractional center of the invisible hitbox within the bounding box. */
  at: [number, number, number];
  /** Fractional size of the hitbox, relative to the bounding box's full extents. */
  extent: [number, number, number];
  /** Outward-facing normal in local space (doesn't need to be pre-normalized). */
  normal: [number, number, number];
  /** Minimum dot(viewDir, normal) before the zone is considered "facing the camera". */
  visibilityThreshold: number;
}

export interface InteractionZone {
  id: ZoneId;
  label: string;
  description: string;
  mesh: THREE.Mesh;
  /** Outward normal in the parent's local space — the source of truth `normal` is derived from. */
  localNormal: THREE.Vector3;
  /**
   * Outward normal in world space, re-derived from `localNormal` every frame (see
   * `InteractionZones.update`). The parent mesh now animates its own rotation (idle auto-spin),
   * so this can no longer be computed once at load and cached.
   */
  normal: THREE.Vector3;
  surfacePoint: THREE.Vector3;
  visibilityThreshold: number;
  active: boolean;
  hovered: boolean;
}
