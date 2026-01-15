/**
 * Effects Renderer v3.0
 * Canvas-based rendering for template effects
 */

import * as THREE from 'three';
import { EffectConfig } from './types';

export class EffectsRenderer {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // 3D rendering components
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private tempCanvas: HTMLCanvasElement | null = null;
  private is3DInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
  }

  /**
   * Initialize 3D rendering (lazy, only when needed)
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
      
      this.tempCanvas = document.createElement('canvas');
      this.tempCanvas.width = this.canvas.width;
      this.tempCanvas.height = this.canvas.height;
      
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.tempCanvas,
        alpha: true,
        antialias: true
      });
      this.renderer.setSize(this.canvas.width, this.canvas.height);
      
      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);
      
      this.is3DInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize 3D renderer:', error);
    }
  }

  /**
   * Clear canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Fill canvas with color
   */
  fill(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw video frame
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

  /**
   * Draw lens flare effect
   */
  drawLensFlare(image: HTMLImageElement, config: EffectConfig = {}): void {
    const {
      x = 0.5,
      y = 0.3,
      scale = 1.0,
      opacity = 0.8,
      rotation = 0,
      blendMode = 'screen'
    } = config;
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = blendMode;
    
    const drawX = x * this.canvas.width;
    const drawY = y * this.canvas.height;
    const width = image.width * scale;
    const height = image.height * scale;
    
    this.ctx.translate(drawX, drawY);
    this.ctx.rotate((rotation * Math.PI) / 180);
    
    this.ctx.drawImage(
      image,
      -width / 2,
      -height / 2,
      width,
      height
    );
    
    this.ctx.restore();
  }

  /**
   * Draw light leak overlay
   */
  drawLightLeak(video: HTMLVideoElement, config: EffectConfig = {}): void {
    const {
      opacity = 0.6,
      blendMode = 'screen'
    } = config;
    
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    
    // Auto-play if paused
    if (video.paused) {
      video.play().catch(() => {});
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = blendMode;
    
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.restore();
  }

  /**
   * Draw particles overlay
   */
  drawParticles(video: HTMLVideoElement, config: EffectConfig = {}): void {
    const {
      opacity = 0.7,
      blendMode = 'screen',
      scale = 1.0
    } = config;
    
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    
    if (video.paused) {
      video.play().catch(() => {});
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = blendMode;
    
    const width = this.canvas.width * scale;
    const height = this.canvas.height * scale;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;
    
    this.ctx.drawImage(video, x, y, width, height);
    
    this.ctx.restore();
  }

  /**
   * Draw 3D object
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
      scale = 1,
      rotation = 0
    } = config;
    
    // Position object
    object.position.set(x * 2 - 1, -(y * 2 - 1), 0);
    object.rotation.y = (rotation * Math.PI) / 180;
    object.scale.setScalar(scale);
    
    // Add to scene
    this.scene.add(object);
    
    // Render
    this.renderer.render(this.scene, this.camera);
    
    // Draw to main canvas
    this.ctx.drawImage(this.tempCanvas, 0, 0);
    
    // Remove from scene
    this.scene.remove(object);
  }

  /**
   * Draw text overlay
   */
  drawText(text: string, config: EffectConfig = {}): void {
    const {
      x = 0.5,
      y = 0.9,
      font = '48px Arial',
      color = '#FFFFFF',
      align = 'center',
      opacity = 1.0
    } = config;
    
    this.ctx.save();
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.globalAlpha = opacity;
    
    // Add text shadow for readability
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    this.ctx.fillText(
      text,
      x * this.canvas.width,
      y * this.canvas.height
    );
    
    this.ctx.restore();
  }

  /**
   * Draw texture overlay
   */
  drawTexture(image: HTMLImageElement, config: EffectConfig = {}): void {
    const {
      opacity = 0.5,
      blendMode = 'multiply'
    } = config;
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.globalCompositeOperation = blendMode;
    
    this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.restore();
  }

  /**
   * Draw transition effect
   */
  drawTransition(video: HTMLVideoElement, config: EffectConfig = {}): void {
    const { opacity = 1.0 } = config;
    
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    
    if (video.paused) {
      video.play().catch(() => {});
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.restore();
  }

  /**
   * Apply color grading
   */
  applyColorGrade(config: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    warmth?: number;
  }): void {
    const {
      brightness = 1,
      contrast = 1,
      saturation = 1,
      warmth = 0
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
      
      // Warmth
      r += warmth * 20;
      b -= warmth * 20;
      
      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    this.ctx.putImageData(imageData, 0, 0);
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
   * Resize canvas
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
  }

  /**
   * Dispose resources
   */
  dispose(): void {
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
