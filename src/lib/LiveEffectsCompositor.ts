/**
 * Live Effects Compositor - Mixer effets Envato en temps réel
 * Applique light leaks, particles, lens flares sur le flux caméra
 */

import { templateAssetLoader } from './TemplateAssetLoader';

// ============================================================================
// TYPES
// ============================================================================

export interface EffectLayer {
  id: string;
  type: 'light-leak' | 'particles' | 'lens-flare' | 'texture' | 'color-grade';
  element: HTMLVideoElement | HTMLImageElement | null;
  blendMode: GlobalCompositeOperation;
  opacity: number;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  animated: boolean;
  loop: boolean;
}

export interface CompositorConfig {
  width: number;
  height: number;
  fps: number;
  enableAudioSync: boolean;
  beatThreshold: number;
}

export interface AudioAnalysisData {
  isBeat: boolean;
  energy: number;
  bass: number;
  mid: number;
  high: number;
  bpm: number;
}

// ============================================================================
// LIVE EFFECTS COMPOSITOR CLASS
// ============================================================================

export class LiveEffectsCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CompositorConfig;
  private effectLayers: Map<string, EffectLayer> = new Map();
  private animationFrame: number | null = null;
  private isPlaying = false;
  private lastBeatTime = 0;
  private beatIntensity = 0;

  // Audio analysis
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;

  constructor(canvas: HTMLCanvasElement, config: Partial<CompositorConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    
    this.config = {
      width: config.width || 1080,
      height: config.height || 1920,
      fps: config.fps || 30,
      enableAudioSync: config.enableAudioSync ?? true,
      beatThreshold: config.beatThreshold || 0.7,
    };

    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
  }

  // Initialize audio analysis
  async initAudioAnalysis(audioSource?: MediaStream): Promise<void> {
    if (!this.config.enableAudioSync) return;

    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

      if (audioSource) {
        const source = this.audioContext.createMediaStreamSource(audioSource);
        source.connect(this.analyser);
      }
    } catch (error) {
      console.warn('[LiveEffectsCompositor] Audio analysis init failed:', error);
    }
  }

  // Analyze audio for beat detection
  private analyzeAudio(): AudioAnalysisData {
    if (!this.analyser || !this.frequencyData) {
      return { isBeat: false, energy: 0, bass: 0, mid: 0, high: 0, bpm: 120 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    // Calculate frequency bands
    const bassEnd = Math.floor(this.frequencyData.length * 0.1);
    const midEnd = Math.floor(this.frequencyData.length * 0.5);

    let bass = 0, mid = 0, high = 0, total = 0;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const value = this.frequencyData[i] / 255;
      total += value;
      
      if (i < bassEnd) bass += value;
      else if (i < midEnd) mid += value;
      else high += value;
    }

    bass /= bassEnd;
    mid /= (midEnd - bassEnd);
    high /= (this.frequencyData.length - midEnd);
    const energy = total / this.frequencyData.length;

    // Beat detection
    const now = performance.now();
    const isBeat = bass > this.config.beatThreshold && 
                   (now - this.lastBeatTime) > 200; // Min 200ms between beats

    if (isBeat) {
      this.lastBeatTime = now;
      this.beatIntensity = 1;
    } else {
      this.beatIntensity = Math.max(0, this.beatIntensity - 0.05);
    }

    return { isBeat, energy, bass, mid, high, bpm: 120 };
  }

  // Add a light leak effect
  async addLightLeak(
    id: string,
    templateId: string,
    filename: string,
    options: Partial<EffectLayer> = {}
  ): Promise<void> {
    const video = await templateAssetLoader.loadAsVideo(templateId, 'lightLeaks', filename);
    
    if (video) {
      video.loop = true;
      video.muted = true;
      video.play().catch(() => {});

      this.effectLayers.set(id, {
        id,
        type: 'light-leak',
        element: video,
        blendMode: options.blendMode || 'screen',
        opacity: options.opacity ?? 0.5,
        position: options.position || { x: 0, y: 0 },
        scale: options.scale ?? 1,
        rotation: options.rotation ?? 0,
        animated: true,
        loop: true,
      });
    }
  }

  // Add particles effect
  async addParticles(
    id: string,
    templateId: string,
    filename: string,
    options: Partial<EffectLayer> = {}
  ): Promise<void> {
    const video = await templateAssetLoader.loadAsVideo(templateId, 'particles', filename);
    
    if (video) {
      video.loop = true;
      video.muted = true;
      video.play().catch(() => {});

      this.effectLayers.set(id, {
        id,
        type: 'particles',
        element: video,
        blendMode: options.blendMode || 'screen',
        opacity: options.opacity ?? 0.4,
        position: options.position || { x: 0, y: 0 },
        scale: options.scale ?? 1,
        rotation: options.rotation ?? 0,
        animated: true,
        loop: true,
      });
    }
  }

  // Add lens flare effect
  async addLensFlare(
    id: string,
    templateId: string,
    filename: string,
    options: Partial<EffectLayer> = {}
  ): Promise<void> {
    const image = await templateAssetLoader.loadAsImage(templateId, 'lensFlares', filename);
    
    if (image) {
      this.effectLayers.set(id, {
        id,
        type: 'lens-flare',
        element: image,
        blendMode: options.blendMode || 'screen',
        opacity: options.opacity ?? 0.6,
        position: options.position || { x: 0.5, y: 0.3 }, // Center-top default
        scale: options.scale ?? 0.5,
        rotation: options.rotation ?? 0,
        animated: false,
        loop: false,
      });
    }
  }

  // Add texture overlay
  async addTexture(
    id: string,
    templateId: string,
    filename: string,
    options: Partial<EffectLayer> = {}
  ): Promise<void> {
    // Check if it's a video or image
    const isVideo = filename.endsWith('.mp4') || filename.endsWith('.webm');
    
    if (isVideo) {
      const video = await templateAssetLoader.loadAsVideo(templateId, 'textures', filename);
      if (video) {
        video.loop = true;
        video.muted = true;
        video.play().catch(() => {});

        this.effectLayers.set(id, {
          id,
          type: 'texture',
          element: video,
          blendMode: options.blendMode || 'overlay',
          opacity: options.opacity ?? 0.3,
          position: options.position || { x: 0, y: 0 },
          scale: options.scale ?? 1,
          rotation: options.rotation ?? 0,
          animated: true,
          loop: true,
        });
      }
    } else {
      const image = await templateAssetLoader.loadAsImage(templateId, 'textures', filename);
      if (image) {
        this.effectLayers.set(id, {
          id,
          type: 'texture',
          element: image,
          blendMode: options.blendMode || 'overlay',
          opacity: options.opacity ?? 0.3,
          position: options.position || { x: 0, y: 0 },
          scale: options.scale ?? 1,
          rotation: options.rotation ?? 0,
          animated: false,
          loop: false,
        });
      }
    }
  }

  // Remove effect layer
  removeEffect(id: string): void {
    const layer = this.effectLayers.get(id);
    if (layer?.element instanceof HTMLVideoElement) {
      layer.element.pause();
      layer.element.src = '';
    }
    this.effectLayers.delete(id);
  }

  // Clear all effects
  clearAllEffects(): void {
    for (const [id] of this.effectLayers) {
      this.removeEffect(id);
    }
  }

  // Update effect properties
  updateEffect(id: string, updates: Partial<EffectLayer>): void {
    const layer = this.effectLayers.get(id);
    if (layer) {
      Object.assign(layer, updates);
      this.effectLayers.set(id, layer);
    }
  }

  // Composite camera feed with effects
  composite(cameraFrame: CanvasImageSource, time: number = 0): void {
    const { width, height } = this.config;
    const audioData = this.analyzeAudio();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw camera feed as base
    this.ctx.drawImage(cameraFrame, 0, 0, width, height);

    // Apply beat-reactive scaling
    const beatScale = 1 + (this.beatIntensity * 0.02);

    // Draw effect layers in order
    for (const layer of this.effectLayers.values()) {
      if (!layer.element) continue;

      this.ctx.save();

      // Apply blend mode
      this.ctx.globalCompositeOperation = layer.blendMode;

      // Apply opacity (with beat modulation for animated layers)
      let opacity = layer.opacity;
      if (layer.animated && this.beatIntensity > 0) {
        opacity = Math.min(1, opacity + (this.beatIntensity * 0.3));
      }
      this.ctx.globalAlpha = opacity;

      // Calculate position and size
      const centerX = layer.position.x * width;
      const centerY = layer.position.y * height;
      const scale = layer.scale * (layer.animated ? beatScale : 1);

      // Get element dimensions
      let elemWidth: number, elemHeight: number;
      if (layer.element instanceof HTMLVideoElement) {
        elemWidth = layer.element.videoWidth || width;
        elemHeight = layer.element.videoHeight || height;
      } else {
        elemWidth = layer.element.naturalWidth || layer.element.width;
        elemHeight = layer.element.naturalHeight || layer.element.height;
      }

      // Apply transformations
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate((layer.rotation * Math.PI) / 180);
      this.ctx.scale(scale, scale);

      // Draw based on type
      if (layer.type === 'light-leak' || layer.type === 'particles' || layer.type === 'texture') {
        // Full screen coverage
        this.ctx.drawImage(
          layer.element,
          -width / 2,
          -height / 2,
          width,
          height
        );
      } else if (layer.type === 'lens-flare') {
        // Positioned overlay
        const displayWidth = elemWidth * scale;
        const displayHeight = elemHeight * scale;
        this.ctx.drawImage(
          layer.element,
          -displayWidth / 2,
          -displayHeight / 2,
          displayWidth,
          displayHeight
        );
      }

      this.ctx.restore();
    }
  }

  // Start render loop
  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    const frameInterval = 1000 / this.config.fps;
    let lastFrameTime = performance.now();

    const render = (time: number) => {
      if (!this.isPlaying) return;

      const elapsed = time - lastFrameTime;
      if (elapsed >= frameInterval) {
        lastFrameTime = time - (elapsed % frameInterval);
        // Render will be called externally with camera frame
      }

      this.animationFrame = requestAnimationFrame(render);
    };

    this.animationFrame = requestAnimationFrame(render);
  }

  // Stop render loop
  stop(): void {
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Get canvas for stream capture
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // Get output stream for recording
  getOutputStream(fps: number = 30): MediaStream {
    return this.canvas.captureStream(fps);
  }

  // Dispose resources
  dispose(): void {
    this.stop();
    this.clearAllEffects();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.frequencyData = null;
  }

  // Apply color grade (vignette, contrast, saturation)
  applyColorGrade(options: {
    vignette?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
  } = {}): void {
    const { width, height } = this.config;
    const { 
      vignette = 0.3, 
      contrast = 1.1, 
      saturation = 1.1, 
      temperature = 0 
    } = options;

    // Apply vignette
    if (vignette > 0) {
      const gradient = this.ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${vignette})`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
    }

    // Apply contrast/saturation via filter (if supported)
    // Note: Canvas filter is limited, for full support use WebGL
    if (contrast !== 1 || saturation !== 1) {
      this.ctx.filter = `contrast(${contrast}) saturate(${saturation})`;
      this.ctx.drawImage(this.canvas, 0, 0);
      this.ctx.filter = 'none';
    }
  }
}

// Factory function
export function createLiveEffectsCompositor(
  canvas: HTMLCanvasElement,
  config?: Partial<CompositorConfig>
): LiveEffectsCompositor {
  return new LiveEffectsCompositor(canvas, config);
}

export default LiveEffectsCompositor;
