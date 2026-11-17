import * as THREE from "three";
import { createSceneRig } from "../scene/createRenderer";
import { CameraRig } from "../scene/CameraRig";
import { loadGameBoySplat } from "../splat/loadGameBoySplat";
import { ExplodeEffect } from "../splat/explode";
import { PulseEffect } from "../splat/pulse";
import { createLoadingScreen } from "../ui/loadingScreen";
import { createHud } from "../ui/hud";
import { createZoneMenu, type ZoneMenu } from "../ui/zoneMenu";
import { exposeDebugHooks } from "../debug/DebugHooks";
import { DebugZoneEditor } from "../debug/DebugZoneEditor";
import { InteractionZones } from "../zones/InteractionZones";
import { ZONE_SPECS } from "../zones/zoneConfig";
import type { ZoneId } from "../zones/types";
import { ScreenGamePlane } from "../game/ScreenGamePlane";
import { PanelController, type PanelRenderer } from "../ui/PanelController";
import { resumePanel } from "../ui/panels/resumePanel";
import { projectsPanel } from "../ui/panels/projectsPanel";
import { aboutPanel } from "../ui/panels/aboutPanel";

const SPLAT_URL = "/SplatExport.ply";

// "controls" has no popup — clicking it starts the game on the in-scene screen instead (see
// the onSelect handler in boot()).
const PANEL_RENDERERS: Partial<Record<ZoneId, PanelRenderer>> = {
  screen: resumePanel,
  cartridge: projectsPanel,
  back: aboutPanel,
};

const ZONE_HINTS: Record<ZoneId, string> = {
  screen: "the screen",
  cartridge: "the Tetris cartridge",
  controls: "the A & B buttons",
  back: "the battery cover",
};

/** Full turntable revolution every ~150s at full auto-orbit strength — a slow ambient drift,
 *  layered under the (faster, ~100s/revolution) camera auto-orbit so the two don't read as the
 *  same motion twice. Negative so idle standby spins opposite to the intro swoop's sweep instead
 *  of reading as it winding back on itself. */
const MESH_AUTO_SPIN_RAD_PER_SEC = -(Math.PI * 2) / 45;
const MESH_SPIN_AXIS = new THREE.Vector3(0, 1, 0);

export class App {
  private readonly rig: ReturnType<typeof createSceneRig>;
  private readonly hud: ReturnType<typeof createHud>;
  private readonly loading: ReturnType<typeof createLoadingScreen>;
  private readonly timer = new THREE.Timer();
  private readonly viewDir = new THREE.Vector3();

  private cameraRig?: CameraRig;
  private explode?: ExplodeEffect;
  private pulse?: PulseEffect;
  private zones?: InteractionZones;
  private zoneMenu?: ZoneMenu;
  private screenGame?: ScreenGamePlane;
  private panels?: PanelController;
  private debugZones?: DebugZoneEditor;

  private mesh?: THREE.Object3D;
  private meshCorrection = new THREE.Quaternion();
  private spinAngle = 0;
  private readonly spinQuaternion = new THREE.Quaternion();

  private baseHint = "";
  private lastHintText: string | null = null;

  constructor(container: HTMLElement) {
    // Field initializers run before this constructor body in JS — so these three, which
    // depend on `container`, are built explicitly here rather than as field initializers.
    this.rig = createSceneRig(container);
    this.hud = createHud(container);
    this.loading = createLoadingScreen(container);
    this.boot(container);
  }

