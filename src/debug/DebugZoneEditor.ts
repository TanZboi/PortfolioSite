import * as THREE from "three";
import { el } from "../utils/dom";
import type { InteractionZones } from "../zones/InteractionZones";
import type { InteractionZone } from "../zones/types";
import type { CameraRig } from "../scene/CameraRig";

/** Every box, in an order stable for the lifetime of one InteractionZones instance. */
interface FlatBox {
  zone: InteractionZone;
  mesh: THREE.Mesh;
}

const FINE_STEP = 0.004;
const COARSE_STEP = 0.02;
const ROTATE_FINE_STEP = THREE.MathUtils.degToRad(1);
const ROTATE_COARSE_STEP = THREE.MathUtils.degToRad(5);
const THRESHOLD_FINE_STEP = 0.01;
const THRESHOLD_COARSE_STEP = 0.05;

/**
 * Dev-only zone tuning aid (press "`"). Renders the hitboxes as visible wireframe boxes,
 * colors them by whether they're currently angle-active, and prints a live readout of camera
 * azimuth/polar plus each box's at/extent fractions — enough to compare against the splat on
 * screen and hand-tune zoneConfig.ts.
 *
 * On top of that, this supports live "by eye" nudging: Tab selects a box, arrow keys move it,
 * a few letter keys resize it, and everything updates the real mesh in the scene immediately —
 * no HMR remount, no camera reset. Press "p" to log a ready-to-paste zoneConfig.ts snippet with
 * the current values for every box.
 */
export class DebugZoneEditor {
  private visible = false;
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly zones: InteractionZones;
  private readonly cameraRig: CameraRig;
  private readonly size: THREE.Vector3;
  private readonly flatBoxes: FlatBox[];
  private selectedIndex = 0;

  constructor(zones: InteractionZones, cameraRig: CameraRig, container: HTMLElement) {
    this.zones = zones;
    this.cameraRig = cameraRig;
    this.size = zones.bounds.getSize(new THREE.Vector3());
    this.flatBoxes = zones.zones.flatMap((zone) => zone.meshes.map((mesh) => ({ zone, mesh })));

    this.body = el("pre", { class: "debug-zones__body" });
    this.root = el("div", { class: "debug-zones" }, [
      el("div", { class: "debug-zones__title" }, ["ZONE DEBUG · ` to toggle"]),
      this.body,
    ]);
    container.appendChild(this.root);

    window.addEventListener("keydown", this.handleKeydown);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.classList.toggle("debug-zones--visible", this.visible);
    this.zones.setDebugVisible(this.visible);
    // Hold the idle auto-orbit/spin still while tuning — otherwise the target keeps drifting
    // under the cursor and "line it up by eye" is fighting a moving target.
    this.cameraRig.setIdleFrozen(this.visible);
  }

  /** Call once per frame; cheap no-op while hidden. */
  update(): void {
    if (!this.visible) return;

    for (let i = 0; i < this.flatBoxes.length; i++) {
      const { zone, mesh } = this.flatBoxes[i]!;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.set(i === this.selectedIndex ? 0xffff00 : zone.active ? 0x5eead4 : 0xff6b6b);
    }

    const azimuth = THREE.MathUtils.radToDeg(this.cameraRig.controls.getAzimuthalAngle());
    const polar = THREE.MathUtils.radToDeg(this.cameraRig.controls.getPolarAngle());

    const lines = [
      `azimuth ${azimuth.toFixed(1)}°  polar ${polar.toFixed(1)}°`,
      "",
      "tab/shift+tab select · arrows move x/y (shift=coarse) · -/= depth",
      "j/l extent.x · i/k extent.y · u/o extent.z",
      "r/f rot.x · t/g rot.y · y/h rot.z",
      "[ lower thr (shows sooner) · ] raise thr (shows later, shift=coarse) · p = paste",
      "",
      ...this.flatBoxes.map(({ zone, mesh }, i) => {
        const marker = i === this.selectedIndex ? ">" : " ";
        const at = this.boxAt(mesh).map((n) => n.toFixed(3));
        const extent = this.boxExtent(mesh).map((n) => n.toFixed(3));
        const rot = this.boxRotationDeg(mesh).map((n) => n.toFixed(0));
        const thr = zone.visibilityThreshold.toFixed(3);
        return `${marker}${zone.id.padEnd(9)}[${i}] at:[${at.join(", ")}] extent:[${extent.join(", ")}] rot:[${rot.join(", ")}]° thr:${thr}`;
      }),
    ];
    this.body.textContent = lines.join("\n");
  }

  private boxAt(mesh: THREE.Mesh): [number, number, number] {
    const b = this.zones.bounds;
    return [
      (mesh.position.x - b.min.x) / this.size.x,
      (mesh.position.y - b.min.y) / this.size.y,
      (mesh.position.z - b.min.z) / this.size.z,
    ];
  }

  private boxExtent(mesh: THREE.Mesh): [number, number, number] {
    const p = (mesh.geometry as THREE.BoxGeometry).parameters;
    return [p.width / this.size.x, p.height / this.size.y, p.depth / this.size.z];
  }

  private boxRotation(mesh: THREE.Mesh): [number, number, number] {
    return [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z];
  }

  private boxRotationDeg(mesh: THREE.Mesh): [number, number, number] {
    return this.boxRotation(mesh).map((r) => THREE.MathUtils.radToDeg(r)) as [number, number, number];
  }

  private nudgePosition(mesh: THREE.Mesh, axis: "x" | "y" | "z", deltaFraction: number): void {
    mesh.position[axis] += deltaFraction * this.size[axis];
  }

