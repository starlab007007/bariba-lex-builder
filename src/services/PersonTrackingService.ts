// ============================================================
// PERSON TRACKING SERVICE - Real-time face detection & crop stabilization
// For cutout templates (Grass, Neon, etc.)
// ============================================================

export interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  landmarks?: {
    leftEye?: { x: number; y: number };
    rightEye?: { x: number; y: number };
    nose?: { x: number; y: number };
    mouth?: { x: number; y: number };
  };
}

export interface TrackingState {
  isTracking: boolean;
  currentFace: FaceDetection | null;
  smoothedCrop: CropRect;
  frameCount: number;
  fps: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

interface TrackingConfig {
  smoothingFactor: number; // 0-1, higher = smoother but slower response
  minConfidence: number;
  targetAspectRatio: number; // 9:16 = 0.5625
  headroomRatio: number; // Space above head
  stabilizationStrength: number;
}

const DEFAULT_CONFIG: TrackingConfig = {
  smoothingFactor: 0.85,
  minConfidence: 0.6,
  targetAspectRatio: 9 / 16,
  headroomRatio: 0.15,
  stabilizationStrength: 0.7,
};

class PersonTrackingService {
  private config: TrackingConfig = DEFAULT_CONFIG;
  private state: TrackingState = {
    isTracking: false,
    currentFace: null,
    smoothedCrop: { x: 0, y: 0, width: 0, height: 0, scale: 1 },
    frameCount: 0,
    fps: 0,
  };

  private lastFrameTime = 0;
  private fpsHistory: number[] = [];
  private previousCrops: CropRect[] = [];
  private animationFrameId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private onUpdate: ((state: TrackingState) => void) | null = null;

  // Kalman filter state for smooth tracking
  private kalmanState = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 0,
    height: 0,
  };

  /**
   * Initialize tracking with video element
   */
  async initialize(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    config?: Partial<TrackingConfig>
  ): Promise<void> {
    this.videoElement = video;
    this.canvasElement = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // Set canvas size to match video
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
  }

  /**
   * Start real-time tracking
   */
  startTracking(onUpdate?: (state: TrackingState) => void): void {
    if (this.state.isTracking) return;
    
    this.onUpdate = onUpdate || null;
    this.state.isTracking = true;
    this.lastFrameTime = performance.now();
    this.trackFrame();
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    this.state.isTracking = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main tracking loop
   */
  private trackFrame = (): void => {
    if (!this.state.isTracking || !this.videoElement || !this.ctx) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Calculate FPS
    this.fpsHistory.push(1000 / deltaTime);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    this.state.fps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // Detect face in current frame
    const face = this.detectFace();
    this.state.currentFace = face;

    // Update smoothed crop
    if (face && face.confidence >= this.config.minConfidence) {
      this.updateCrop(face);
    }

    this.state.frameCount++;
    this.onUpdate?.(this.state);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.trackFrame);
  };

  /**
   * Simplified face detection using skin tone and shape heuristics
   * In production, use MediaPipe Face Detection or similar
   */
  private detectFace(): FaceDetection | null {
    if (!this.ctx || !this.videoElement || !this.canvasElement) return null;

    const video = this.videoElement;
    const canvas = this.canvasElement;
    
    // Draw current frame
    this.ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Sample regions to find skin tones
    const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    const skinMask = this.detectSkinRegions(imageData);
    
    // Find largest connected skin region (simplified face detection)
    const faceRegion = this.findLargestSkinRegion(skinMask, canvas.width, canvas.height);
    
    if (!faceRegion) return null;

    return {
      x: faceRegion.x,
      y: faceRegion.y,
      width: faceRegion.width,
      height: faceRegion.height,
      confidence: faceRegion.confidence,
    };
  }

  /**
   * Detect skin-colored pixels
   */
  private detectSkinRegions(imageData: ImageData): Uint8Array {
    const mask = new Uint8Array(imageData.width * imageData.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Simple skin tone detection (YCbCr approach)
      if (this.isSkinTone(r, g, b)) {
        mask[i / 4] = 1;
      }
    }

    return mask;
  }

