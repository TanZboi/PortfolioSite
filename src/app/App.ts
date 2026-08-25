import * as THREE from "three";
import { createSceneRig } from "../scene/createRenderer";
import { CameraRig } from "../scene/CameraRig";
import { loadGameBoySplat } from "../splat/loadGameBoySplat";
import { ExplodeEffect } from "../splat/explode";
import { createLoadingScreen } from "../ui/loadingScreen";
import { createHud } from "../ui/hud";
import { exposeDebugHooks } from "../debug/DebugHooks";
import { DebugZoneEditor } from "../debug/DebugZoneEditor";
import { InteractionZones } from "../zones/InteractionZones";
import type { ZoneId } from "../zones/types";
import { PanelController, type PanelRenderer } from "../ui/PanelController";
import { resumePanel } from "../ui/panels/resumePanel";
import { projectsPanel } from "../ui/panels/projectsPanel";
import { gamePanel } from "../ui/panels/gamePanel";
import { aboutPanel } from "../ui/panels/aboutPanel";

const SPLAT_URL = "/SplatExport.ply";

const PANEL_RENDERERS: Record<ZoneId, PanelRenderer> = {
  screen: resumePanel,
  cartridge: projectsPanel,
  controls: gamePanel,
  back: aboutPanel,
};

const ZONE_HINTS: Record<ZoneId, string> = {
  screen: "the screen",
  cartridge: "the cartridge slot",
  controls: "the d-pad",
  back: "the battery cover",
};

/** Full turntable revolution every ~150s at full auto-orbit strength — a slow ambient drift,
 *  layered under the (faster, ~100s/revolution) camera auto-orbit so the two don't read as the
 *  same motion twice. Negative so idle standby spins opposite to the intro swoop's sweep instead
 *  of reading as it winding back on itself. */
const MESH_AUTO_SPIN_RAD_PER_SEC = -(Math.PI * 2) / 150;
const MESH_SPIN_AXIS = new THREE.Vector3(0, 1, 0);

export class App {
  private readonly rig: ReturnType<typeof createSceneRig>;
  private readonly hud: ReturnType<typeof createHud>;
  private readonly loading: ReturnType<typeof createLoadingScreen>;
  private readonly timer = new THREE.Timer();
  private readonly viewDir = new THREE.Vector3();

  private cameraRig?: CameraRig;
  private explode?: ExplodeEffect;
  private zones?: InteractionZones;
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
    mesh.objectModifier = this.explode.modifier;
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
      onSelect: (id) => this.panels?.open(id),
    });
    // Stay inert until the opening swoop settles — the camera/mesh are both still moving through
    // the intro, and hovering/clicking mid-swoop would just pick up whatever transient angle the
    // camera happens to be passing through.
    this.zones.setEnabled(false);

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

      if (this.cameraRig && this.zones) {
        this.cameraRig.getViewDirection(this.viewDir);
        this.zones.update(this.viewDir, dt);
        this.updateHint();
      }
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

  /** Swaps the HUD hint to "click the X" while a zone is hovered, restoring the base hint after. */
  private updateHint(): void {
    if (!this.zones) return;
    const hovered = this.zones.zones.find((z) => z.hovered);
    const text = hovered ? `click ${ZONE_HINTS[hovered.id]} · ${hovered.description.toLowerCase()}` : this.baseHint;
    if (text === this.lastHintText) return;
    this.lastHintText = text;
    this.hud.setHint(text);
  }
}
