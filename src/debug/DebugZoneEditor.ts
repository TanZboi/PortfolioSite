import * as THREE from "three";
import { el } from "../utils/dom";
import type { InteractionZones } from "../zones/InteractionZones";
import type { CameraRig } from "../scene/CameraRig";

/**
 * Dev-only zone tuning aid (press "`"). Renders the hitboxes as visible wireframe boxes,
 * colors them by whether they're currently angle-active, and prints a live readout of camera
 * azimuth/polar plus each zone's world-space geometry — enough to compare against the splat
 * on screen and hand-tune the fractions in zoneConfig.ts without guessing blind.
 *
 * This intentionally doesn't implement drag-to-move gizmos (TransformControls): the fraction-
 * based config in zoneConfig.ts + Vite's instant HMR already makes "edit a number, see it move"
 * a sub-second loop, which covers the same need with a lot less moving code.
 */
export class DebugZoneEditor {
  private visible = false;
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly zones: InteractionZones;
  private readonly cameraRig: CameraRig;

  constructor(zones: InteractionZones, cameraRig: CameraRig, container: HTMLElement) {
    this.zones = zones;
    this.cameraRig = cameraRig;
    this.body = el("pre", { class: "debug-zones__body" });
    this.root = el("div", { class: "debug-zones" }, [
      el("div", { class: "debug-zones__title" }, ["ZONE DEBUG · ` to toggle"]),
      this.body,
    ]);
    container.appendChild(this.root);

    window.addEventListener("keydown", (event) => {
      if (event.key === "`") this.toggle();
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.classList.toggle("debug-zones--visible", this.visible);
    this.zones.setDebugVisible(this.visible);
  }

  /** Call once per frame; cheap no-op while hidden. */
  update(): void {
    if (!this.visible) return;

    const azimuth = THREE.MathUtils.radToDeg(this.cameraRig.controls.getAzimuthalAngle());
    const polar = THREE.MathUtils.radToDeg(this.cameraRig.controls.getPolarAngle());

    const lines = [
      `azimuth ${azimuth.toFixed(1)}°  polar ${polar.toFixed(1)}°`,
      "",
      ...this.zones.zones.map((z) => {
        const p = z.mesh.position;
        const flag = z.active ? (z.hovered ? "●hover" : "●active") : "○";
        return `${z.id.padEnd(9)} ${flag.padEnd(8)} pos(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
      }),
    ];
    this.body.textContent = lines.join("\n");
  }
}
