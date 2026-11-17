import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clamp, easeInOutCubic, easeOutCubic, lerp } from "../utils/math";

export interface CameraRigOptions {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  target: THREE.Vector3;
  /** Distance from target at rest (i.e. where the opening swoop settles). */
  distance: number;
  minDistance?: number;
  maxDistance?: number;
  /** OrbitControls' `autoRotateSpeed` units — 2 ≈ one revolution per 30s at full strength. */
  autoOrbitSpeed?: number;
  /** Seconds of stillness required after a user drag before auto-orbit starts easing back in. */
  autoOrbitResumeDelay?: number;
  /** Seconds spent easing auto-orbit from a standstill back up to full speed. */
  autoOrbitRampDuration?: number;
  /** Seconds the opening camera swoop takes to settle from its dramatic start into the rest pose. */
  introDuration?: number;
  /** Fires once, the instant the opening swoop settles — before auto-orbit starts ramping in. */
  onIntroComplete?: () => void;
}

interface SphericalPose {
  distance: number;
  azimuthDeg: number;
  polarDeg: number;
}

const REST_AZIMUTH_DEG = -28;
const REST_POLAR_DEG = 72;

/**
 * Thin wrapper around OrbitControls with the framing/damping defaults this scene wants, the
 * opening "swoop in" intro, an idle auto-orbit that pauses on user drag and eases back in after a
 * few seconds of stillness, and the one bit of derived state the rest of the app actually needs:
 * a unit vector from the target out to the camera, used for angle-based zone visibility.
 */
export class CameraRig {
  readonly controls: OrbitControls;
  readonly camera: THREE.PerspectiveCamera;
  private readonly target: THREE.Vector3;
  private readonly viewDir = new THREE.Vector3();

  private readonly autoOrbitSpeed: number;
  private readonly autoOrbitResumeDelay: number;
  private readonly autoOrbitRampDuration: number;
  private readonly onIntroComplete: (() => void) | undefined;

  private introActive = false;
  private introElapsed = 0;
  private readonly introDuration: number;
  private readonly introFrom: SphericalPose;
  private readonly introTo: SphericalPose;

  private autoOrbitArmed = false;
  private userInteracting = false;
  private frozen = false;
  private idleElapsed = 0;
  private rampElapsed = 0;
  private autoOrbitStrengthValue = 0;

