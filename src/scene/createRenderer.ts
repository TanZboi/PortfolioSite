import * as THREE from "three";
import { SparkRenderer } from "@sparkjsdev/spark";

export interface SceneRig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  spark: SparkRenderer;
  canvas: HTMLCanvasElement;
  dispose: () => void;
}

/**
 * Boots the THREE.js + Spark rendering stack. Kept deliberately dumb — no splats, no
 * controls, no zones — so it's trivial to reason about and reuse (e.g. from a future
 * debug/test harness).
 */
export function createSceneRig(container: HTMLElement): SceneRig {
  const canvas = document.createElement("canvas");
  canvas.className = "viewport-canvas";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // Spark recommends this off — AA doesn't help splat rendering.
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x07080a, 1);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    100,
  );

  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  const onResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener("resize", onResize);

  const dispose = () => {
    window.removeEventListener("resize", onResize);
    renderer.dispose();
    canvas.remove();
  };

  return { scene, camera, renderer, spark, canvas, dispose };
}
