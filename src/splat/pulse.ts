import * as THREE from "three";
import { SplatMesh, dyno } from "@sparkjsdev/spark";
import type { GsplatModifier } from "@sparkjsdev/spark";
import { clamp } from "../utils/math";

export interface PulseOptions {
  /** Object-space bounding box — same local frame the splat itself lives in — the waves sweep across. */
  bounds: THREE.Box3;
  /** Seconds for one full ripple cycle ("every 3 seconds"). */
  period?: number;
  /** Wavelength of the low-level ripple along the local Y axis, in local units. Defaults to the
   *  object's own height, so exactly one ripple crest is in flight across the whole thing at once. */
  wavelength?: number;
  /** Ripple's scale swing at its peak/trough — 0.35 means splats range roughly 0.65x–1.35x size. */
  amplitude?: number;
  /** Seconds for one full big-sweep cycle. Defaults to double the ripple's `period`, so the sweep
   *  reads as its own slower, unmissable event rather than just riding the ripple's rhythm. */
  bigPeriod?: number;
  /** The big sweep's peak scale add-on — 0.85 means splats caught at the band's center peak at
   *  roughly 1.85x size. This one only ever grows (never shrinks below 1x), so it reads as a
   *  single pulse passing through rather than another ripple. */
  bigAmplitude?: number;
  /** The big sweep band's half-width, as a fraction of the object's height — how "thick" the
   *  traveling pulse looks. Smaller reads as a sharper wavefront, larger as a broader swell. */
  bigBandFraction?: number;
}

/**
 * Builds a Dyno shader-graph `objectModifier` that layers two effects on top of every splat's
 * scale, both driven by the object's local Y position and `SplatMesh.dynoTime`:
 *
 * 1. A low-level continuous ripple — `sin(k·y - ω·t)` — every point grows and shrinks once every
 *    `period` seconds, neighbouring points slightly out of phase, so it reads as a gentle wave
 *    sweeping through the object rather than the whole thing breathing in place.
 * 2. One big, unmissable pulse band that sweeps bottom-to-top once every `bigPeriod` seconds — a
 *    single localized bump in scale (never a shrink) travelling the object's full height, on its
 *    own slower clock so it stands out from the ripple's rhythm instead of blurring into it.
 *
 * Both are pure functions of position + a shared clock, not per-splat randomness (that's the
 * explode effect's job) — the point is a wave that visibly propagates through the object.
 *
 * Meant to run continuously as part of the idle/standby motion alongside the camera auto-orbit
 * and mesh auto-spin (see App.ts). It has no on/off state of its own — `setStrength()` is called
 * every frame with the same 0..1 idle-strength value those use, so everything fades out together
 * the instant the user drags or triggers the explode gizmo, and eases back in together after.
 */
export class PulseEffect {
  readonly modifier: GsplatModifier;

  private readonly strengthUniform: dyno.DynoFloat<string>;

  constructor(options: PulseOptions) {
    const period = options.period ?? 3;
    const bigPeriod = options.bigPeriod ?? period * 2;
    const size = options.bounds.getSize(new THREE.Vector3());
    const height = Math.max(size.y, 1e-4);
    const wavelength = options.wavelength ?? height;
    const amplitude = options.amplitude ?? 0.35;
    const bigAmplitude = options.bigAmplitude ?? 0.85;
    const bigHalfWidth = (options.bigBandFraction ?? 0.16) * height;

    // The raw scan came in upside down (see loadGameBoySplat.ts's ORIENTATION_CORRECTION), so in
    // this *local*, pre-correction frame physical top-of-device sits near `bounds.min.y` and
    // physical bottom near `bounds.max.y` — the opposite of what you'd naively guess (same
    // inversion zoneConfig.ts's fractions account for). So "bottom to top" travels local Y from
    // max down to min. Both ends overshoot past the object by the band's own half-width, so the
    // envelope is already ~0 before it reaches either edge — no visible pop when the cycle wraps.
    const travelStart = options.bounds.max.y + bigHalfWidth;
    const travelEnd = options.bounds.min.y - bigHalfWidth;

    this.strengthUniform = dyno.dynoFloat(0, "pulseStrength");

    const spatialFreq = dyno.dynoConst("float", (Math.PI * 2) / wavelength);
    const angularFreq = dyno.dynoConst("float", (Math.PI * 2) / period);
    const amplitudeConst = dyno.dynoConst("float", amplitude);
    const bigAmplitudeConst = dyno.dynoConst("float", bigAmplitude);
    const invBigPeriod = dyno.dynoConst("float", 1 / bigPeriod);
    const invBigHalfWidth = dyno.dynoConst("float", 1 / bigHalfWidth);
    const travelStartConst = dyno.dynoConst("float", travelStart);
    const travelEndConst = dyno.dynoConst("float", travelEnd);
    const zero = dyno.dynoConst("float", 0);
    const one = dyno.dynoConst("float", 1);
    const two = dyno.dynoConst("float", 2);
    const three = dyno.dynoConst("float", 3);

    this.modifier = dyno.dynoBlock(
      { gsplat: dyno.Gsplat },
      { gsplat: dyno.Gsplat },
      ({ gsplat }) => {
        if (!gsplat) return undefined;

        const split = dyno.splitGsplat(gsplat).outputs;
        const y = dyno.split(split.center).outputs.y;

        // 1. Low-level ripple: standard traveling-wave form, phase advances with both position
        // and time so the crest itself moves through space as time passes.
        const spatialPhase = dyno.mul(y, spatialFreq);
        const timePhase = dyno.mul(SplatMesh.dynoTime, angularFreq);
        const wave = dyno.sin(dyno.sub(spatialPhase, timePhase));
        const rippleTerm = dyno.mul(wave, amplitudeConst);

        // 2. Big sweep: one band centered at `travelPos`, which slides from travelStart to
        // travelEnd once every `bigPeriod` seconds (fract() gives the sawtooth restart). A cheap
        // smoothstep-shaped falloff (3t²-2t³) turns distance-from-band-center into a soft 0..1
        // bump instead of a hard-edged block.
        const cyclePhase = dyno.fract(dyno.mul(SplatMesh.dynoTime, invBigPeriod));
        const travelPos = dyno.mix(travelStartConst, travelEndConst, cyclePhase);
        const dist = dyno.abs(dyno.sub(y, travelPos));
        const t = dyno.clamp(dyno.sub(one, dyno.mul(dist, invBigHalfWidth)), zero, one);
        const bump = dyno.mul(dyno.mul(t, t), dyno.sub(three, dyno.mul(two, t)));
        const bigTerm = dyno.mul(bump, bigAmplitudeConst);

        const scaleMul = dyno.add(one, dyno.mul(dyno.add(rippleTerm, bigTerm), this.strengthUniform));
        const newScales = dyno.mul(split.scales, scaleMul);

        return {
          gsplat: dyno.combineGsplat({ gsplat, scales: newScales }),
        };
      },
    );
  }

  /**
   * Call every frame with a 0..1 strength — 0 fully suppresses both the ripple and the big sweep
   * (during a drag, while the explode gizmo is running, mid opening-swoop), 1 is full amplitude.
   * Values in between ease everything in/out smoothly since the shader just scales both terms by
   * this directly.
   */
  setStrength(strength: number): void {
    this.strengthUniform.value = clamp(strength, 0, 1);
  }
}
