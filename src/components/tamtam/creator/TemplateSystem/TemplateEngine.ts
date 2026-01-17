/**
 * Template Engine v3.0
 * Core engine for loading, rendering, and exporting templates
 */

import { Template, Effect, EngineState, ExportJob } from './types';
import { AssetManager, assetManager } from './AssetManager';
import { EffectsRenderer } from './EffectsRenderer';

// Get supported MIME type for video recording
function getSupportedMimeType(): string {
  const types = [
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  return '';
}

export class TemplateEngine {
  private assetManager: typeof AssetManager;
  private effectsRenderer: EffectsRenderer | null = null;
  private animationId: number | null = null;
  private currentTemplate: Template | null = null;
  private loadedAssets = new Map<string, unknown>();
  
  // State
  private state: EngineState = {
    isLoaded: false,
    isRendering: false,
    currentTime: 0,
    progress: 0,
    error: null
  };
  
  // Listeners
  private stateListeners = new Set<(state: EngineState) => void>();

  constructor(canvas?: HTMLCanvasElement) {
    this.assetManager = assetManager;
    if (canvas) {
      this.effectsRenderer = new EffectsRenderer(canvas);
    }
  }

  /**
   * Set canvas for rendering
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    if (this.effectsRenderer) {
      this.effectsRenderer.dispose();
    }
    this.effectsRenderer = new EffectsRenderer(canvas);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: EngineState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Update and broadcast state
   */
  private updateState(updates: Partial<EngineState>): void {
    this.state = { ...this.state, ...updates };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current state
   */
  getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Load template by ID
   */
  async loadTemplate(templateId: string): Promise<Template> {
    this.updateState({ isLoaded: false, error: null });
    
    try {
      // Try to load from JSON config
      const response = await fetch(`/assets/templates/${templateId}/config.json`);
      
      if (!response.ok) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      const template: Template = await response.json();
      this.currentTemplate = template;
      
      // Preload template assets
      await this.preloadTemplateAssets(template);
      
      this.updateState({ isLoaded: true });
      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  /**
   * Load template from object
   */
  loadTemplateObject(template: Template): void {
    this.currentTemplate = template;
    this.updateState({ isLoaded: true, error: null });
  }

  /**
   * Preload assets for template
   */
  private async preloadTemplateAssets(template: Template): Promise<void> {
    const assetIds = template.effects
      .map(e => e.assetId)
      .filter(id => id && id.includes(':'));
    
    for (const assetId of assetIds) {
      try {
        const asset = await this.assetManager.load(assetId);
        this.loadedAssets.set(assetId, asset);
      } catch (error) {
        console.warn(`Failed to preload asset: ${assetId}`, error);
      }
    }
  }

  /**
   * Start rendering loop
   */
  async startRendering(
    video: HTMLVideoElement,
    options?: {
      mirror?: boolean;
      onProgress?: (progress: number) => void;
    }
  ): Promise<void> {
    if (!this.effectsRenderer || !this.currentTemplate) {
      throw new Error('Template or canvas not initialized');
    }
    
    this.updateState({ isRendering: true });
    
    const { mirror = false, onProgress } = options || {};
    const startTime = performance.now();
    
    const renderFrame = async () => {
      if (!this.effectsRenderer || !this.currentTemplate) return;
      
      const currentTime = (performance.now() - startTime) / 1000;
      this.updateState({ currentTime });
      
      // Clear canvas
      this.effectsRenderer.clear();
      
      // Draw base video
      this.effectsRenderer.drawVideo(video, mirror);
      
      // Apply effects
      for (const effect of this.currentTemplate.effects) {
        if (this.shouldApplyEffect(effect, currentTime)) {
          await this.applyEffect(effect);
        }
      }
      
      // Report progress
      if (onProgress && this.currentTemplate.duration) {
        const progress = Math.min(currentTime / this.currentTemplate.duration, 1);
        onProgress(progress);
        this.updateState({ progress });
      }
      
      // Continue loop
      if (this.state.isRendering) {
        this.animationId = requestAnimationFrame(renderFrame);
      }
    };
    
    renderFrame();
  }

  /**
   * Stop rendering loop
   */
  stopRendering(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.updateState({ isRendering: false });
  }

  /**
   * Check if effect should be applied
   */
  private shouldApplyEffect(effect: Effect, currentTime: number): boolean {
    const { trigger, config } = effect;
    
    switch (trigger) {
      case 'always':
        return true;
        
      case 'time':
        const start = config.startTime ?? 0;
        const end = config.endTime ?? Infinity;
        return currentTime >= start && currentTime <= end;
        
      case 'beat':
        // TODO: Implement beat detection
        return false;
        
      case 'keyword':
        // TODO: Implement keyword detection
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Apply single effect
   */
  private async applyEffect(effect: Effect): Promise<void> {
    if (!this.effectsRenderer) return;
    
    try {
      // Get asset (from cache or load)
      let asset = this.loadedAssets.get(effect.assetId);
      if (!asset && effect.assetId.includes(':')) {
        asset = await this.assetManager.load(effect.assetId);
        this.loadedAssets.set(effect.assetId, asset);
      }
      
      switch (effect.type) {
        case 'lens-flare':
          if (asset instanceof HTMLImageElement) {
            this.effectsRenderer.drawLensFlare(asset, effect.config);
          }
          break;
          
        case 'light-leak':
          if (asset instanceof HTMLVideoElement) {
            this.effectsRenderer.drawLightLeak(asset, effect.config);
          }
          break;
          
        case 'particles':
          if (asset instanceof HTMLVideoElement) {
            this.effectsRenderer.drawParticles(asset, effect.config);
          }
          break;
          
        case '3d-object':
          // Handle Three.js objects
          if (asset) {
            this.effectsRenderer.draw3DObject(asset as THREE.Object3D, effect.config);
          }
          break;
          
        case 'texture':
          if (asset instanceof HTMLImageElement) {
            this.effectsRenderer.drawTexture(asset, effect.config);
          }
          break;
          
        case 'text':
          this.effectsRenderer.drawText(effect.config.content || '', effect.config);
          break;
          
        case 'transition':
          if (asset instanceof HTMLVideoElement) {
            this.effectsRenderer.drawTransition(asset, effect.config);
          }
          break;
          
        default:
          console.warn(`Unknown effect type: ${effect.type}`);
      }
    } catch (error) {
      console.error(`Failed to apply effect ${effect.type}:`, error);
    }
  }

  /**
   * Render single frame
   */
  async renderFrame(video: HTMLVideoElement, time: number, mirror: boolean = false): Promise<void> {
    if (!this.effectsRenderer || !this.currentTemplate) return;
    
    this.effectsRenderer.clear();
    this.effectsRenderer.drawVideo(video, mirror);
    
    for (const effect of this.currentTemplate.effects) {
      if (this.shouldApplyEffect(effect, time)) {
        await this.applyEffect(effect);
      }
    }
  }

  /**
   * Export video
   */
  async exportVideo(
    duration: number = 10,
    onProgress?: (progress: number) => void
  ): Promise<ExportJob> {
    if (!this.effectsRenderer) {
      return {
        id: crypto.randomUUID(),
        status: 'error',
        progress: 0,
        error: 'Canvas not initialized'
      };
    }
    
    const jobId = crypto.randomUUID();
    const mimeType = getSupportedMimeType();
    
    if (!mimeType) {
      return {
        id: jobId,
        status: 'error',
        progress: 0,
        error: 'No supported video format'
      };
    }
    
    try {
      const stream = this.effectsRenderer.canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType });
      
      return new Promise((resolve) => {
        const chunks: Blob[] = [];
        let progress = 0;
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve({
            id: jobId,
            status: 'complete',
            progress: 100,
            outputBlob: blob
          });
        };
        
        recorder.onerror = () => {
          resolve({
            id: jobId,
            status: 'error',
            progress,
            error: 'Recording failed'
          });
        };
        
        recorder.start();
        
        // Progress updates
        const progressInterval = setInterval(() => {
          progress = Math.min(progress + (100 / (duration * 10)), 99);
          onProgress?.(progress);
        }, 100);
        
        // Stop after duration
        setTimeout(() => {
          clearInterval(progressInterval);
          recorder.stop();
        }, duration * 1000);
      });
    } catch (error) {
      return {
        id: jobId,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Get current template
   */
  getCurrentTemplate(): Template | null {
    return this.currentTemplate;
  }

  /**
   * Clear current template
   */
  clearTemplate(): void {
    this.stopRendering();
    this.currentTemplate = null;
    this.loadedAssets.clear();
    this.updateState({
      isLoaded: false,
      isRendering: false,
      currentTime: 0,
      progress: 0,
      error: null
    });
  }

  /**
   * Dispose engine
   */
  dispose(): void {
    this.stopRendering();
    this.effectsRenderer?.dispose();
    this.assetManager.clearCache();
    this.loadedAssets.clear();
    this.stateListeners.clear();
  }
}

// Singleton instance
export const templateEngine = new TemplateEngine();
