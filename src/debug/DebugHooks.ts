import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";
import type { CameraRig } from "../scene/CameraRig";
import type { InteractionZones } from "../zones/InteractionZones";

export interface DebugContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  mesh: SplatMesh;
  bounds: THREE.Box3;
  center: THREE.Vector3;
  radius: number;
  cameraRig: CameraRig;
  zones: InteractionZones;
}

declare global {
  interface Window {
    __gb?: DebugContext;
  }
}

/**
 * Dev-only escape hatch onto the live scene graph. Used by the zone-tuning workflow (see
 * README "Tuning interaction zones") to poke at camera/bounds/mesh state from the console
 * instead of threading debug plumbing through every module. Never runs in production.
 */
export function exposeDebugHooks(ctx: DebugContext): void {
  if (!import.meta.env.DEV) return;
  window.__gb = ctx;
  // eslint-disable-next-line no-console
  console.info("[debug] window.__gb exposed:", ctx);
}
