import * as THREE from "three";
import { CrtSnakeGame } from "./CrtSnakeGame";
import type { ZoneBoxSpec } from "../zones/types";

export interface ScreenGamePlaneOptions {
  /** The splat mesh — the plane is parented to it so it inherits the idle auto-spin for free. */
  parent: THREE.Object3D;
  bounds: THREE.Box3;
  /** The "screen" zone's own hitbox spec — reused as the plane's placement so the visible game
   *  and the clickable region are always the same rectangle, tuned with the same debug editor. */
  box: ZoneBoxSpec;
}

/**
 * Projects the snake game onto a plane positioned exactly over the Game Boy's screen in the
 * splat — the game itself lives on the model rather than in a popup. Hidden until `start()` is
 * called (from the d-pad/buttons zone); once started, stays visible permanently — the plane's
 * single-sided material only ever renders from the correct side anyway, so there's no need to
 * chase the camera around with a visibility check.
 */
export class ScreenGamePlane {
  readonly mesh: THREE.Mesh;
  private readonly game: CrtSnakeGame;
  private readonly texture: THREE.CanvasTexture;
  private started = false;

  constructor(options: ScreenGamePlaneOptions) {
    const { parent, bounds, box } = options;
    const size = bounds.getSize(new THREE.Vector3());

    const canvas = document.createElement("canvas");
    this.game = new CrtSnakeGame({ canvas });

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    // The plane's front face (the side that survives back-face culling toward the camera) samples
    // the canvas mirror-image otherwise — flip U so the game reads the right way round.
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.repeat.x = -1;
    this.texture.offset.x = 1;

    const geometry = new THREE.PlaneGeometry(box.extent[0] * size.x, box.extent[1] * size.y);
    const material = new THREE.MeshBasicMaterial({ map: this.texture });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(
      bounds.min.x + box.at[0] * size.x,
      bounds.min.y + box.at[1] * size.y,
      bounds.min.z + box.at[2] * size.z,
    );
    if (box.rotation) this.mesh.rotation.set(box.rotation[0], box.rotation[1], box.rotation[2]);
    // Nudge out along the plane's own (now-rotated) face normal so it sits just proud of the
    // splat's screen surface instead of z-fighting with it.
    const outward = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation).multiplyScalar(0.01);
    this.mesh.position.add(outward);
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;

    parent.add(this.mesh);
  }

  /** Reveals the plane and starts the (keyboard-controlled) game. Idempotent. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.mesh.visible = true;
    this.game.start();
  }

  /** Call once per app frame. Only re-uploads the canvas to the GPU while visible. */
  update(): void {
    if (this.mesh.visible) this.texture.needsUpdate = true;
  }
}
