import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";

export interface GameBoySplatHandle {
  mesh: SplatMesh;
  /** Bounding box in the mesh's *local* frame (i.e. before `mesh.quaternion` is applied). */
  bounds: THREE.Box3;
  /** Bounding box center, transformed into *world* space — use this for the camera target. */
  center: THREE.Vector3;
  /** Largest dimension of the bounding box — handy for framing the camera / sizing zones. */
  radius: number;
  /**
   * The upright-orientation fix baked into `mesh.quaternion` at load time. Anything that wants
   * to keep animating the mesh's rotation afterwards (e.g. the idle auto-spin) needs this so it
   * can compose `spin * correction` each frame instead of clobbering the correction outright.
   */
  correction: THREE.Quaternion;
}

export interface LoadSplatOptions {
  url: string;
  onProgress?: (ratio: number) => void;
}

/**
 * The raw PLY export from Brush/SuperSplat came in upside down relative to Three.js's Y-up
 * convention — a 180° spin around the local Z axis puts it right-side up without touching
 * which face is "front" (that's still whatever local +Z was already pointing at). If it
 * later turns out front/back also needs flipping, that's a separate rotation to compose
 * here, not a reason to change this one.
 */
const ORIENTATION_CORRECTION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

/**
 * Loads the Game Boy splat and settles it into a predictable pose. `mesh.quaternion` carries
 * the orientation fix above; `bounds` stays in the mesh's local (pre-correction) frame since
 * interaction zones are parented under `mesh` and positioned in that same local space — they
 * inherit the correction automatically rather than needing to duplicate it.
 */
export async function loadGameBoySplat({ url, onProgress }: LoadSplatOptions): Promise<GameBoySplatHandle> {
  const mesh = new SplatMesh({
    url,
    onProgress: (event) => {
      if (onProgress && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    },
  });

  await mesh.initialized;
  mesh.quaternion.copy(ORIENTATION_CORRECTION);
  mesh.updateMatrixWorld(true);

  const bounds = mesh.getBoundingBox();
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z);

  const center = bounds.getCenter(new THREE.Vector3()).applyQuaternion(mesh.quaternion);

  return { mesh, bounds, center, radius, correction: ORIENTATION_CORRECTION.clone() };
}
