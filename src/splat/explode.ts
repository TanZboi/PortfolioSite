import * as THREE from "three";
import { SplatMesh, dyno } from "@sparkjsdev/spark";
import type { GsplatModifier } from "@sparkjsdev/spark";
import { clamp, easeInOutCubic, easeOutBack } from "../utils/math";

type DynoFloatVal = dyno.DynoVal<"float">;

export type ExplodePhase = "idle" | "exploding" | "held" | "reassembling";

export interface ExplodeOptions {
  /** Object-space center of the splat's bounding box — the point everything flies away from. */
  center: THREE.Vector3;
  /** Bounding box's largest dimension; travel distance is derived from this. */
  radius: number;
  /** Seconds spent flying outward. */
  explodeDuration?: number;
  /** Seconds spent held at full extension before reassembling. */
  holdDuration?: number;
  /** Seconds spent easing back together. */
  reassembleDuration?: number;
  /** 0 = every splat flies straight out from the object center, 1 = fully random directions. */
  randomness?: number;
  /** Peak travel distance as a multiple of `radius`. */
  distanceScale?: number;
}

const HASH_SALT = 43758.5453123;

/** Classic `fract(sin(x*k)*salt)` 1D hash. Cheap, deterministic per splat index, good enough for cosmetic jitter. */
function hash1(seed: DynoFloatVal, k: number): DynoFloatVal {
  const scaled = dyno.mul(seed, dyno.dynoConst("float", k));
  return dyno.fract(dyno.mul(dyno.sin(scaled), dyno.dynoConst("float", HASH_SALT)));
}

/** Remaps a 0..1 hash value into [lo, hi]. */
function hashRange(h: DynoFloatVal, lo: number, hi: number): DynoFloatVal {
  return dyno.mix(dyno.dynoConst("float", lo), dyno.dynoConst("float", hi), h);
}

/**
 * Drives the "explode gizmo" — the site's signature interaction. Builds a Dyno shader-graph
 * `objectModifier` once (see Spark's Particle Simulation example for the pattern this follows)
 * that offsets every splat's center by a per-splat pseudo-random vector, scaled by a single
 * `progress` uniform. All the organic, non-uniform feel (different splats leaving at different
 * "speeds", travelling different distances, drifting instead of moving in a dead-straight line)
 * comes from per-splat hashes of the splat's own index — no CPU-side per-splat work at all.
 *
 * `update()` owns a tiny state machine (idle -> exploding -> held -> reassembling -> idle) and
 * writes the eased progress value into the uniform each frame; the GPU does the rest.
 */
export class ExplodeEffect {
  readonly modifier: GsplatModifier;

  private readonly progressUniform: dyno.DynoFloat<string>;
  private readonly explodeDuration: number;
  private readonly holdDuration: number;
  private readonly reassembleDuration: number;

  private phaseState: ExplodePhase = "idle";
  private phaseTime = 0;

