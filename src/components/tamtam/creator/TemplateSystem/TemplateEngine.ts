/**
 * TAM-TAM Template Engine v4.0
 * Core engine for loading, rendering, and exporting templates
 * Orchestrates AssetManager, EffectsRenderer, and BeatDetector
 */

import * as THREE from 'three';
import { Template, Effect, EngineState, ExportJob, RenderState } from './types';
import { AssetManager, LoadedAsset } from './AssetManager';
import { EffectsRenderer } from './EffectsRenderer';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// TEMPLATE ENGINE CLASS
// ============================================================================

export class TemplateEngine {
  private assetManager: typeof AssetManager;
  private effectsRenderer: EffectsRenderer | null = null;
  private animationId: number | null = null;
  private currentTemplate: Template | null = null;
  private loadedAssets = new Map<string, LoadedAsset>();
  
  // Render state
  private renderState: RenderState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    fps: 0,
    loadedAssets: 0,
    totalAssets: 0
  };
  
  // Engine state
  private state: EngineState = {
    isLoaded: false,
    isRendering: false,
    currentTime: 0,
    progress: 0,
    error: null
  };
  
  // FPS tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  
  // Audio analysis for beat detection
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioDataArray: Uint8Array<ArrayBuffer> | null = null;
  private lastBeatTime: number = 0;
  private beatCooldown: number = 100; // ms between beats
  
  // Active effects
  private activeEffects: Effect[] = [];
  
  // Keyword detection
  private detectedKeywords: Set<string> = new Set();
  
  // Listeners
  private stateListeners = new Set<(state: EngineState) => void>();
  private renderListeners = new Set<(state: RenderState) => void>();

  constructor(canvas?: HTMLCanvasElement) {
    this.assetManager = AssetManager;
    if (canvas) {
      this.effectsRenderer = new EffectsRenderer(canvas);
    }
    console.log('✅ TemplateEngine v4.0 initialized');
  }

  // ==========================================================================
  // CANVAS MANAGEMENT
  // ==========================================================================

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
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.effectsRenderer?.resize(width, height);
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Subscribe to engine state changes
   */
  subscribe(listener: (state: EngineState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Subscribe to render state changes
   */
  onRenderState(listener: (state: RenderState) => void): () => void {
    this.renderListeners.add(listener);
    listener(this.renderState);
    return () => this.renderListeners.delete(listener);
  }

  /**
   * Update and broadcast engine state
   */
  private updateState(updates: Partial<EngineState>): void {
    this.state = { ...this.state, ...updates };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  /**
   * Update and broadcast render state
   */
  private updateRenderState(updates: Partial<RenderState>): void {
    this.renderState = { ...this.renderState, ...updates };
    this.renderListeners.forEach(listener => listener(this.renderState));
  }

  /**
   * Get current engine state
   */
  getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Get current render state
   */
  getRenderState(): RenderState {
    return { ...this.renderState };
  }

  // ==========================================================================
  // TEMPLATE LOADING
  // ==========================================================================

  /**
   * Load template by ID (from JSON config)
   */
  async loadTemplateById(templateId: string): Promise<Template> {
    this.updateState({ isLoaded: false, error: null });
    
    try {
      const response = await fetch(`/assets/templates/${templateId}/config.json`);
      
      if (!response.ok) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      const template: Template = await response.json();
      await this.loadTemplate(template);
      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  /**
   * Load template from object and preload assets
   */
  async loadTemplate(template: Template): Promise<void> {
    console.log(`📦 Loading template: ${template.name}`);
    
    this.currentTemplate = template;
    this.loadedAssets.clear();
    this.activeEffects = [];
    
    // Collect all asset IDs
    const assetIds = new Set<string>();
    
    template.effects.forEach(effect => {
      if (effect.assetId && effect.assetId.includes(':')) {
        assetIds.add(effect.assetId);
      }
    });
    
    if (template.audio?.backgroundMusic) {
      assetIds.add(template.audio.backgroundMusic);
    }
    
    this.updateRenderState({
      totalAssets: assetIds.size,
      loadedAssets: 0,
      duration: template.duration || 0
    });
    
    // Load all assets with progress tracking
    const assetArray = Array.from(assetIds);
    
    for (let i = 0; i < assetArray.length; i++) {
      const assetId = assetArray[i];
      
      try {
        console.log(`Loading asset ${i + 1}/${assetArray.length}: ${assetId}`);
        const asset = await this.assetManager.load(assetId);
        this.loadedAssets.set(assetId, asset);
        this.updateRenderState({ loadedAssets: i + 1 });
      } catch (error) {
        console.error(`Failed to load asset: ${assetId}`, error);
        // Continue loading other assets
      }
    }
    
    // Initialize audio analysis if beat detection is enabled
    if (template.audio?.beatDetection) {
      this.initAudioAnalysis();
    }
    
    this.updateState({ isLoaded: true, error: null });
    console.log(`✅ Template loaded: ${this.renderState.loadedAssets}/${this.renderState.totalAssets} assets`);
  }

  /**
   * Load template object without preloading (quick load)
   */
  loadTemplateObject(template: Template): void {
    this.currentTemplate = template;
    this.updateState({ isLoaded: true, error: null });
  }

  // ==========================================================================
  // AUDIO ANALYSIS (Beat Detection)
  // ==========================================================================

  /**
   * Initialize audio analysis for beat detection
   */
  private initAudioAnalysis(): void {
    if (this.audioContext) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);
      console.log('🎵 Audio analysis initialized');
    } catch (error) {
      console.warn('Failed to initialize audio analysis:', error);
    }
  }

  /**
   * Connect audio source for beat detection
   */
  connectAudioSource(audioElement: HTMLAudioElement | HTMLVideoElement): void {
    if (!this.audioContext || !this.analyser) {
      this.initAudioAnalysis();
    }
    
    if (this.audioContext && this.analyser) {
      try {
        const source = this.audioContext.createMediaElementSource(audioElement);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        console.log('🔊 Audio source connected');
      } catch (error) {
        console.warn('Failed to connect audio source:', error);
      }
    }
  }

  /**
   * Detect beat based on audio analysis
   */
  private detectBeat(threshold: number = 0.7): boolean {
    if (!this.analyser || !this.audioDataArray) {
      return false;
    }
    
    const now = performance.now();
    if (now - this.lastBeatTime < this.beatCooldown) {
      return false; // Cooldown to prevent rapid triggering
    }
    
    this.analyser.getByteFrequencyData(this.audioDataArray);
    
    // Calculate average frequency in bass range (0-200 Hz approximately)
    let sum = 0;
    const bassRange = Math.floor(this.audioDataArray.length * 0.1);
    
    for (let i = 0; i < bassRange; i++) {
      sum += this.audioDataArray[i];
    }
    
    const average = sum / bassRange;
    const normalizedValue = average / 255;
    
    if (normalizedValue > threshold) {
      this.lastBeatTime = now;
      return true;
    }
    
    return false;
  }

  // ==========================================================================
  // KEYWORD DETECTION
  // ==========================================================================

  /**
   * Trigger keyword detection (called from speech recognition)
   */
  triggerKeyword(keyword: string): void {
    this.detectedKeywords.add(keyword.toLowerCase());
    
    // Auto-clear after 2 seconds
    setTimeout(() => {
      this.detectedKeywords.delete(keyword.toLowerCase());
    }, 2000);
  }

  /**
   * Check if a keyword is currently active
   */
  private isKeywordActive(keywords: string[] | undefined): boolean {
    if (!keywords || keywords.length === 0) return false;
    
    return keywords.some(kw => 
      this.detectedKeywords.has(kw.toLowerCase())
    );
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  /**
   * Start rendering loop
   */
  start(): void {
    if (!this.currentTemplate) {
      console.error('No template loaded');
      return;
    }
    
    this.updateRenderState({ isPlaying: true });
    this.updateState({ isRendering: true });
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    
    this.render();
    console.log('▶️ Rendering started');
  }

  /**
   * Stop rendering loop
   */
  stop(): void {
    this.updateRenderState({ isPlaying: false });
    this.updateState({ isRendering: false });
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('⏹️ Rendering stopped');
  }

  /**
   * Main render loop
   */
  private render = (): void => {
    if (!this.renderState.isPlaying || !this.currentTemplate) {
      return;
    }
    
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    
    // Update FPS
    this.frameCount++;
    if (now - this.fpsUpdateTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.updateRenderState({ fps });
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }
    
    // Update current time
    const newTime = this.renderState.currentTime + deltaTime;
    this.updateRenderState({ currentTime: newTime });
    this.updateState({ currentTime: newTime });
    
    // Clear canvas
    this.effectsRenderer?.clear();
    
    // Update active effects based on triggers
    this.updateActiveEffects();
    
    // Render all active effects
    this.renderEffects();
    
    // Continue loop
    this.animationId = requestAnimationFrame(this.render);
  };

  /**
   * Start rendering with video source
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
    this.updateRenderState({ isPlaying: true });
    
    const { mirror = false, onProgress } = options || {};
    const startTime = performance.now();
    
    const renderFrame = async () => {
      if (!this.effectsRenderer || !this.currentTemplate || !this.state.isRendering) return;
      
      const currentTime = (performance.now() - startTime) / 1000;
      this.updateState({ currentTime });
      this.updateRenderState({ currentTime });
      
      // Clear canvas
      this.effectsRenderer.clear();
      
      // Draw base video
      this.effectsRenderer.drawVideo(video, mirror);
      
      // Update and render effects
      this.updateActiveEffects();
      this.renderEffects();
      
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
    this.stop();
  }

  /**
   * Update which effects should be active based on triggers
   */
  private updateActiveEffects(): void {
    if (!this.currentTemplate) return;
    
    this.activeEffects = this.currentTemplate.effects.filter(effect => {
      return this.shouldEffectBeActive(effect);
    });
  }

  /**
   * Check if an effect should be active based on its trigger
   */
  private shouldEffectBeActive(effect: Effect): boolean {
    const { trigger, config } = effect;
    
    switch (trigger) {
      case 'always':
        return true;
        
      case 'time':
        if (config.timeRange) {
          const [start, end] = config.timeRange;
          return this.renderState.currentTime >= start && this.renderState.currentTime <= end;
        }
        // Legacy support
        const startTime = config.startTime ?? 0;
        const endTime = config.endTime ?? Infinity;
        return this.renderState.currentTime >= startTime && this.renderState.currentTime <= endTime;
        
      case 'beat':
        return this.detectBeat(config.beatThreshold ?? 0.7);
        
      case 'keyword':
        return this.isKeywordActive(config.keywords);
        
      default:
        return false;
    }
  }

  /**
   * Render all active effects
   */
  private renderEffects(): void {
    if (!this.effectsRenderer) return;
    
    for (const effect of this.activeEffects) {
      const asset = this.loadedAssets.get(effect.assetId);
      
      if (!asset && effect.assetId.includes(':')) {
        // Asset not loaded yet, try to load
        this.assetManager.load(effect.assetId).then(loaded => {
          this.loadedAssets.set(effect.assetId, loaded);
        }).catch(() => {});
        continue;
      }
      
      try {
        this.renderEffect(effect, asset);
      } catch (error) {
        console.error(`Failed to render effect: ${effect.type}`, error);
      }
    }
  }

  /**
   * Render a single effect
   */
  private renderEffect(effect: Effect, asset: LoadedAsset | undefined): void {
    if (!this.effectsRenderer) return;
    
    const { type, config } = effect;
    const data = asset?.data;
    
    switch (type) {
      case 'light-leak':
        if (data instanceof HTMLVideoElement) {
          if (data.paused) data.play().catch(() => {});
          this.effectsRenderer.drawLightLeak(data, config);
        }
        break;
        
      case 'lens-flare':
        if (data instanceof HTMLImageElement) {
          this.effectsRenderer.drawLensFlare(data, config);
        }
        break;
        
      case 'particles':
        if (data instanceof HTMLVideoElement) {
          if (data.paused) data.play().catch(() => {});
          this.effectsRenderer.drawParticles(data, config);
        }
        break;
        
      case 'texture':
        if (data instanceof HTMLImageElement || data instanceof HTMLVideoElement) {
          if (data instanceof HTMLVideoElement && data.paused) {
            data.play().catch(() => {});
          }
          this.effectsRenderer.drawTexture(data, config);
        }
        break;
        
      case '3d-object':
        if (data) {
          this.effectsRenderer.draw3DObject(data as unknown as THREE.Object3D, config);
        }
        break;
        
      case 'text':
        const text = config.text || config.content || '';
        if (text) {
          this.effectsRenderer.drawText(text, config);
        }
        break;
        
      case 'transition':
        if (data instanceof HTMLVideoElement) {
          if (data.paused) data.play().catch(() => {});
          this.effectsRenderer.drawTransition(data, config);
        }
        break;
        
      default:
        console.warn(`Unknown effect type: ${type}`);
    }
  }

  /**
   * Render single frame manually
   */
  async renderFrame(video: HTMLVideoElement, time: number, mirror: boolean = false): Promise<void> {
    if (!this.effectsRenderer || !this.currentTemplate) return;
    
    this.updateRenderState({ currentTime: time });
    
    this.effectsRenderer.clear();
    this.effectsRenderer.drawVideo(video, mirror);
    
    this.updateActiveEffects();
    this.renderEffects();
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

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

  // ==========================================================================
  // TEMPLATE MANAGEMENT
  // ==========================================================================

  /**
   * Get current template
   */
  getCurrentTemplate(): Template | null {
    return this.currentTemplate;
  }

  /**
   * Get template (alias for compatibility)
   */
  getTemplate(): Template | null {
    return this.currentTemplate;
  }

  /**
   * Clear current template
   */
  clearTemplate(): void {
    this.stopRendering();
    this.currentTemplate = null;
    this.loadedAssets.clear();
    this.activeEffects = [];
    this.detectedKeywords.clear();
    
    this.updateState({
      isLoaded: false,
      isRendering: false,
      currentTime: 0,
      progress: 0,
      error: null
    });
    
    this.updateRenderState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      fps: 0,
      loadedAssets: 0,
      totalAssets: 0
    });
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Dispose engine and cleanup resources
   */
  dispose(): void {
    console.log('🗑️ Disposing TemplateEngine');
    
    this.stopRendering();
    
    // Stop and cleanup all video elements
    this.loadedAssets.forEach((asset) => {
      if (asset.data instanceof HTMLVideoElement) {
        asset.data.pause();
        asset.data.src = '';
        asset.data.load();
      }
      if (asset.objectUrl) {
        URL.revokeObjectURL(asset.objectUrl);
      }
    });
    
    this.loadedAssets.clear();
    this.effectsRenderer?.dispose();
    this.assetManager.clearCache();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
      this.audioDataArray = null;
    }
    
    this.stateListeners.clear();
    this.renderListeners.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const templateEngine = new TemplateEngine();
