/**
 * SoftwareStabilizer.ts
 * Lightweight software-based video stabilization (Beta).
 *
 * HOW IT WORKS:
 * 1. Tracks face center position across frames using face detection data
 * 2. Applies exponential moving average (EMA) smoothing to the position
 * 3. Computes a translation offset to compensate for jitter
 * 4. Applies a 5% crop to allow room for the stabilization translation
 * 
 * LIMITATIONS:
 * - This is NOT true EIS (electronic image stabilization)
 * - Works best for small jitter compensation (handheld shake)
 * - Introduces a slight crop (5% per side)
 * - Requires face detection data for tracking
 * - Falls back to center-of-frame if no face is detected
 *
 * TUNING:
 * - smoothingAlpha: 0.0 = no smoothing, 1.0 = maximum smoothing (default 0.85)
 * - cropFactor: how much to crop for stabilization room (default 0.05 = 5%)
 */

export interface StabilizationTransform {
  /** Translation X in pixels */
  translateX: number;
  /** Translation Y in pixels */
  translateY: number;
  /** Scale factor (> 1.0 to compensate for crop) */
  scale: number;
  /** Whether stabilization is actively compensating */
  active: boolean;
}

export class SoftwareStabilizer {
  private smoothingAlpha: number;
  private cropFactor: number;
  private smoothedX = 0.5;
  private smoothedY = 0.5;
  private initialized = false;
  private enabled = true;

  constructor(smoothingAlpha = 0.85, cropFactor = 0.05) {
    this.smoothingAlpha = smoothingAlpha;
    this.cropFactor = cropFactor;
  }

  /**
   * Update with new face center position and get stabilization transform.
   * @param faceCenter - Normalized face center {x: 0-1, y: 0-1}, or null if no face
   * @param frameWidth - Frame width in pixels
   * @param frameHeight - Frame height in pixels
   */
  update(
    faceCenter: { x: number; y: number } | null,
    frameWidth: number,
    frameHeight: number
  ): StabilizationTransform {
    if (!this.enabled) {
      return { translateX: 0, translateY: 0, scale: 1, active: false };
    }

    // Use face center or default to frame center
    const targetX = faceCenter?.x ?? 0.5;
    const targetY = faceCenter?.y ?? 0.5;

    // Initialize on first frame
    if (!this.initialized) {
      this.smoothedX = targetX;
      this.smoothedY = targetY;
      this.initialized = true;
    }

    // Apply EMA smoothing
    this.smoothedX = this.smoothingAlpha * this.smoothedX + (1 - this.smoothingAlpha) * targetX;
    this.smoothedY = this.smoothingAlpha * this.smoothedY + (1 - this.smoothingAlpha) * targetY;

    // Compute offset (difference between smoothed and actual position)
    const offsetX = (this.smoothedX - targetX) * frameWidth;
    const offsetY = (this.smoothedY - targetY) * frameHeight;

    // Clamp offset to crop boundary
    const maxOffsetX = frameWidth * this.cropFactor;
    const maxOffsetY = frameHeight * this.cropFactor;

    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));

    // Scale to compensate for crop
    const scale = 1.0 / (1.0 - this.cropFactor * 2);

    return {
      translateX: clampedX,
      translateY: clampedY,
      scale,
      active: true,
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.initialized = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(): void {
    this.initialized = false;
    this.smoothedX = 0.5;
    this.smoothedY = 0.5;
  }

  destroy(): void {
    this.reset();
  }
}

export default SoftwareStabilizer;
