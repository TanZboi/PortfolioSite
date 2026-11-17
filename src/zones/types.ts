import type * as THREE from "three";

export type ZoneId = "screen" | "controls" | "cartridge" | "back";

/**
 * One hitbox within a zone, expressed as fractions of the splat's bounding box rather than
 * absolute coordinates. 0 = box min on that axis, 1 = box max, 0.5 = center. This is what
 * actually needs re-tuning against the live splat (see the debug zone editor — press "`" in
 * dev) since the exact geometry depends on how the scan was cropped.
 */
export interface ZoneBoxSpec {
  /** Fractional center of this hitbox within the bounding box. */
  at: [number, number, number];
  /** Fractional size of this hitbox, relative to the bounding box's full extents. */
  extent: [number, number, number];
  /** Optional local-space Euler rotation (radians, XYZ order) for hitboxes that need to sit
   *  askew — e.g. a d-pad arm that isn't quite axis-aligned in the raw scan. Omit for none. */
  rotation?: [number, number, number];
}

/** Author-time zone definition. */
export interface ZoneFractionSpec {
  id: ZoneId;
  label: string;
  description: string;
  /**
   * One or more hitboxes that all trigger this zone. Most zones are a single box; `controls`
   * uses one small box per physical button instead of a single loose one spanning the gap
   * between the d-pad and the A/B buttons — see zoneConfig.ts.
   */
  boxes: ZoneBoxSpec[];
  /** Outward-facing normal in local space (doesn't need to be pre-normalized). Shared by every
   *  box in the zone — they're all on the same physical face. */
  normal: [number, number, number];
  /** Minimum dot(viewDir, normal) before the zone is considered "facing the camera". */
  visibilityThreshold: number;
}

export interface InteractionZone {
  id: ZoneId;
  label: string;
  description: string;
  /** One mesh per box in the zone's spec — see `ZoneFractionSpec.boxes`. */
  meshes: THREE.Mesh[];
  /** Outward normal in the parent's local space — the source of truth `normal` is derived from. */
  localNormal: THREE.Vector3;
  /**
   * Outward normal in world space, re-derived from `localNormal` every frame (see
   * `InteractionZones.update`). The parent mesh now animates its own rotation (idle auto-spin),
   * so this can no longer be computed once at load and cached.
   */
  normal: THREE.Vector3;
  /** One glow anchor point per box, parallel to `meshes`. */
  surfacePoints: THREE.Vector3[];
  visibilityThreshold: number;
  active: boolean;
  hovered: boolean;
}
