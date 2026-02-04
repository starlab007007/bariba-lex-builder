/**
 * Griot Animation Engine v6.1
 * Enhanced for anime slideshow with narrator avatar overlay
 * Supports multiple scene images with Ken Burns + transitions
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
  name: 'traditional' | 'watercolor' | 'cutout' | 'fairytale' | 'manga' | 'chibi' | 'fantasy' | 'african';
  filter: string;
  vfxConfig: VFXConfig;
}

// Extended styles for anime
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
  },
  // Anime styles
  manga: {
    name: 'manga',
    filter: 'contrast(1.3) grayscale(0.1)',
    vfxConfig: {
      flareRange: [1, 50],
      leakOpacity: 0.2,
      particleCount: 10,
      glowColor: '#FFFFFF'
    }
  },
  chibi: {
    name: 'chibi',
    filter: 'brightness(1.1) saturate(1.3)',
    vfxConfig: {
      flareRange: [300, 400],
      leakOpacity: 0.4,
      particleCount: 25,
      glowColor: '#FFB6C1'
    }
  },
  fantasy: {
    name: 'fantasy',
    filter: 'brightness(1.05) saturate(1.2) hue-rotate(5deg)',
    vfxConfig: {
      flareRange: [200, 350],
      leakOpacity: 0.45,
      particleCount: 35,
      glowColor: '#9370DB'
    }
  },
  african: {
    name: 'african',
    filter: 'sepia(0.2) saturate(1.3) contrast(1.1)',
    vfxConfig: {
      flareRange: [1, 100],
      leakOpacity: 0.35,
      particleCount: 20,
      glowColor: '#FF8C00'
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
  excitement: { flareIntensity: 1.0, glowColor: '#FF4500', pulseSpeed: 2.0 },
  tension: { flareIntensity: 0.6, glowColor: '#8B0000', pulseSpeed: 1.8 }
};

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  angle: number;
}

// Scene for slideshow mode
export interface AnimatedScene {
  image: HTMLImageElement;
  startTime: number;
  endTime: number;
  emotion: string;
  motionPlan: MotionPlan;
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

  // Slideshow mode
  private scenes: AnimatedScene[] = [];
  private narratorAvatar: HTMLImageElement | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  /**
   * Set narrator avatar image
   */
  setNarratorAvatar(image: HTMLImageElement | null): void {
    this.narratorAvatar = image;
  }

  /**
   * Load narrator avatar from URL
   */
  async loadNarratorAvatar(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.narratorAvatar = img;
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Set audio for playback sync
   */
  setAudio(audioUrl: string): void {
    this.audioElement = new Audio(audioUrl);
    this.audioElement.preload = 'auto';
  }

  /**
   * Load scenes for slideshow mode
   */
  async loadScenes(sceneData: Array<{
    imageUrl: string;
    startTime: number;
    endTime: number;
    emotion: string;
  }>): Promise<void> {
    this.scenes = [];
    
    for (const scene of sceneData) {
      const image = await this.loadImage(scene.imageUrl);
      const motionPlan = this.generateMotionPlan(scene.emotion);
      
      this.scenes.push({
        image,
        startTime: scene.startTime,
        endTime: scene.endTime,
        emotion: scene.emotion,
        motionPlan
      });
    }
    
    console.log(`[GriotEngine] Loaded ${this.scenes.length} scenes for slideshow`);
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  /**
   * Generate motion plan based on emotion
   */
  private generateMotionPlan(emotion: string): MotionPlan {
    const directions: MotionPlan['direction'][] = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];
    
    // Emotion-based motion selection
    let direction: MotionPlan['direction'];
    let intensity: number;
    
    switch (emotion) {
      case 'joy':
      case 'excitement':
        direction = 'zoom-in';
        intensity = 0.6;
        break;
      case 'sadness':
        direction = 'zoom-out';
        intensity = 0.3;
        break;
      case 'wonder':
        direction = 'pan-up';
        intensity = 0.4;
        break;
      case 'fear':
      case 'tension':
        direction = directions[Math.floor(Math.random() * 2) + 2]; // pan-left or pan-right
        intensity = 0.7;
        break;
      case 'peace':
        direction = 'pan-down';
        intensity = 0.2;
        break;
      default:
        direction = directions[Math.floor(Math.random() * directions.length)];
        intensity = 0.4;
    }
    
    return {
      direction,
      intensity,
      startPoint: { x: 0.5, y: 0.5 },
      endPoint: { x: 0.5, y: 0.4 },
      focusPoints: [
        { x: 0.5, y: 0.5, weight: 1 },
        { x: 0.5, y: 0.4, weight: 1 }
      ]
    };
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
      img.onerror = () => resolve();
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
    const focus = this.interpolateFocusPoint(motionPlan.focusPoints, progress);
    
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

    this.ctx.save();
    this.ctx.translate(this.width / 2 + offsetX, this.height / 2 + offsetY);
    this.ctx.scale(scale, scale);
    
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
   * Draw narrator avatar in top right corner
   */
  drawNarratorAvatar(time: number): void {
    if (!this.narratorAvatar) return;
    
    const size = Math.min(80, this.width * 0.15);
    const margin = 16;
    const x = this.width - size - margin;
    const y = margin;
    
    this.ctx.save();
    
    // Animated golden border
    this.ctx.beginPath();
    this.ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
    
    // Rotating gradient
    const gradient = this.ctx.createConicGradient(time * 0.5, x + size / 2, y + size / 2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.25, '#FFA500');
    gradient.addColorStop(0.5, '#FFD700');
    gradient.addColorStop(0.75, '#FFCC00');
    gradient.addColorStop(1, '#FFD700');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // Inner shadow
    this.ctx.beginPath();
    this.ctx.arc(x + size / 2, y + size / 2, size / 2 + 1, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.fill();
    
    // Clip to circle and draw avatar
    this.ctx.beginPath();
    this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    this.ctx.clip();
    
    // Draw avatar image (center crop)
    const imgSize = Math.min(this.narratorAvatar.width, this.narratorAvatar.height);
    const imgOffsetX = (this.narratorAvatar.width - imgSize) / 2;
    const imgOffsetY = (this.narratorAvatar.height - imgSize) / 2;
    
    this.ctx.drawImage(
      this.narratorAvatar,
      imgOffsetX, imgOffsetY, imgSize, imgSize,
      x, y, size, size
    );
    
    this.ctx.restore();
    
    // Label
    this.ctx.save();
    this.ctx.font = `${Math.max(10, size * 0.12)}px system-ui, sans-serif`;
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Griot', x + size / 2, y + size + 14);
    this.ctx.restore();
  }

  /**
   * Get current scene index based on time
   */
  private getCurrentSceneIndex(time: number): number {
    for (let i = 0; i < this.scenes.length; i++) {
      if (time >= this.scenes[i].startTime && time < this.scenes[i].endTime) {
        return i;
      }
    }
    return this.scenes.length - 1;
  }

  /**
   * Get transition progress between scenes
   */
  private getTransitionProgress(time: number, transitionDuration: number = 0.5): { from: number; to: number; progress: number } {
    const currentIndex = this.getCurrentSceneIndex(time);
    
    if (currentIndex >= this.scenes.length - 1) {
      return { from: currentIndex, to: currentIndex, progress: 0 };
    }
    
    const currentScene = this.scenes[currentIndex];
    const timeInScene = time - currentScene.startTime;
    const sceneDuration = currentScene.endTime - currentScene.startTime;
    const transitionStart = sceneDuration - transitionDuration;
    
    if (timeInScene >= transitionStart) {
      const progress = (timeInScene - transitionStart) / transitionDuration;
      return { from: currentIndex, to: currentIndex + 1, progress: Math.min(1, progress) };
    }
    
    return { from: currentIndex, to: currentIndex, progress: 0 };
  }

  /**
   * Draw current scene with transition
   */
  private drawCurrentScene(time: number, duration: number): void {
    if (this.scenes.length === 0) return;
    
    const { from, to, progress } = this.getTransitionProgress(time);
    const scene = this.scenes[from];
    
    if (!scene) return;
    
    const sceneLocalTime = time - scene.startTime;
    const sceneDuration = scene.endTime - scene.startTime;
    
    // Draw current scene
    this.drawAnimatedImage(scene.image, sceneLocalTime, sceneDuration, scene.motionPlan);
    
    // Draw transition to next scene
    if (progress > 0 && this.scenes[to]) {
      const nextScene = this.scenes[to];
      this.ctx.save();
      this.ctx.globalAlpha = progress;
      this.drawAnimatedImage(nextScene.image, 0, nextScene.endTime - nextScene.startTime, nextScene.motionPlan);
      this.ctx.restore();
    }
  }

  /**
   * Draw particles
   */
  drawParticles(time: number, glowColor: string): void {
    this.particles.forEach((p, i) => {
      p.y -= p.speed;
      p.x += Math.sin(p.angle + time * 0.5) * 0.3;
      
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
      
      const pulse = Math.sin(time * 2 + i) * 0.2 + 0.8;
      
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
    
    const flareIndex = flareKeys[Math.floor(time) % flareKeys.length];
    const flare = this.flareImages.get(flareIndex);
    
    if (!flare) return;
    
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
   * Start slideshow preview with multiple scenes
   */
  startSlideshowPreview(
    duration: number,
    style: AnimationStyle,
    onProgress?: (progress: number) => void
  ): void {
    this.stopPreview();
    this.startTime = performance.now();
    
    if (this.scenes.length === 0) {
      console.warn('[GriotEngine] No scenes loaded for slideshow');
      return;
    }

    // Build emotion segments from scenes
    const emotionSegments: EmotionSegment[] = this.scenes.map(scene => ({
      startTime: scene.startTime,
      endTime: scene.endTime,
      emotion: scene.emotion,
      intensity: 0.7
    }));

    this.initParticles(style.vfxConfig.particleCount, style.vfxConfig.glowColor);

    // Start audio if available
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch(e => console.warn('Audio playback failed:', e));
    }

    const animate = () => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      const time = elapsed % duration;
      const progress = time / duration;
      
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.filter = 'none';
      
      const { emotion, intensity } = this.getCurrentEmotion(time, emotionSegments);
      
      // Draw current scene with transitions
      this.drawCurrentScene(time, duration);
      
      // Draw VFX
      this.drawParticles(time, EMOTION_VFX_MAP[emotion]?.glowColor || style.vfxConfig.glowColor);
      this.drawLensFlare(time, emotion, intensity);
      this.drawVignette(0.3);
      
      // Draw narrator avatar overlay
      this.drawNarratorAvatar(time);
      
      onProgress?.(progress);
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Start real-time animation preview (single image mode)
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
      const time = elapsed % duration;
      const progress = time / duration;
      
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.filter = 'none';
      
      const { emotion, intensity } = this.getCurrentEmotion(time, emotionSegments);
      
      this.drawAnimatedImage(image, time, duration, motionPlan);
      this.drawParticles(time, EMOTION_VFX_MAP[emotion]?.glowColor || style.vfxConfig.glowColor);
      this.drawLensFlare(time, emotion, intensity);
      this.drawVignette(0.3);
      this.drawNarratorAvatar(time);
      
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
    if (this.audioElement) {
      this.audioElement.pause();
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
      
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.filter = 'none';
      
      const { emotion, intensity } = this.getCurrentEmotion(time, emotionSegments);
      
      this.drawAnimatedImage(image, time, duration, motionPlan);
      this.drawParticles(time, EMOTION_VFX_MAP[emotion]?.glowColor || style.vfxConfig.glowColor);
      this.drawLensFlare(time, emotion, intensity);
      this.drawVignette(0.3);
      this.drawNarratorAvatar(time);
      
      const blob = await new Promise<Blob>((resolve) => {
        this.canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      frames.push(blob);
      
      onProgress?.(progress, `Rendu frame ${frame + 1}/${totalFrames}`);
    }
    
    return frames;
  }

  /**
   * Render slideshow frames for export
   */
  async renderSlideshowFrames(
    duration: number,
    style: AnimationStyle,
    fps: number = 24,
    onProgress?: (progress: number, message: string) => void
  ): Promise<Blob[]> {
    const frames: Blob[] = [];
    const totalFrames = Math.floor(duration * fps);
    
    const emotionSegments: EmotionSegment[] = this.scenes.map(scene => ({
      startTime: scene.startTime,
      endTime: scene.endTime,
      emotion: scene.emotion,
      intensity: 0.7
    }));
    
    this.initParticles(style.vfxConfig.particleCount, style.vfxConfig.glowColor);

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / fps;
      const progress = frame / totalFrames;
      
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.filter = 'none';
      
      const { emotion, intensity } = this.getCurrentEmotion(time, emotionSegments);
      
      this.drawCurrentScene(time, duration);
      this.drawParticles(time, EMOTION_VFX_MAP[emotion]?.glowColor || style.vfxConfig.glowColor);
      this.drawLensFlare(time, emotion, intensity);
      this.drawVignette(0.3);
      this.drawNarratorAvatar(time);
      
      const blob = await new Promise<Blob>((resolve) => {
        this.canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      frames.push(blob);
      
      onProgress?.(progress, `Rendu frame ${frame + 1}/${totalFrames}`);
    }
    
    return frames;
  }

  /**
   * Export video blob using MediaRecorder
   * Captures canvas stream and mixes with audio
   */
  async exportVideoBlob(
    duration: number,
    style: AnimationStyle,
    fps: number = 24,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        // Stop any current preview
        this.stopPreview();
        
        // Get canvas stream
        const stream = this.canvas.captureStream(fps);
        
        // Try to add audio track
        if (this.audioElement) {
          try {
            const audioContext = new AudioContext();
            // Clone audio element for capture
            const audioClone = this.audioElement.cloneNode() as HTMLAudioElement;
            audioClone.currentTime = 0;
            
            const source = audioContext.createMediaElementSource(audioClone);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            
            const audioTrack = destination.stream.getAudioTracks()[0];
            if (audioTrack) {
              stream.addTrack(audioTrack);
            }
            
            // Start audio playback
            await audioClone.play().catch(() => {});
          } catch (audioError) {
            console.warn('[GriotEngine] Could not add audio to export:', audioError);
          }
        }
        
        // Determine best supported format
        const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')
          ? 'video/mp4;codecs=avc1,mp4a.40.2'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm';
        
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(stream, { 
          mimeType,
          videoBitsPerSecond: 5000000 // 5 Mbps
        });
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
          resolve(blob);
        };
        
        recorder.onerror = (e) => {
          reject(new Error('MediaRecorder error'));
        };
        
        // Start recording
        recorder.start(100);
        
        // Build emotion segments
        const emotionSegments: EmotionSegment[] = this.scenes.map(scene => ({
          startTime: scene.startTime,
          endTime: scene.endTime,
          emotion: scene.emotion,
          intensity: 0.7
        }));
        
        this.initParticles(style.vfxConfig.particleCount, style.vfxConfig.glowColor);
        
        // Animate for duration
        const startTime = performance.now();
        const durationMs = duration * 1000;
        
        const animate = () => {
          const elapsed = performance.now() - startTime;
          const time = (elapsed / 1000) % duration;
          const progress = Math.min(elapsed / durationMs, 1);
          
          this.ctx.clearRect(0, 0, this.width, this.height);
          this.ctx.filter = 'none';
          
          const { emotion, intensity } = this.getCurrentEmotion(time, emotionSegments);
          
          this.drawCurrentScene(time, duration);
          this.drawParticles(time, EMOTION_VFX_MAP[emotion]?.glowColor || style.vfxConfig.glowColor);
          this.drawLensFlare(time, emotion, intensity);
          this.drawVignette(0.3);
          this.drawNarratorAvatar(time);
          
          onProgress?.(progress);
          
          if (elapsed < durationMs) {
            requestAnimationFrame(animate);
          } else {
            // Stop recording after a small delay to ensure final frame is captured
            setTimeout(() => {
              recorder.stop();
            }, 200);
          }
        };
        
        animate();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate thumbnail at specific time
   */
  async generateThumbnail(atTime: number = 1): Promise<Blob | null> {
    if (this.scenes.length === 0) return null;
    
    // Draw frame at specified time
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    const emotionSegments: EmotionSegment[] = this.scenes.map(scene => ({
      startTime: scene.startTime,
      endTime: scene.endTime,
      emotion: scene.emotion,
      intensity: 0.7
    }));
    
    const { emotion, intensity } = this.getCurrentEmotion(atTime, emotionSegments);
    
    this.drawCurrentScene(atTime, atTime + 1);
    this.drawNarratorAvatar(atTime);
    
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85);
    });
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopPreview();
    this.flareImages.clear();
    this.particles = [];
    this.scenes = [];
    this.narratorAvatar = null;
    this.audioElement = null;
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