  constructor(options: CameraRigOptions) {
    this.camera = options.camera;
    this.target = options.target.clone();

    const controls = new OrbitControls(options.camera, options.domElement);
    controls.target.copy(this.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.7;
    controls.panSpeed = 0.5;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.minDistance = options.minDistance ?? options.distance * 0.4;
    controls.maxDistance = options.maxDistance ?? options.distance * 2.5;
    controls.minPolarAngle = THREE.MathUtils.degToRad(15);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(150);
    this.controls = controls;
    this.controls.addEventListener("start", this.handleInteractionStart);
    this.controls.addEventListener("end", this.handleInteractionEnd);

    this.autoOrbitSpeed = options.autoOrbitSpeed ?? 0.6;
    this.autoOrbitResumeDelay = options.autoOrbitResumeDelay ?? 5;
    this.autoOrbitRampDuration = options.autoOrbitRampDuration ?? 1.6;
    this.introDuration = options.introDuration ?? 2.4;
    this.onIntroComplete = options.onIntroComplete;

    this.introTo = { distance: options.distance, azimuthDeg: REST_AZIMUTH_DEG, polarDeg: REST_POLAR_DEG };
    // A wide, high, off-axis start so the settle into the rest pose reads as a swoop across the
    // object rather than a straight zoom-in. Distance is capped against maxDistance so it doesn't
    // silently get clamped away by OrbitControls the moment `update()` runs.
    this.introFrom = {
      distance: Math.min(options.distance * 2.5, controls.maxDistance),
      azimuthDeg: REST_AZIMUTH_DEG - 150,
      polarDeg: 42,
    };

    // Snap straight to the dramatic starting pose so the first rendered frame is already
    // mid-swoop, not a flash of the rest pose followed by a jump backward.
    this.frame(this.introFrom.distance, this.introFrom.azimuthDeg, this.introFrom.polarDeg);
    this.controls.enabled = false;
    this.introActive = true;
  }

  /** Reposition the camera at `distance` from target, keeping current azimuth/elevation feel. */
  frame(distance: number, azimuthDeg = REST_AZIMUTH_DEG, polarDeg = REST_POLAR_DEG): void {
    const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
    const polar = THREE.MathUtils.degToRad(polarDeg);
    const offset = new THREE.Vector3().setFromSphericalCoords(distance, polar, azimuth);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
    this.controls.update();
  }

  /** Call once per frame with the delta time in seconds. Returns true if the view actually changed. */
  update(deltaTime: number): boolean {
    if (this.introActive) {
      this.introElapsed += deltaTime;
      const t = clamp(this.introElapsed / this.introDuration, 0, 1);
      const e = easeOutCubic(t);
      this.frame(
        lerp(this.introFrom.distance, this.introTo.distance, e),
        lerp(this.introFrom.azimuthDeg, this.introTo.azimuthDeg, e),
        lerp(this.introFrom.polarDeg, this.introTo.polarDeg, e),
      );
      this.viewDir.copy(this.camera.position).sub(this.target).normalize();

      if (t >= 1) {
        this.introActive = false;
        this.controls.enabled = true;
        this.startIdleMotion();
        this.onIntroComplete?.();
      }
      return true;
    }

    if (this.autoOrbitArmed && !this.userInteracting && !this.frozen) {
      if (this.idleElapsed < this.autoOrbitResumeDelay) {
        this.idleElapsed += deltaTime;
        this.controls.autoRotate = false;
        this.autoOrbitStrengthValue = 0;
      } else {
        this.rampElapsed += deltaTime;
        const strength = easeInOutCubic(this.rampElapsed / this.autoOrbitRampDuration);
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = this.autoOrbitSpeed * strength;
        this.autoOrbitStrengthValue = strength;
      }
    } else {
      this.controls.autoRotate = false;
      this.autoOrbitStrengthValue = 0;
    }

    const changed = this.controls.update(deltaTime);
    this.viewDir.copy(this.camera.position).sub(this.target).normalize();
    return changed;
  }

  /**
   * Arms the idle auto-orbit and jumps straight past the post-drag resume delay, since there's
   * been no drag yet to wait out — it should just ease straight in as the swoop settles.
   */
  private startIdleMotion(): void {
    this.autoOrbitArmed = true;
    this.idleElapsed = this.autoOrbitResumeDelay;
    this.rampElapsed = 0;
  }

  private readonly handleInteractionStart = (): void => {
    this.userInteracting = true;
    this.idleElapsed = 0;
    this.rampElapsed = 0;
    this.controls.autoRotate = false;
    this.autoOrbitStrengthValue = 0;
  };

  private readonly handleInteractionEnd = (): void => {
    this.userInteracting = false;
    this.idleElapsed = 0;
    this.rampElapsed = 0;
  };

  /** Unit vector pointing from the orbit target towards the camera, in world space. */
  getViewDirection(out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this.viewDir);
  }

  /**
   * 0..1 strength of the idle auto-orbit right now: 0 during the opening swoop, while the user
   * is dragging, and through the post-drag stillness window; eases up to 1 as it resumes.
   * Anything else that should breathe in sync with the camera's idle motion — the splat's own
   * slow self-spin, for instance — just multiplies its own speed by this.
   */
  get autoOrbitStrength(): number {
    return this.autoOrbitStrengthValue;
  }

  setEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  /** Holds auto-orbit (and everything riding `autoOrbitStrength`, e.g. mesh spin/pulse) at a
   *  standstill — used by the debug zone editor so the target doesn't drift while hand-tuning
   *  hitboxes. Dragging still works as normal while frozen. */
  setIdleFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  dispose(): void {
    this.controls.removeEventListener("start", this.handleInteractionStart);
    this.controls.removeEventListener("end", this.handleInteractionEnd);
    this.controls.dispose();
  }
}