  constructor(options: ExplodeOptions) {
    this.explodeDuration = options.explodeDuration ?? 0.9;
    this.holdDuration = options.holdDuration ?? 0.65;
    this.reassembleDuration = options.reassembleDuration ?? 1.1;

    const randomness = clamp(options.randomness ?? 0.4, 0, 1);
    const distance = options.radius * (options.distanceScale ?? 1.7);

    this.progressUniform = dyno.dynoFloat(0, "explodeProgress");

    const center = dyno.dynoVec3(options.center, "explodeCenter");
    const maxDistance = dyno.dynoConst("float", distance);
    const randomMix = dyno.dynoConst("float", randomness);

    this.modifier = dyno.dynoBlock(
      { gsplat: dyno.Gsplat },
      { gsplat: dyno.Gsplat },
      ({ gsplat }) => {
        if (!gsplat) return undefined;

        const split = dyno.splitGsplat(gsplat).outputs;
        const idx = dyno.float(split.index);

        // Seven decorrelated hashes of the splat index: 3 for a random direction, one each
        // for distance/timing/flutter variety.
        const hx = hash1(idx, 12.9898);
        const hy = hash1(idx, 78.233);
        const hz = hash1(idx, 37.719);
        const hDist = hash1(idx, 91.345);
        const hExp = hash1(idx, 54.321);
        const hFreq = hash1(idx, 26.615);
        const hPhase = hash1(idx, 63.981);

        const randomDir = dyno.normalize(
          dyno.combine({
            vectorType: "vec3",
            x: dyno.sub(dyno.mul(hx, dyno.dynoConst("float", 2)), dyno.dynoConst("float", 1)),
            y: dyno.sub(dyno.mul(hy, dyno.dynoConst("float", 2)), dyno.dynoConst("float", 1)),
            z: dyno.sub(dyno.mul(hz, dyno.dynoConst("float", 2)), dyno.dynoConst("float", 1)),
          }),
        );
        const outwardDir = dyno.normalize(dyno.sub(split.center, center));
        const dir = dyno.normalize(dyno.mix(outwardDir, randomDir, randomMix));

        // Different splats reach peak displacement at different rates (some snap out fast,
        // some lag) even though they all share the single `progress` timeline.
        const timeExponent = hashRange(hExp, 0.55, 2.6);
        const localProgress = dyno.pow(this.progressUniform, timeExponent);

        const distScale = hashRange(hDist, 0.55, 1.35);

        // Small sideways flutter so trajectories read as debris, not a rigid pin-cushion.
        const flutterFreq = hashRange(hFreq, 2, 6);
        const flutterPhase = dyno.mul(hPhase, dyno.dynoConst("float", Math.PI * 2));
        const flutter = dyno.mul(
          dyno.sin(dyno.add(dyno.mul(SplatMesh.dynoTime, flutterFreq), flutterPhase)),
          dyno.mul(localProgress, dyno.dynoConst("float", distance * 0.06)),
        );

        const travel = dyno.mul(maxDistance, dyno.mul(localProgress, distScale));
        const offset = dyno.add(dyno.mul(dir, travel), dyno.mul(randomDir, flutter));
        const newCenter = dyno.add(split.center, offset);

        // Fragments shrink slightly as they fly out — reads as debris instead of the mesh
        // just tearing into full-size clones of itself.
        const scaleMul = dyno.mix(dyno.dynoConst("float", 1), dyno.dynoConst("float", 0.45), localProgress);
        const newScales = dyno.mul(split.scales, scaleMul);

        return {
          gsplat: dyno.combineGsplat({ gsplat, center: newCenter, scales: newScales }),
        };
      },
    );
  }

  get phase(): ExplodePhase {
    return this.phaseState;
  }

  get isIdle(): boolean {
    return this.phaseState === "idle";
  }

  /** Kick off (or restart) the explode -> hold -> reassemble cycle. */
  trigger(): void {
    this.phaseState = "exploding";
    this.phaseTime = 0;
  }

  /** Call once per frame with the delta time in seconds. */
  update(deltaTime: number): void {
    if (this.phaseState === "idle") return;

    this.phaseTime += deltaTime;

    switch (this.phaseState) {
      case "exploding": {
        const t = clamp(this.phaseTime / this.explodeDuration, 0, 1);
        // easeOutBack overshoots slightly past 1 on purpose — a little bounce as it commits
        // to the explosion — so this only clamps the low end.
        this.progressUniform.value = Math.max(0, easeOutBack(t));
        if (t >= 1) {
          this.phaseState = "held";
          this.phaseTime = 0;
        }
        break;
      }
      case "held": {
        this.progressUniform.value = 1;
        if (this.phaseTime >= this.holdDuration) {
          this.phaseState = "reassembling";
          this.phaseTime = 0;
        }
        break;
      }
      case "reassembling": {
        const t = clamp(this.phaseTime / this.reassembleDuration, 0, 1);
        this.progressUniform.value = 1 - easeInOutCubic(t);
        if (t >= 1) {
          this.phaseState = "idle";
          this.phaseTime = 0;
          this.progressUniform.value = 0;
        }
        break;
      }
    }
  }
}
