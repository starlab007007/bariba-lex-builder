/**
 * Griot Animation Engine v6.0
 * Simplified Ken Burns + VFX engine for image-to-animation
 * Inspired by Pika Labs and Kaiber
 */

export interface FocusPoint {
  x: number;
  y: number;
  weight: number;
}

export interface MotionPlan {
  direction: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
  intensity: number;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  focusPoints: FocusPoint[];
}

export interface EmotionSegment {
  startTime: number;
  endTime: number;
  emotion: string;
  intensity: number;
}

export interface VFXConfig {
  flareRange: [number, number];
  leakOpacity: number;
  particleCount: number;
  glowColor: string;
}

export interface AnimationStyle {
  name: 'traditional' | 'watercolor' | 'cutout' | 'fairytale';
  filter: string;
  vfxConfig: VFXConfig;
}

export const ANIMATION_STYLES: Record<string, AnimationStyle> = {
  traditional: {
    name: 'traditional',
    filter: 'sepia(0.3) contrast(1.1) saturate(1.1)',
    vfxConfig: {
      flareRange: [1, 100],
      leakOpacity: 0.3,
      particleCount: 20,
      glowColor: '#FFD700'
    }
  },
  watercolor: {
    name: 'watercolor',
    filter: 'blur(0.3px) saturate(1.3) brightness(1.05)',
    vfxConfig: {
      flareRange: [100, 200],
      leakOpacity: 0.4,
      particleCount: 15,
      glowColor: '#87CEEB'
    }
  },
  cutout: {
    name: 'cutout',
    filter: 'contrast(1.4) saturate(0.9)',
    vfxConfig: {
      flareRange: [200, 300],
      leakOpacity: 0.25,
      particleCount: 10,
      glowColor: '#8B4513'
    }
  },
  fairytale: {
    name: 'fairytale',
    filter: 'brightness(1.1) hue-rotate(10deg) saturate(1.2)',
    vfxConfig: {
      flareRange: [300, 400],
      leakOpacity: 0.5,
      particleCount: 30,
      glowColor: '#FF69B4'
    }
  }
};

export const EMOTION_VFX_MAP: Record<string, { flareIntensity: number; glowColor: string; pulseSpeed: number }> = {
  joy: { flareIntensity: 0.8, glowColor: '#FFD700', pulseSpeed: 1.5 },
  sadness: { flareIntensity: 0.3, glowColor: '#4169E1', pulseSpeed: 0.5 },
  wonder: { flareIntensity: 0.9, glowColor: '#9370DB', pulseSpeed: 1.0 },
  fear: { flareIntensity: 0.5, glowColor: '#2F4F4F', pulseSpeed: 2.0 },
  anger: { flareIntensity: 0.7, glowColor: '#DC143C', pulseSpeed: 2.5 },
  peace: { flareIntensity: 0.4, glowColor: '#98FB98', pulseSpeed: 0.3 },
  excitement: { flareIntensity: 1.0, glowColor: '#FF4500', pulseSpeed: 2.0 }
};

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  angle: number;
}