  private async boot(container: HTMLElement): Promise<void> {
    this.loading.setStatus("streaming splat data…");

    const { mesh, center, radius, bounds, correction } = await loadGameBoySplat({
      url: SPLAT_URL,
      onProgress: (ratio) => this.loading.setProgress(ratio),
    });
    this.mesh = mesh;
    this.meshCorrection = correction;

    this.loading.setStatus("compiling shader graph…");

    this.explode = new ExplodeEffect({ center, radius });
    this.pulse = new PulseEffect({ bounds });
    // Both are independent Dyno graphs chained on the same mesh — Spark applies objectModifiers
    // in sequence, gsplat in, gsplat out, so the pulse's scale multiply just layers on top of
    // whatever the explode effect (idle the rest of the time) has already done.
    mesh.objectModifiers = [this.explode.modifier, this.pulse.modifier];
    this.rig.scene.add(mesh);

    const framingDistance = radius * 1.2;
    this.cameraRig = new CameraRig({
      camera: this.rig.camera,
      domElement: this.rig.canvas,
      target: center,
      distance: framingDistance,
      minDistance: radius * 0.9,
      maxDistance: radius * 5,
      // The opening swoop settles into this same framing; once it does, interaction can start.
      onIntroComplete: () => {
        this.zones?.setEnabled(true);
        this.baseHint = "drag to orbit · scroll to zoom · click the game boy to explore";
        this.hud.setHint(this.baseHint);
        window.setTimeout(() => {
          this.baseHint = "";
        }, 6000);
      },
    });

    this.panels = new PanelController({
      container,
      renderers: PANEL_RENDERERS,
      onOpenChange: (open) => {
        this.cameraRig?.setEnabled(!open);
        this.zones?.setEnabled(!open);
      },
    });

    this.zones = new InteractionZones({
      parent: mesh,
      camera: this.rig.camera,
      domElement: this.rig.canvas,
      bounds,
      onSelect: (id) => {
        // The d-pad/buttons zone plays the game on the model itself rather than in a popup.
        if (id === "controls") {
          this.screenGame?.start();
          return;
        }
        this.panels?.open(id);
      },
    });
    // Stay inert until the opening swoop settles — the camera/mesh are both still moving through
    // the intro, and hovering/clicking mid-swoop would just pick up whatever transient angle the
    // camera happens to be passing through.
    this.zones.setEnabled(false);

    this.zoneMenu = createZoneMenu(
      container,
      this.zones.zones.map((zone) => ({ id: zone.id, hint: ZONE_HINTS[zone.id], description: zone.description })),
    );

    // Reuses the "screen" zone's own hitbox spec for placement, so the visible game and the
    // clickable region are always the same rectangle, tuned with the same debug editor.
    const screenBox = ZONE_SPECS.find((zone) => zone.id === "screen")?.boxes[0];
    if (screenBox) {
      this.screenGame = new ScreenGamePlane({ parent: mesh, bounds, box: screenBox });
    }

    this.debugZones = new DebugZoneEditor(this.zones, this.cameraRig, container);

    this.hud.onExplode(() => this.explode?.trigger());
    this.hud.setExplodeEnabled(true);

    exposeDebugHooks({
      scene: this.rig.scene,
      camera: this.rig.camera,
      renderer: this.rig.renderer,
      mesh,
      bounds,
      center,
      radius,
      cameraRig: this.cameraRig,
      zones: this.zones,
    });

    this.loading.hide();
    this.startLoop();
  }

  private startLoop(): void {
    this.timer.connect(document);
    this.rig.renderer.setAnimationLoop(() => {
      this.timer.update();
      const dt = Math.min(this.timer.getDelta(), 1 / 20);

      this.cameraRig?.update(dt);
      this.explode?.update(dt);
      this.updateMeshSpin(dt);
      this.updatePulse();

      if (this.cameraRig && this.zones) {
        this.cameraRig.getViewDirection(this.viewDir);
        this.zones.update(this.viewDir, dt);
        this.updateHint();
      }
      this.screenGame?.update();
      this.debugZones?.update();

      this.rig.renderer.render(this.rig.scene, this.rig.camera);
    });
  }

  /**
   * Slowly spins the mesh around world "up" — its own idle turntable motion, layered under the
   * camera's auto-orbit. Composed as `spin * correction` each frame (rather than touching
   * `mesh.rotation` directly) so the upright fix baked in at load time never gets clobbered.
   * Riding the same `autoOrbitStrength` as the camera means both pause together the instant the
   * user drags, and ease back in together once the 5s stillness window elapses.
   */
  private updateMeshSpin(dt: number): void {
    if (!this.mesh || !this.cameraRig) return;
    this.spinAngle += MESH_AUTO_SPIN_RAD_PER_SEC * this.cameraRig.autoOrbitStrength * dt;
    this.spinQuaternion.setFromAxisAngle(MESH_SPIN_AXIS, this.spinAngle);
    this.mesh.quaternion.multiplyQuaternions(this.spinQuaternion, this.meshCorrection);
  }

  /**
   * Rides the same idle-strength signal as the camera auto-orbit and mesh auto-spin, so the wave
   * fades out the instant the user drags and eases back in with them — plus a hard cut whenever
   * the explode gizmo isn't idle, since a flying-apart splat pulsing its scale on top is just noise.
   */
  private updatePulse(): void {
    if (!this.pulse || !this.cameraRig) return;
    const explodeIdle = this.explode?.isIdle ?? true;
    this.pulse.setStrength(explodeIdle ? this.cameraRig.autoOrbitStrength : 0);
  }

  /** Swaps the HUD hint to "click the X" while a zone is hovered, restoring the base hint after. */
  private updateHint(): void {
    if (!this.zones) return;
    const hovered = this.zones.zones.find((z) => z.hovered);
    this.zoneMenu?.setActive(hovered?.id ?? null);
    const text = hovered ? `click ${ZONE_HINTS[hovered.id]} · ${hovered.description.toLowerCase()}` : this.baseHint;
    if (text === this.lastHintText) return;
    this.lastHintText = text;
    this.hud.setHint(text);
  }
}
