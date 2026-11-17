import * as THREE from "three";
import type { InteractionZone, ZoneBoxSpec, ZoneFractionSpec, ZoneId } from "./types";
import { ZONE_SPECS } from "./zoneConfig";
import { getGlowTexture } from "./glowTexture";

export interface InteractionZonesOptions {
  /**
   * Parent to hang the hitboxes and glow sprites off — pass the splat mesh itself (not the
   * scene) so zone geometry, defined in the mesh's local space, automatically inherits its
   * orientation correction (see loadGameBoySplat.ts) instead of needing to duplicate it.
   */
  parent: THREE.Object3D;
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  bounds: THREE.Box3;
  onSelect: (id: ZoneId) => void;
}

const CLICK_MAX_MOVE_PX = 6;
const CLICK_MAX_MS = 450;

function zoneMeshFromBox(
  box: ZoneBoxSpec,
  zoneId: ZoneId,
  bounds: THREE.Box3,
): { mesh: THREE.Mesh; extent: THREE.Vector3 } {
  const size = bounds.getSize(new THREE.Vector3());
  const center = new THREE.Vector3(
    bounds.min.x + box.at[0] * size.x,
    bounds.min.y + box.at[1] * size.y,
    bounds.min.z + box.at[2] * size.z,
  );
  const extent = new THREE.Vector3(box.extent[0] * size.x, box.extent[1] * size.y, box.extent[2] * size.z);

  const geometry = new THREE.BoxGeometry(extent.x, extent.y, extent.z);
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(center);
  if (box.rotation) mesh.rotation.set(box.rotation[0], box.rotation[1], box.rotation[2]);
  mesh.userData.zoneId = zoneId;
  // `renderOrder` keeps the (invisible) hitbox from participating in Spark's splat sort;
  // it never draws anything so this only matters if debug wireframe mode is toggled on.
  mesh.renderOrder = 10;
  return { mesh, extent };
}

/**
 * Owns the invisible proxy hitboxes used to click into the Game Boy, the angle-based
 * show/hide logic (dot product between the camera->target direction and each zone's
 * outward normal), and the small glowing "hotspot" affordance rendered over active zones.
 */
export class InteractionZones {
  readonly zones: InteractionZone[];
  /** Kept for the debug editor, which needs to convert live mesh position/geometry back into
   *  the same at/extent fractions the zones were authored in. */
  readonly bounds: THREE.Box3;

  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement;
  private readonly onSelect: (id: ZoneId) => void;
  /**
   * The mesh zones are parented under. Kept around (rather than just used once in the
   * constructor) because `update()` needs its *current* quaternion every frame now that the
   * mesh keeps rotating (idle auto-spin) instead of holding a fixed pose after load.
   */
  private readonly parent: THREE.Object3D;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly glowGroup = new THREE.Group();
  private readonly glowsByZone = new Map<ZoneId, THREE.Sprite[]>();

  private hoveredZone: InteractionZone | null = null;
  private pointerDownAt: { x: number; y: number; t: number } | null = null;
  private elapsed = 0;
  private enabled = true;

  constructor(options: InteractionZonesOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.onSelect = options.onSelect;
    this.parent = options.parent;
    this.bounds = options.bounds;

    this.zones = ZONE_SPECS.map((spec) => this.buildZone(spec, options.bounds));
    for (const zone of this.zones) {
      for (const mesh of zone.meshes) {
        options.parent.add(mesh);
      }
    }
    options.parent.add(this.glowGroup);

    this.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.domElement.addEventListener("pointerup", this.handlePointerUp);
    this.domElement.addEventListener("pointerleave", this.handlePointerLeave);
  }

  private buildZone(spec: ZoneFractionSpec, bounds: THREE.Box3): InteractionZone {
    const localNormal = new THREE.Vector3(...spec.normal).normalize();
    // `spec.normal` is authored in the mesh's local space; rotate a copy into world space so the
    // angle-visibility check in update() is a plain world-space dot product against the (also
    // world-space) camera direction. The parent now keeps rotating (idle auto-spin), so this is
    // just the initial value — update() re-derives it from `localNormal` every frame.
    const normal = localNormal.clone().applyQuaternion(this.parent.quaternion);

    const meshes: THREE.Mesh[] = [];
    const surfacePoints: THREE.Vector3[] = [];
    const glows: THREE.Sprite[] = [];

    // One mesh + one glow per box — most zones have a single box, but "controls" has one per
    // physical button (see zoneConfig.ts). They all share the zone's normal/active/hovered state
    // since they're all on the same face and trigger the same action.
    for (const box of spec.boxes) {
      const { mesh, extent } = zoneMeshFromBox(box, spec.id, bounds);
      meshes.push(mesh);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getGlowTexture(),
          color: 0x5eead4,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const glowScale = Math.max(extent.x, extent.y) * 0.28;
      glow.scale.setScalar(glowScale);
      // Glow sprite is parented alongside the hitbox (both children of the splat mesh), so its
      // offset off the surface uses the *local* normal, not the world-space one above.
      const surfacePoint = mesh.position.clone().addScaledVector(localNormal, 0.04);
      glow.position.copy(surfacePoint);
      glow.userData.baseScale = glowScale;
      this.glowGroup.add(glow);

      surfacePoints.push(surfacePoint);
      glows.push(glow);
    }
    this.glowsByZone.set(spec.id, glows);

    return {
      id: spec.id,
      label: spec.label,
      description: spec.description,
      meshes,
      localNormal,
      normal,
      surfacePoints,
      visibilityThreshold: spec.visibilityThreshold,
      active: false,
      hovered: false,
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.setHovered(null);
    }
  }