  private nudgeRotation(mesh: THREE.Mesh, axis: "x" | "y" | "z", deltaRadians: number): void {
    mesh.rotation[axis] += deltaRadians;
  }

  /** `visibilityThreshold` is the min dot(viewDir, normal) before a zone counts as "facing the
   *  camera" — this is the knob that controls when hitboxes/glow show and hide as you turn the
   *  model. Shared by every box in the zone, so nudging it via the selected box affects them all. */
  private nudgeThreshold(zone: InteractionZone, delta: number): void {
    zone.visibilityThreshold = THREE.MathUtils.clamp(zone.visibilityThreshold + delta, -1, 1);
  }

  private nudgeExtent(mesh: THREE.Mesh, axis: "x" | "y" | "z", deltaFraction: number): void {
    const extent = this.boxExtent(mesh);
    const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    extent[idx] = Math.max(0.01, extent[idx] + deltaFraction);
    const geometry = new THREE.BoxGeometry(extent[0] * this.size.x, extent[1] * this.size.y, extent[2] * this.size.z);
    mesh.geometry.dispose();
    mesh.geometry = geometry;
  }

  /** Ready-to-paste `visibilityThreshold`/`boxes: [...]` for every zone, grouped by zone id. */
  private formatConfigSnippet(): string {
    const byZone = new Map<string, string[]>();
    const thresholdByZone = new Map<string, number>();
    for (const { zone, mesh } of this.flatBoxes) {
      const at = this.boxAt(mesh).map((n) => n.toFixed(3));
      const extent = this.boxExtent(mesh).map((n) => n.toFixed(3));
      const rotation = this.boxRotation(mesh);
      const hasRotation = rotation.some((r) => Math.abs(r) > 0.001);
      const rotationPart = hasRotation ? `, rotation: [${rotation.map((n) => n.toFixed(4)).join(", ")}]` : "";
      const line = `  { at: [${at.join(", ")}], extent: [${extent.join(", ")}]${rotationPart} },`;
      if (!byZone.has(zone.id)) byZone.set(zone.id, []);
      byZone.get(zone.id)!.push(line);
      thresholdByZone.set(zone.id, zone.visibilityThreshold);
    }
    return [...byZone.entries()]
      .map(
        ([id, lines]) =>
          `${id}:\nvisibilityThreshold: ${thresholdByZone.get(id)!.toFixed(3)},\nboxes: [\n${lines.join("\n")}\n],`,
      )
      .join("\n\n");
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "`") {
      this.toggle();
      return;
    }
    if (!this.visible || this.flatBoxes.length === 0) return;

    if (event.key === "Tab") {
      event.preventDefault();
      const dir = event.shiftKey ? -1 : 1;
      this.selectedIndex = (this.selectedIndex + dir + this.flatBoxes.length) % this.flatBoxes.length;
      return;
    }

    if (event.key === "p") {
      console.log(this.formatConfigSnippet());
      return;
    }

    const { zone, mesh } = this.flatBoxes[this.selectedIndex]!;
    const step = event.shiftKey ? COARSE_STEP : FINE_STEP;

    switch (event.key) {
      // Physical "up" is local -Y (see zoneConfig.ts) — up arrow moves toward it.
      case "ArrowLeft":
        event.preventDefault();
        this.nudgePosition(mesh, "x", -step);
        break;
      case "ArrowRight":
        event.preventDefault();
        this.nudgePosition(mesh, "x", step);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.nudgePosition(mesh, "y", -step);
        break;
      case "ArrowDown":
        event.preventDefault();
        this.nudgePosition(mesh, "y", step);
        break;
      case "-":
        this.nudgePosition(mesh, "z", -step);
        break;
      case "=":
        this.nudgePosition(mesh, "z", step);
        break;
      case "j":
        this.nudgeExtent(mesh, "x", -step);
        break;
      case "l":
        this.nudgeExtent(mesh, "x", step);
        break;
      case "i":
        this.nudgeExtent(mesh, "y", step);
        break;
      case "k":
        this.nudgeExtent(mesh, "y", -step);
        break;
      case "u":
        this.nudgeExtent(mesh, "z", -step);
        break;
      case "o":
        this.nudgeExtent(mesh, "z", step);
        break;
      case "r":
        this.nudgeRotation(mesh, "x", event.shiftKey ? -ROTATE_COARSE_STEP : -ROTATE_FINE_STEP);
        break;
      case "f":
        this.nudgeRotation(mesh, "x", event.shiftKey ? ROTATE_COARSE_STEP : ROTATE_FINE_STEP);
        break;
      case "t":
        this.nudgeRotation(mesh, "y", event.shiftKey ? -ROTATE_COARSE_STEP : -ROTATE_FINE_STEP);
        break;
      case "g":
        this.nudgeRotation(mesh, "y", event.shiftKey ? ROTATE_COARSE_STEP : ROTATE_FINE_STEP);
        break;
      case "y":
        this.nudgeRotation(mesh, "z", event.shiftKey ? -ROTATE_COARSE_STEP : -ROTATE_FINE_STEP);
        break;
      case "h":
        this.nudgeRotation(mesh, "z", event.shiftKey ? ROTATE_COARSE_STEP : ROTATE_FINE_STEP);
        break;
      case "[":
        this.nudgeThreshold(zone, event.shiftKey ? -THRESHOLD_COARSE_STEP : -THRESHOLD_FINE_STEP);
        break;
      case "]":
        this.nudgeThreshold(zone, event.shiftKey ? THRESHOLD_COARSE_STEP : THRESHOLD_FINE_STEP);
        break;
      default:
        break;
    }
  };
}