export class GriotAnimationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private particles: Particle[] = [];
  private flareImages: Map<number, HTMLImageElement> = new Map();
  private animationId: number | null = null;
  private startTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  /**
   * Preload lens flare assets for a style
   */
  async preloadFlares(style: AnimationStyle): Promise<void> {
    const [start, end] = style.vfxConfig.flareRange;
    const flaresToLoad = Math.min(10, end - start + 1);
    
    const promises: Promise<void>[] = [];
    for (let i = 0; i < flaresToLoad; i++) {
      const index = start + Math.floor((end - start) * (i / flaresToLoad));
      promises.push(this.loadFlare(index));
    }
    
    await Promise.allSettled(promises);
    console.log(`[GriotEngine] Loaded ${this.flareImages.size} flares for ${style.name}`);
  }

  private async loadFlare(index: number): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.flareImages.set(index, img);
        resolve();
      };
      img.onerror = () => resolve(); // Silently fail
      img.src = `/assets/envato/lens-flare/flare-${index.toString().padStart(3, '0')}.png`;
    });
  }

  /**
   * Initialize particles for the scene
   */
  initParticles(count: number, glowColor: string): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 3,
        speed: 0.2 + Math.random() * 0.5,
        opacity: 0.3 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Interpolate between focus points based on progress
   */
  private interpolateFocusPoint(focusPoints: FocusPoint[], progress: number): { x: number; y: number } {
    if (focusPoints.length === 0) return { x: 0.5, y: 0.5 };
    if (focusPoints.length === 1) return { x: focusPoints[0].x, y: focusPoints[0].y };

    // Weight-based interpolation with progress
    const index = Math.min(
      Math.floor(progress * (focusPoints.length - 1)),
      focusPoints.length - 2
    );
    const localProgress = (progress * (focusPoints.length - 1)) - index;
    
    const p1 = focusPoints[index];
    const p2 = focusPoints[index + 1];
    
    return {
      x: p1.x + (p2.x - p1.x) * localProgress,
      y: p1.y + (p2.y - p1.y) * localProgress
    };
  }

  /**
   * Draw the animated image with Ken Burns effect
   */
  drawAnimatedImage(
    image: HTMLImageElement,
    time: number,
    duration: number,
    motionPlan: MotionPlan
  ): void {
    const progress = Math.min(time / duration, 1);
    
    // Calculate focus point
    const focus = this.interpolateFocusPoint(motionPlan.focusPoints, progress);
    
    // Ken Burns parameters
    const zoomIntensity = motionPlan.intensity;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    switch (motionPlan.direction) {
      case 'zoom-in':
        scale = 1 + (progress * zoomIntensity * 0.3);
        offsetX = (focus.x - 0.5) * this.width * progress * zoomIntensity;
        offsetY = (focus.y - 0.5) * this.height * progress * zoomIntensity;
        break;
      case 'zoom-out':
        scale = 1 + ((1 - progress) * zoomIntensity * 0.3);
        offsetX = (focus.x - 0.5) * this.width * (1 - progress) * zoomIntensity;
        offsetY = (focus.y - 0.5) * this.height * (1 - progress) * zoomIntensity;
        break;
      case 'pan-left':
        offsetX = -progress * this.width * zoomIntensity * 0.2;
        scale = 1.1;
        break;
      case 'pan-right':
        offsetX = progress * this.width * zoomIntensity * 0.2;
        scale = 1.1;
        break;
      case 'pan-up':
        offsetY = -progress * this.height * zoomIntensity * 0.2;
        scale = 1.1;
        break;
      case 'pan-down':
        offsetY = progress * this.height * zoomIntensity * 0.2;
        scale = 1.1;
        break;
    }

    // Draw with transformation
    this.ctx.save();
    this.ctx.translate(this.width / 2 + offsetX, this.height / 2 + offsetY);
    this.ctx.scale(scale, scale);
    
    // Calculate image dimensions to cover canvas
    const imgAspect = image.width / image.height;
    const canvasAspect = this.width / this.height;
    let drawWidth, drawHeight;
    
    if (imgAspect > canvasAspect) {
      drawHeight = this.height;
      drawWidth = this.height * imgAspect;
    } else {
      drawWidth = this.width;
      drawHeight = this.width / imgAspect;
    }
    
    this.ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    this.ctx.restore();
  }

  /**
   * Apply style filter to the canvas
   */
  applyStyleFilter(style: AnimationStyle): void {
    this.ctx.filter = style.filter;
  }

  /**
   * Draw particles
   */
  drawParticles(time: number, glowColor: string): void {
    this.particles.forEach((p, i) => {
      // Update position
      p.y -= p.speed;
      p.x += Math.sin(p.angle + time * 0.5) * 0.3;
      
      // Wrap around
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
      
      // Pulsing opacity
      const pulse = Math.sin(time * 2 + i) * 0.2 + 0.8;
      
      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = glowColor;
      this.ctx.globalAlpha = p.opacity * pulse;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  }

  /**
   * Draw lens flare effect
   */
  drawLensFlare(time: number, emotion: string, intensity: number): void {
    const emotionVFX = EMOTION_VFX_MAP[emotion] || EMOTION_VFX_MAP.wonder;
    const flareKeys = Array.from(this.flareImages.keys());
    
    if (flareKeys.length === 0) return;
    
    // Select flare based on time
    const flareIndex = flareKeys[Math.floor(time) % flareKeys.length];
    const flare = this.flareImages.get(flareIndex);
    
    if (!flare) return;
    
    // Calculate position with subtle movement
    const x = this.width * (0.6 + Math.sin(time * 0.3) * 0.2);
    const y = this.height * (0.2 + Math.cos(time * 0.2) * 0.1);
    const size = this.width * (0.3 + Math.sin(time * emotionVFX.pulseSpeed) * 0.1);
    
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = intensity * emotionVFX.flareIntensity * 0.6;
    this.ctx.drawImage(flare, x - size / 2, y - size / 2, size, size);
    this.ctx.restore();
  }

  /**
   * Draw vignette effect
   */
  drawVignette(intensity: number = 0.4): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.3,
      this.width / 2, this.height / 2, this.width * 0.8
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Get current emotion based on time and segments
   */
  getCurrentEmotion(time: number, segments: EmotionSegment[]): { emotion: string; intensity: number } {
    for (const segment of segments) {
      if (time >= segment.startTime && time < segment.endTime) {
        return { emotion: segment.emotion, intensity: segment.intensity };
      }
    }
    return { emotion: 'wonder', intensity: 0.7 };
  }

  /**
   * Start real-time animation preview
   */
  startPreview(
    image: HTMLImageElement,
    duration: number,
    motionPlan: MotionPlan,
    style: AnimationStyle,
    emotionSegments: EmotionSegment[],
    onProgress?: (progress: number) => void
  ): void {
    this.stopPreview();
    this.startTime = performance.now();
    
    this.initParticles(style.vfxConfig.particleCount, style.vfxConfig.glowColor);

    const animate = () => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      const time = elapsed % duration; // Loop
      const progress = time / duration;
      
      // Clear canvas
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.filter = 'none';
      
      // Get current emotion
      const { emotion, intensity } = this.getCurrentEmotion(time, emotionSegments);
      
      // Draw layers
      this.drawAnimatedImage(image, time, duration, motionPlan);
      
      // Apply style filter overlay
      this.ctx.save();
      this.ctx.filter = style.filter;
      this.ctx.globalCompositeOperation = 'source-atop';
      this.ctx.fillStyle = 'transparent';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
      
      // Draw VFX
      this.drawParticles(time, EMOTION_VFX_MAP[emotion]?.glowColor || style.vfxConfig.glowColor);
      this.drawLensFlare(time, emotion, intensity);
      this.drawVignette(0.3);
      
      onProgress?.(progress);
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Stop preview animation
   */
  stopPreview(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Render video frames for export
   */
  async renderFrames(
    image: HTMLImageElement,
    duration: number,
    motionPlan: MotionPlan,
    style: AnimationStyle,
    emotionSegments: EmotionSegment[],
    fps: number = 24,
    onProgress?: (progress: number, message: string) => void
  ): Promise<Blob[]> {
    const frames: Blob[] = [];
    const totalFrames = Math.floor(duration * fps);
    
    this.initParticles(style.vfxConfig.particleCount, style.vfxConfig.glowColor);

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / fps;
      const progress = frame / totalFrames;
      
      // Clear
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.filter = 'none';
      
      // Get emotion
      const { emotion, intensity } = this.getCurrentEmotion(time, emotionSegments);
      
      // Render frame
      this.drawAnimatedImage(image, time, duration, motionPlan);
      this.drawParticles(time, EMOTION_VFX_MAP[emotion]?.glowColor || style.vfxConfig.glowColor);
      this.drawLensFlare(time, emotion, intensity);
      this.drawVignette(0.3);
      
      // Capture frame
      const blob = await new Promise<Blob>((resolve) => {
        this.canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      frames.push(blob);
      
      onProgress?.(progress, `Rendu frame ${frame + 1}/${totalFrames}`);
    }
    
    return frames;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopPreview();
    this.flareImages.clear();
    this.particles = [];
  }
}

/**
 * Create default motion plan from analysis
 */
export function createDefaultMotionPlan(): MotionPlan {
  return {
    direction: 'zoom-in',
    intensity: 0.5,
    startPoint: { x: 0.5, y: 0.5 },
    endPoint: { x: 0.5, y: 0.4 },
    focusPoints: [
      { x: 0.5, y: 0.5, weight: 1 },
      { x: 0.5, y: 0.4, weight: 1 }
    ]
  };
}

/**
 * Create default emotion segments
 */
export function createDefaultEmotionSegments(duration: number): EmotionSegment[] {
  const third = duration / 3;
  return [
    { startTime: 0, endTime: third, emotion: 'wonder', intensity: 0.7 },
    { startTime: third, endTime: third * 2, emotion: 'excitement', intensity: 0.85 },
    { startTime: third * 2, endTime: duration, emotion: 'peace', intensity: 0.6 }
  ];
}