  /** Toggle the debug view: zones render as visible wireframe boxes with full-opacity glow. */
  setDebugVisible(visible: boolean): void {
    for (const zone of this.zones) {
      for (const mesh of zone.meshes) {
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.wireframe = visible;
        material.opacity = visible ? 0.35 : 0;
        material.color.set(zone.active ? 0x5eead4 : 0xff6b6b);
      }
    }
  }

  /** Call once per frame with the current unit view direction (target -> camera, world space). */
  update(viewDirWorld: THREE.Vector3, deltaTime: number): void {
    this.elapsed += deltaTime;

    for (const zone of this.zones) {
      // Re-derive from `localNormal` every frame — the parent mesh keeps rotating (idle
      // auto-spin), so a normal cached at load time would drift out of sync with which face is
      // actually pointed at the camera.
      zone.normal.copy(zone.localNormal).applyQuaternion(this.parent.quaternion);
      const facing = zone.normal.dot(viewDirWorld);
      zone.active = this.enabled && facing >= zone.visibilityThreshold;

      const glows = this.glowsByZone.get(zone.id);
      if (!glows) continue;

      for (const glow of glows) {
        const material = glow.material as THREE.SpriteMaterial;

        if (!zone.active) {
          material.opacity = THREE.MathUtils.damp(material.opacity, 0, 8, deltaTime);
          continue;
        }

        // Phased per-glow (not per-zone) so a zone's several buttons don't pulse in lockstep.
        const pulse = 0.75 + Math.sin(this.elapsed * 2.4 + glow.id) * 0.25;
        const hoverBoost = zone.hovered ? 1.4 : 1;
        const targetOpacity = pulse * 0.55 * hoverBoost;
        material.opacity = THREE.MathUtils.damp(material.opacity, targetOpacity, 10, deltaTime);

        const baseScale = glow.userData.baseScale as number;
        glow.scale.setScalar(baseScale * (zone.hovered ? 1.25 : 1) * (0.92 + pulse * 0.16));
      }
    }
  }

  private getActiveMeshes(): THREE.Mesh[] {
    return this.zones.filter((z) => z.active).flatMap((z) => z.meshes);
  }

  private updatePointerNdc(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickZone(): InteractionZone | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.getActiveMeshes(), false);
    if (hits.length === 0) return null;
    const id = hits[0]?.object.userData.zoneId as ZoneId | undefined;
    return this.zones.find((z) => z.id === id) ?? null;
  }

  private setHovered(zone: InteractionZone | null): void {
    if (this.hoveredZone === zone) return;
    if (this.hoveredZone) this.hoveredZone.hovered = false;
    this.hoveredZone = zone;
    if (zone) zone.hovered = true;
    this.domElement.style.cursor = zone ? "pointer" : "";
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    this.updatePointerNdc(event);
    this.setHovered(this.pickZone());
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownAt = { x: event.clientX, y: event.clientY, t: performance.now() };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const down = this.pointerDownAt;
    this.pointerDownAt = null;
    if (!down || !this.enabled) return;

    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    const moved = Math.hypot(dx, dy);
    const elapsedMs = performance.now() - down.t;
    if (moved > CLICK_MAX_MOVE_PX || elapsedMs > CLICK_MAX_MS) return;

    this.updatePointerNdc(event);
    const zone = this.pickZone();
    if (zone) this.onSelect(zone.id);
  };

  private readonly handlePointerLeave = (): void => {
    this.setHovered(null);
  };

  dispose(): void {
    this.domElement.removeEventListener("pointermove", this.handlePointerMove);
    this.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.domElement.removeEventListener("pointerup", this.handlePointerUp);
    this.domElement.removeEventListener("pointerleave", this.handlePointerLeave);
    for (const zone of this.zones) {
      for (const mesh of zone.meshes) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    }
    for (const glows of this.glowsByZone.values()) {
      for (const glow of glows) {
        (glow.material as THREE.SpriteMaterial).dispose();
      }
    }
  }
}
