/**
 * TAM-TAM Effects Renderer v4.0
 * Canvas-based rendering with WebM VP9 alpha channel support
 * Handles: 2D canvas overlays, 3D Three.js objects, blend modes
 */

import * as THREE from 'three';
import type { EffectConfig, BlendMode } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ColorGradeConfig {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  warmth?: number;
  sepia?: number;
  vignette?: number;
}

// ============================================================================
// EFFECTS RENDERER CLASS
// ============================================================================

export class EffectsRenderer {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // 3D rendering components (lazy initialized)
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private tempCanvas: HTMLCanvasElement | null = null;
  private is3DInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Create 2D context with alpha support and optimized settings
    const ctx = canvas.getContext('2d', { 
      alpha: true,
      willReadFrequently: false, // Optimize for drawing, not reading
      desynchronized: true // Reduce latency on supported browsers
    });
    
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    this.ctx = ctx;
    console.log('✅ EffectsRenderer v4.0 initialized');
  }

  // ==========================================================================
  // 3D INITIALIZATION (Lazy)
  // ==========================================================================

  /**
   * Initialize 3D rendering only when needed
   */
  private init3D(): void {
    if (this.is3DInitialized) return;
    
    try {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        this.canvas.width / this.canvas.height,
        0.1,
        1000
      );
      this.camera.position.z = 5;
      
      // Create temporary canvas for 3D rendering
      this.tempCanvas = document.createElement('canvas');
      this.tempCanvas.width = this.canvas.width;
      this.tempCanvas.height = this.canvas.height;
      
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.tempCanvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      });
      this.renderer.setSize(this.canvas.width, this.canvas.height);
      this.renderer.setClearColor(0x000000, 0); // Transparent background
      
      // Lighting setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);
      
      this.is3DInitialized = true;
      console.log('✅ 3D renderer initialized');
    } catch (error) {
      console.warn('Failed to initialize 3D renderer:', error);
    }
  }

  // ==========================================================================
  // BASIC OPERATIONS
  // ==========================================================================

  /**
   * Clear canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Fill canvas with solid color
   */
  fill(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ==========================================================================
  // VIDEO RENDERING
  // ==========================================================================

  /**
   * Draw base video frame
   */
  drawVideo(video: HTMLVideoElement, mirror: boolean = false): void {
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    
    this.ctx.save();
    
    if (mirror) {
      this.ctx.translate(this.canvas.width, 0);
      this.ctx.scale(-1, 1);
    }
    
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  // ==========================================================================
  // LIGHT LEAK RENDERING (WebM VP9 with Alpha)
  // ==========================================================================

  /**
   * Draw light leak with alpha transparency (WebM VP9)
   * WebM VP9 codec preserves alpha channel for transparent overlays
   */
  drawLightLeak(video: HTMLVideoElement, config: EffectConfig = {}): void {
    const {
      opacity = 0.6,
      blendMode = 'screen',
      scale = 1.0,
      x = 0.5,
      y = 0.5
    } = config;
    
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    
    // Auto-play if paused (for looping effects)
    if (video.paused) {
      video.play().catch(() => {});
    }
    
    this.ctx.save();
    
    // Set alpha and blend mode for transparency
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = this.mapBlendMode(blendMode);
    
    if (scale === 1.0 && x === 0.5 && y === 0.5) {
      // Full canvas draw (optimized)
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      // Positioned/scaled draw
      const width = this.canvas.width * scale;
      const height = this.canvas.height * scale;
      const posX = x * this.canvas.width - width / 2;
      const posY = y * this.canvas.height - height / 2;
      
      this.ctx.drawImage(video, posX, posY, width, height);
    }
    
    this.ctx.restore();
  }

  // ==========================================================================
  // LENS FLARE RENDERING (PNG with Alpha)
  // ==========================================================================

  /**
   * Draw lens flare PNG with alpha transparency
   */
  drawLensFlare(image: HTMLImageElement, config: EffectConfig = {}): void {
    const {
      x = 0.5,
      y = 0.3,
      scale = 1.0,
      opacity = 0.8,
      blendMode = 'screen',
      rotation = 0
    } = config;
    
    this.ctx.save();
    
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = this.mapBlendMode(blendMode);
    
    const drawX = x * this.canvas.width;
    const drawY = y * this.canvas.height;
    const width = image.width * scale;
    const height = image.height * scale;
    
    // Apply rotation around center point
    this.ctx.translate(drawX, drawY);
    if (rotation !== 0) {
      this.ctx.rotate((rotation * Math.PI) / 180);
    }
    
    // Draw image centered at origin
    this.ctx.drawImage(
      image,
      -width / 2,
      -height / 2,
      width,
      height
    );
    
    this.ctx.restore();
  }

  // ==========================================================================
  // PARTICLE RENDERING (WebM VP9 with Alpha)
  // ==========================================================================

  /**
   * Draw particles overlay (WebM VP9 with alpha)
   */
  drawParticles(video: HTMLVideoElement, config: EffectConfig = {}): void {
    const {
      opacity = 0.7,
      blendMode = 'screen',
      scale = 1.0,
      x = 0.5,
      y = 0.5
    } = config;
    
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    
    // Auto-play for looping
    if (video.paused) {
      video.play().catch(() => {});
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = this.mapBlendMode(blendMode);
    
    const width = this.canvas.width * scale;
    const height = this.canvas.height * scale;
    const posX = (x - 0.5) * this.canvas.width + (this.canvas.width - width) / 2;
    const posY = (y - 0.5) * this.canvas.height + (this.canvas.height - height) / 2;
    
    this.ctx.drawImage(video, posX, posY, width, height);
    
    this.ctx.restore();
  }

  // ==========================================================================
  // TEXTURE RENDERING
  // ==========================================================================

  /**
   * Draw texture overlay (image or video)
   */
  drawTexture(source: HTMLImageElement | HTMLVideoElement, config: EffectConfig = {}): void {
    const {
      opacity = 0.5,
      blendMode = 'multiply',
      scale = 1.0
    } = config;
    
    // Check video readiness
    if (source instanceof HTMLVideoElement && source.readyState < source.HAVE_CURRENT_DATA) {
      return;
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = this.mapBlendMode(blendMode);
    
    if (scale === 1.0) {
      // Fill entire canvas
      this.ctx.drawImage(source, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      // Tiled texture pattern
      const pattern = this.ctx.createPattern(source, 'repeat');
      if (pattern) {
        this.ctx.scale(scale, scale);
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(0, 0, this.canvas.width / scale, this.canvas.height / scale);
      }
    }
    
    this.ctx.restore();
  }

  // ==========================================================================
  // TRANSITION RENDERING
  // ==========================================================================

  /**
   * Draw transition effect
   */
  drawTransition(video: HTMLVideoElement, config: EffectConfig = {}): void {
    const {
      opacity = 1.0,
      blendMode = 'normal'
    } = config;
    
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    
    if (video.paused) {
      video.play().catch(() => {});
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = this.mapBlendMode(blendMode);
    
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.restore();
  }

  // ==========================================================================
  // 3D OBJECT RENDERING
  // ==========================================================================

  /**
   * Draw 3D object (Adinkra symbols, etc.)
   */
  draw3DObject(object: THREE.Object3D, config: EffectConfig = {}): void {
    this.init3D();
    
    if (!this.scene || !this.camera || !this.renderer || !this.tempCanvas) {
      console.warn('3D not initialized');
      return;
    }
    
    const {
      x = 0,
      y = 0,
      z = -2,
      rotation = 0,
      scale = 1,
      rotationX = 0,
      rotationY = 0,
      rotationZ = 0,
      opacity = 1.0
    } = config;
    
    // Position and transform object
    object.position.set(
      (x - 0.5) * 4, // Convert 0-1 to -2 to 2 range
      -(y - 0.5) * 4,
      z
    );
    object.rotation.set(
      (rotationX * Math.PI) / 180,
      ((rotation + (rotationY || 0)) * Math.PI) / 180,
      (rotationZ * Math.PI) / 180
    );
    object.scale.setScalar(scale);
    
    // Add to scene temporarily
    this.scene.add(object);
    
    // Render 3D scene to temp canvas
    this.renderer.render(this.scene, this.camera);
    
    // Draw temp canvas onto main canvas with alpha
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.tempCanvas, 0, 0);
    this.ctx.restore();
    
    // Remove from scene
    this.scene.remove(object);
  }

  // ==========================================================================
  // TEXT RENDERING
  // ==========================================================================

  /**
   * Draw text overlay with optional effects
   */
  drawText(text: string, config: EffectConfig = {}): void {
    const {
      x = 0.5,
      y = 0.9,
      font = '48px Arial',
      color = '#FFFFFF',
      align = 'center',
      opacity = 1.0,
      strokeColor = '#000000',
      strokeWidth = 0,
      shadow = false
    } = config;
    
    this.ctx.save();
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align as CanvasTextAlign;
    this.ctx.textBaseline = 'middle';
    this.ctx.globalAlpha = opacity;
    
    const drawX = x * this.canvas.width;
    const drawY = y * this.canvas.height;
    
    // Shadow effect
    if (shadow) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
    }
    
    // Stroke (outline)
    if (strokeWidth && strokeWidth > 0) {
      this.ctx.strokeStyle = strokeColor || '#000000';
      this.ctx.lineWidth = strokeWidth;
      this.ctx.lineJoin = 'round';
      this.ctx.strokeText(text, drawX, drawY);
    }
    
    // Fill
    this.ctx.fillText(text, drawX, drawY);
    
    this.ctx.restore();
  }

  // ==========================================================================
  // COLOR GRADING
  // ==========================================================================

  /**
   * Apply color grading to current canvas content
   */
  applyColorGrade(config: ColorGradeConfig): void {
    const {
      brightness = 1,
      contrast = 1,
      saturation = 1,
      warmth = 0,
      sepia = 0,
      vignette = 0
    } = config;
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      
      // Brightness
      r *= brightness;
      g *= brightness;
      b *= brightness;
      
      // Contrast
      r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
      
      // Saturation
      if (saturation !== 1) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + saturation * (r - gray);
        g = gray + saturation * (g - gray);
        b = gray + saturation * (b - gray);
      }
      
      // Warmth (shift red/blue)
      r += warmth * 20;
      b -= warmth * 20;
      
      // Sepia tone
      if (sepia > 0) {
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = r + sepia * (tr - r);
        g = g + sepia * (tg - g);
        b = b + sepia * (tb - b);
      }
      
      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    this.ctx.putImageData(imageData, 0, 0);
    
    // Apply vignette as overlay
    if (vignette > 0) {
      this.applyVignette(vignette);
    }
  }

  /**
   * Apply vignette effect
   */
  private applyVignette(intensity: number): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const radius = Math.max(cx, cy) * 1.5;
    
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
    
    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Map custom blend mode to GlobalCompositeOperation
   */
  private mapBlendMode(mode: BlendMode | string | undefined): GlobalCompositeOperation {
    const modeMap: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'screen': 'screen',
      'multiply': 'multiply',
      'overlay': 'overlay',
      'soft-light': 'soft-light',
      'hard-light': 'hard-light',
      'add': 'lighter', // 'add' maps to 'lighter'
      'lighten': 'lighten',
      'darken': 'darken',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
    };
    
    return modeMap[mode || 'normal'] || 'source-over';
  }

  /**
   * Get canvas as data URL
   */
  toDataURL(type: string = 'image/png', quality: number = 1.0): string {
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * Get canvas as blob
   */
  async toBlob(type: string = 'image/png', quality: number = 0.92): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * Resize canvas and update 3D components
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    if (this.is3DInitialized && this.tempCanvas && this.camera && this.renderer) {
      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
    
    console.log(`📐 EffectsRenderer resized: ${width}x${height}`);
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    console.log('🗑️ Disposing EffectsRenderer');
    
    if (this.scene) {
      this.scene.clear();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.tempCanvas = null;
    this.is3DInitialized = false;
  }
}