  /**
   * Check if RGB values represent skin tone
   */
  private isSkinTone(r: number, g: number, b: number): boolean {
    // Convert to YCbCr
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    // Skin tone ranges in YCbCr
    return (
      y > 80 &&
      cb > 77 && cb < 127 &&
      cr > 133 && cr < 173 &&
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15
    );
  }

  /**
   * Find largest connected skin region
   */
  private findLargestSkinRegion(
    mask: Uint8Array,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number; confidence: number } | null {
    // Simplified: scan for bounding box of skin pixels
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let skinPixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 1) {
          skinPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (skinPixels < 1000) return null; // Not enough skin pixels

    const w = maxX - minX;
    const h = maxY - minY;
    
    // Validate face-like proportions
    const aspectRatio = w / h;
    if (aspectRatio < 0.5 || aspectRatio > 1.5) return null;

    // Calculate confidence based on density
    const density = skinPixels / (w * h);
    const confidence = Math.min(1, density * 2);

    return {
      x: minX,
      y: minY,
      width: w,
      height: h,
      confidence,
    };
  }

  /**
   * Update smoothed crop with Kalman-like filtering
   */
  private updateCrop(face: FaceDetection): void {
    const canvas = this.canvasElement;
    if (!canvas) return;

    const { smoothingFactor, targetAspectRatio, headroomRatio, stabilizationStrength } = this.config;

    // Calculate target crop centered on face with headroom
    const faceCenterX = face.x + face.width / 2;
    const faceCenterY = face.y + face.height / 2;

    // Target crop height (face + body estimate)
    const targetHeight = face.height * 4; // Approximate full body
    const targetWidth = targetHeight * targetAspectRatio;

    // Center crop on face with headroom
    const targetX = faceCenterX - targetWidth / 2;
    const targetY = face.y - face.height * headroomRatio;

    // Apply Kalman-like smoothing
    const k = this.kalmanState;
    const s = smoothingFactor * stabilizationStrength;

    k.x = k.x * s + targetX * (1 - s);
    k.y = k.y * s + targetY * (1 - s);
    k.width = k.width * s + targetWidth * (1 - s);
    k.height = k.height * s + targetHeight * (1 - s);

    // Clamp to canvas bounds
    const cropX = Math.max(0, Math.min(canvas.width - k.width, k.x));
    const cropY = Math.max(0, Math.min(canvas.height - k.height, k.y));

    this.state.smoothedCrop = {
      x: cropX,
      y: cropY,
      width: Math.min(k.width, canvas.width),
      height: Math.min(k.height, canvas.height),
      scale: canvas.height / k.height,
    };

    // Store for stabilization
    this.previousCrops.push({ ...this.state.smoothedCrop });
    if (this.previousCrops.length > 10) this.previousCrops.shift();
  }

  /**
   * Get current tracking state
   */
  getState(): TrackingState {
    return { ...this.state };
  }

  /**
   * Get stabilized crop rect
   */
  getStabilizedCrop(): CropRect {
    if (this.previousCrops.length < 3) {
      return this.state.smoothedCrop;
    }

    // Average last few crops for extra stability
    const recent = this.previousCrops.slice(-5);
    const avg: CropRect = {
      x: recent.reduce((a, c) => a + c.x, 0) / recent.length,
      y: recent.reduce((a, c) => a + c.y, 0) / recent.length,
      width: recent.reduce((a, c) => a + c.width, 0) / recent.length,
      height: recent.reduce((a, c) => a + c.height, 0) / recent.length,
      scale: recent.reduce((a, c) => a + c.scale, 0) / recent.length,
    };

    return avg;
  }

  /**
   * Apply crop to output canvas
   */
  applyCropToCanvas(outputCanvas: HTMLCanvasElement): void {
    if (!this.videoElement || !this.ctx) return;

    const crop = this.getStabilizedCrop();
    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) return;

    // Draw cropped region to output
    outCtx.drawImage(
      this.videoElement,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, outputCanvas.width, outputCanvas.height
    );
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopTracking();
    this.videoElement = null;
    this.canvasElement = null;
    this.ctx = null;
    this.onUpdate = null;
    this.previousCrops = [];
    this.fpsHistory = [];
  }
}

// Singleton instance
export const personTracker = new PersonTrackingService();

export default PersonTrackingService;
