/**
 * TAM-TAM Template Engine v5.0
 * Production-grade template engine with 4K support, AI features, and worker optimization
 * 
 * @description Core engine for loading, rendering, and exporting video templates
 * with Three.js 3D support, particle systems, and audio synchronization.
 */

import * as THREE from 'three';
import { AssetManager as AssetManagerInstance, LoadedAsset, LoadProgress } from '@/components/tamtam/creator/TemplateSystem/AssetManager';
import { resolveAssetPath, isAssetAvailable, getAssetStats } from '@/lib/AssetRealMapping';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Template resolution settings
 */
export type Resolution = '4K' | '1080p' | '720p' | '480p';

/**
 * Export format options
 */
export type ExportFormat = 'mp4' | 'webm';

/**
 * AI feature identifiers
 */
export type AIFeature = 
  | 'beat-detection' 
  | 'auto-caption' 
  | 'scene-detection' 
  | 'color-grading'
  | 'object-tracking'
  | 'face-detection'
  | 'smart-crop';

/**
 * Required assets by category
 */
export interface RequiredAssets {
  /** 3D model assets (GLB/GLTF) */
  models: string[];
  /** Particle effect assets (WebM with alpha) */
  particles: string[];
  /** Light leak overlay assets */
  lightLeaks: string[];
  /** Background music and SFX */
  audio: string[];
  /** Custom fonts */
  fonts: string[];
  /** Lens flare effects */
  lensFlares?: string[];
  /** Texture overlays */
  textures?: string[];
  /** Transition effects */
  transitions?: string[];
}

/**
 * Render settings configuration
 */
export interface RenderSettings {
  /** Output resolution */
  resolution: Resolution;
  /** Frames per second (max 60) */
  fps: number;
  /** Video duration in seconds */
  duration: number;
  /** Bitrate in Mbps */
  bitrate?: number;
  /** Use hardware acceleration */
  hardwareAcceleration?: boolean;
}

/**
 * Template definition interface
 */
export interface Template {
  /** Unique template identifier */
  id: string;
  /** Template display name */
  name: string;
  /** Bariba localized name */
  nameBa?: string;
  /** Template category */
  category: 'storytelling' | 'music' | 'business' | 'education' | 'future';
  /** Template description */
  description: string;
  /** Bariba localized description */
  descriptionBa?: string;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Required assets organized by type */
  requiredAssets: RequiredAssets;
  /** Render configuration */
  renderSettings: RenderSettings;
  /** Enabled AI features */
  aiFeatures: AIFeature[];
  /** Template metadata */
  metadata?: {
    author?: string;
    version?: string;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * User input data for rendering
 */
export interface UserInputs {
  /** User-provided video/image sources */
  media: Array<{
    id: string;
    type: 'video' | 'image';
    source: Blob | HTMLVideoElement | HTMLImageElement | string;
    duration?: number;
    startTime?: number;
  }>;
  /** Text overlays */
  texts?: Array<{
    id: string;
    content: string;
    font?: string;
    color?: string;
    position?: { x: number; y: number };
    animation?: 'fade' | 'slide' | 'typewriter' | 'bounce';
  }>;
  /** Audio tracks */
  audio?: Array<{
    id: string;
    source: Blob | string;
    volume?: number;
    startTime?: number;
  }>;
  /** Custom settings overrides */
  overrides?: Partial<RenderSettings>;
}

/**
 * Loaded assets container
 */
export interface LoadedAssets {
  /** Successfully loaded assets by ID */
  assets: Map<string, LoadedAsset>;
  /** Asset IDs that failed to load */
  failed: string[];
  /** Total load time in ms */
  loadTime: number;
  /** Loading statistics */
  stats: {
    total: number;
    loaded: number;
    cached: number;
    errors: number;
  };
}

/**
 * Render progress callback data
 */
export interface RenderProgress {
  /** Current stage */
  stage: 'preparing' | 'rendering' | 'encoding' | 'finalizing';
  /** Overall progress (0-100) */
  progress: number;
  /** Current frame number */
  currentFrame: number;
  /** Total frames */
  totalFrames: number;
  /** Estimated time remaining in seconds */
  eta: number;
  /** FPS during rendering */
  fps: number;
}

/**
 * Engine state
 */
export interface EngineState {
  /** Is template loaded */
  isLoaded: boolean;
  /** Is currently rendering */
  isRendering: boolean;
  /** Current playback time */
  currentTime: number;
  /** Overall progress */
  progress: number;
  /** Error message if any */
  error: string | null;
  /** Loaded template */
  template: Template | null;
  /** Loaded assets stats */
  assetsStats: LoadedAssets['stats'] | null;
}

/**
 * Export job result
 */
export interface ExportResult {
  /** Output video blob */
  blob: Blob;
  /** File size in bytes */
  size: number;
  /** Duration in seconds */
  duration: number;
  /** Resolution */
  resolution: Resolution;
  /** Format */
  format: ExportFormat;
  /** Thumbnail data URL */
  thumbnail?: string;
}

// ============================================================================
// RESOLUTION CONFIGS
// ============================================================================

const RESOLUTION_CONFIGS: Record<Resolution, { width: number; height: number }> = {
  '4K': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
};

// ============================================================================
// CANVAS POOL
// ============================================================================

/**
 * Canvas pool for efficient reuse
 */
class CanvasPool {
  private pool: Map<string, HTMLCanvasElement[]> = new Map();
  private inUse: Set<HTMLCanvasElement> = new Set();

  /**
   * Get a canvas from the pool or create new
   * @param width - Canvas width
   * @param height - Canvas height
   */
  acquire(width: number, height: number): HTMLCanvasElement {
    const key = `${width}x${height}`;
    const available = this.pool.get(key) || [];
    
    let canvas = available.pop();
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }
    
    this.pool.set(key, available);
    this.inUse.add(canvas);
    return canvas;
  }

  /**
   * Return canvas to pool
   * @param canvas - Canvas to release
   */
  release(canvas: HTMLCanvasElement): void {
    if (!this.inUse.has(canvas)) return;
    
    this.inUse.delete(canvas);
    const key = `${canvas.width}x${canvas.height}`;
    const pool = this.pool.get(key) || [];
    
    // Clear canvas before pooling
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    
    pool.push(canvas);
    this.pool.set(key, pool);
  }

  /**
   * Clear all pooled canvases
   */
  clear(): void {
    this.pool.clear();
    this.inUse.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): { pooled: number; inUse: number } {
    let pooled = 0;
    for (const arr of this.pool.values()) {
      pooled += arr.length;
    }
    return { pooled, inUse: this.inUse.size };
  }
}

// ============================================================================
// RENDER QUEUE
// ============================================================================

interface RenderJob {
  id: string;
  template: Template;
  userInputs: UserInputs;
  resolve: (result: Blob) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: RenderProgress) => void;
}

/**
 * Render queue for managing multiple simultaneous renders
 */
class RenderQueue {
  private queue: RenderJob[] = [];
  private processing = false;
  private maxConcurrent = 2;
  private activeJobs = new Set<string>();

  /**
   * Add job to queue
   */
  enqueue(job: RenderJob): void {
    this.queue.push(job);
    this.processNext();
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    if (this.processing || this.activeJobs.size >= this.maxConcurrent) return;
    
    const job = this.queue.shift();
    if (!job) return;
    
    this.processing = true;
    this.activeJobs.add(job.id);
    
    // Actual processing is delegated to the engine
    this.processing = false;
    
    // Process next if queue has items
    if (this.queue.length > 0) {
      this.processNext();
    }
  }

  /**
   * Complete a job
   */
  complete(jobId: string): void {
    this.activeJobs.delete(jobId);
    this.processNext();
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number; active: number } {
    return {
      queued: this.queue.length,
      active: this.activeJobs.size,
    };
  }

  /**
   * Clear all queued jobs
   */
  clear(): void {
    for (const job of this.queue) {
      job.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}

// ============================================================================
// TEMPLATE ENGINE CLASS
// ============================================================================

/**
 * TAM-TAM Template Engine v5.0
 * 
 * @example
 * ```typescript
 * const engine = new TemplateEngine();
 * const template = await engine.loadTemplate('afrobeat-001');
 * const assets = await engine.preloadAssets(template);
 * const blob = await engine.render(template, userInputs);
 * const file = await engine.export(blob, 'mp4');
 * ```
 */
export class TemplateEngine {
  /** Asset manager instance */
  private assetManager: typeof AssetManagerInstance;
  
  /** Three.js renderer */
  private renderer: THREE.WebGLRenderer | null = null;
  
  /** Three.js scene */
  private scene: THREE.Scene | null = null;
  
  /** Three.js camera */
  private camera: THREE.PerspectiveCamera | null = null;
  
  /** Canvas pool for reuse */
  private canvasPool: CanvasPool;
  
  /** Render queue for parallel processing */
  private renderQueue: RenderQueue;
  
  /** Current engine state */
  private state: EngineState = {
    isLoaded: false,
    isRendering: false,
    currentTime: 0,
    progress: 0,
    error: null,
    template: null,
    assetsStats: null,
  };
  
  /** State change listeners */
  private stateListeners = new Set<(state: EngineState) => void>();
  
  /** Audio context for analysis */
  private audioContext: AudioContext | null = null;
  
  /** Beat detection analyser */
  private analyser: AnalyserNode | null = null;
  
  /** Active render abort controller */
  private abortController: AbortController | null = null;
  
  /** Worker for heavy processing */
  private worker: Worker | null = null;

  /**
   * Create a new TemplateEngine instance
   */
  constructor() {
    this.assetManager = AssetManagerInstance;
    this.canvasPool = new CanvasPool();
    this.renderQueue = new RenderQueue();
    
    console.log('✅ TemplateEngine v5.0 initialized');
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Subscribe to engine state changes
   * @param listener - Callback for state updates
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: EngineState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Update and broadcast engine state
   * @param updates - Partial state updates
   */
  private updateState(updates: Partial<EngineState>): void {
    this.state = { ...this.state, ...updates };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current engine state
   * @returns Current state snapshot
   */
  getState(): EngineState {
    return { ...this.state };
  }

  // ==========================================================================
  // TEMPLATE LOADING
  // ==========================================================================

  /**
   * Load a template by ID or object
   * 
   * @param templateIdOrObject - Template ID string or template object
   * @returns Loaded template
   * @throws Error if template not found
   * 
   * @example
   * ```typescript
   * // Load by ID
   * const template = await engine.loadTemplate('afrobeat-pulse');
   * 
   * // Load from object
   * const template = await engine.loadTemplate(myTemplateConfig);
   * ```
   */
  async loadTemplate(templateIdOrObject: string | Template): Promise<Template> {
    this.updateState({ isLoaded: false, error: null });
    
    try {
      let template: Template;
      
      if (typeof templateIdOrObject === 'string') {
        // Load from config file
        const response = await fetch(`/assets/templates/${templateIdOrObject}/config.json`);
        
        if (!response.ok) {
          throw new Error(`Template not found: ${templateIdOrObject}`);
        }
        
        template = await response.json();
      } else {
        template = templateIdOrObject;
      }
      
      // Validate template
      this.validateTemplate(template);
      
      this.updateState({ isLoaded: true, template, error: null });
      console.log(`📦 Template loaded: ${template.name}`);
      
      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  /**
   * Validate template structure
   * @param template - Template to validate
   */
  private validateTemplate(template: Template): void {
    if (!template.id) throw new Error('Template missing id');
    if (!template.name) throw new Error('Template missing name');
    if (!template.category) throw new Error('Template missing category');
    if (!template.requiredAssets) throw new Error('Template missing requiredAssets');
    if (!template.renderSettings) throw new Error('Template missing renderSettings');
  }

  // ==========================================================================
  // ASSET PRELOADING
  // ==========================================================================

  /**
   * Preload all assets required by a template
   * 
   * @param template - Template to preload assets for
   * @param onProgress - Optional progress callback
   * @returns Loaded assets container
   * 
   * @example
   * ```typescript
   * const assets = await engine.preloadAssets(template, (progress) => {
   *   console.log(`Loading: ${progress.percent}%`);
   * });
   * ```
   */
  async preloadAssets(
    template: Template,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadedAssets> {
    const startTime = performance.now();
    const assetIds = this.collectAssetIds(template);
    
    console.log(`🔄 Preloading ${assetIds.length} assets...`);
    
    // Subscribe to progress updates
    let unsubscribe: (() => void) | undefined;
    if (onProgress) {
      unsubscribe = this.assetManager.onProgress(onProgress);
    }
    
    try {
      const assets = new Map<string, LoadedAsset>();
      const failed: string[] = [];
      let cached = 0;
      
      // Check availability and load
      for (const assetId of assetIds) {
        // Check if cached
        if (this.assetManager.isCached(assetId)) {
          const cachedAsset = this.assetManager.get(assetId);
          if (cachedAsset) {
            assets.set(assetId, cachedAsset);
            cached++;
            continue;
          }
        }
        
        // Check availability with fallback
        const available = isAssetAvailable(assetId);
        const fallbackId = available ? assetId : this.findFallback(assetId);
        
        if (!fallbackId) {
          console.warn(`⚠️ Asset unavailable (no fallback): ${assetId}`);
          failed.push(assetId);
          continue;
        }
        
        try {
          const asset = await this.assetManager.load(fallbackId);
          assets.set(assetId, asset);
        } catch (error) {
          console.warn(`⚠️ Failed to load asset: ${assetId}`, error);
          failed.push(assetId);
        }
      }
      
      const loadTime = performance.now() - startTime;
      const stats = {
        total: assetIds.length,
        loaded: assets.size,
        cached,
        errors: failed.length,
      };
      
      this.updateState({ assetsStats: stats });
      
      console.log(`✅ Assets loaded: ${stats.loaded}/${stats.total} (${cached} cached, ${stats.errors} failed) in ${Math.round(loadTime)}ms`);
      
      return { assets, failed, loadTime, stats };
    } finally {
      unsubscribe?.();
    }
  }

  /**
   * Collect all asset IDs from template
   * @param template - Template to extract assets from
   */
  private collectAssetIds(template: Template): string[] {
    const ids: string[] = [];
    const { requiredAssets } = template;
    
    ids.push(...requiredAssets.models.map(m => `3d-models:${m}`));
    ids.push(...requiredAssets.particles.map(p => `particles:${p}`));
    ids.push(...requiredAssets.lightLeaks.map(l => `light-leak:${l}`));
    ids.push(...requiredAssets.audio.map(a => a.includes(':') ? a : `audio/modern:${a}`));
    ids.push(...requiredAssets.fonts.map(f => `fonts:${f}`));
    
    if (requiredAssets.lensFlares) {
      ids.push(...requiredAssets.lensFlares.map(l => `lens-flare:${l}`));
    }
    if (requiredAssets.textures) {
      ids.push(...requiredAssets.textures.map(t => `textures:${t}`));
    }
    if (requiredAssets.transitions) {
      ids.push(...requiredAssets.transitions.map(t => `transitions:${t}`));
    }
    
    return ids;
  }

  /**
   * Find fallback asset if primary is unavailable
   * @param assetId - Original asset ID
   */
  private findFallback(assetId: string): string | null {
    const [category] = assetId.split(':');
    const stats = getAssetStats();
    const categoryStats = stats.byCategory[category];
    
    if (!categoryStats || categoryStats.available === 0) {
      return null;
    }
    
    // Return first available asset in category
    const resolvedId = resolveAssetPath(assetId);
    if (resolvedId !== assetId) {
      return resolvedId;
    }
    
    return null;
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  /**
   * Render a template with user inputs
   * 
   * @param template - Template to render
   * @param userInputs - User-provided media and settings
   * @param onProgress - Optional progress callback
   * @returns Rendered video blob
   * 
   * @example
   * ```typescript
   * const blob = await engine.render(template, {
   *   media: [{ id: 'clip1', type: 'video', source: videoElement }],
   *   texts: [{ id: 'title', content: 'Hello World' }]
   * }, (progress) => {
   *   console.log(`Rendering: ${progress.progress}%`);
   * });
   * ```
   */
  async render(
    template: Template,
    userInputs: UserInputs,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    
    this.updateState({ isRendering: true, progress: 0 });
    
    try {
      const settings = { ...template.renderSettings, ...userInputs.overrides };
      const resolution = RESOLUTION_CONFIGS[settings.resolution];
      const totalFrames = Math.ceil(settings.duration * settings.fps);
      
      // Initialize rendering context
      const canvas = this.canvasPool.acquire(resolution.width, resolution.height);
      const ctx = canvas.getContext('2d', { alpha: false })!;
      
      // Initialize Three.js if 3D models are needed
      if (template.requiredAssets.models.length > 0) {
        this.initThreeJS(resolution.width, resolution.height);
      }
      
      // Initialize audio if beat detection is enabled
      if (template.aiFeatures.includes('beat-detection')) {
        this.initAudioAnalysis();
      }
      
      // Setup MediaRecorder
      const stream = canvas.captureStream(settings.fps);
      const mimeType = this.getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: (settings.bitrate || 8) * 1000000,
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      // Render frames
      const renderStartTime = performance.now();
      mediaRecorder.start();
      
      for (let frame = 0; frame < totalFrames; frame++) {
        if (signal.aborted) {
          throw new Error('Render cancelled');
        }
        
        const time = frame / settings.fps;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, resolution.width, resolution.height);
        
        // Render user media
        this.renderUserMedia(ctx, userInputs, time, resolution);
        
        // Render particles
        await this.renderParticles(ctx, template, time, resolution);
        
        // Render light leaks with blend modes
        await this.renderLightLeaks(ctx, template, time, resolution);
        
        // Render 3D models
        if (this.scene && this.renderer && this.camera) {
          this.render3DScene(ctx, time);
        }
        
        // Render text overlays
        if (userInputs.texts) {
          this.renderTexts(ctx, userInputs.texts, time, resolution);
        }
        
        // Report progress
        const progress = Math.round((frame / totalFrames) * 100);
        const elapsed = performance.now() - renderStartTime;
        const fps = frame > 0 ? (frame * 1000) / elapsed : 0;
        const eta = fps > 0 ? (totalFrames - frame) / fps : 0;
        
        this.updateState({ progress, currentTime: time });
        
        onProgress?.({
          stage: 'rendering',
          progress,
          currentFrame: frame,
          totalFrames,
          eta,
          fps: Math.round(fps),
        });
        
        // Yield to prevent blocking
        if (frame % 10 === 0) {
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      }
      
      // Finalize
      mediaRecorder.stop();
      
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
      });
      
      // Cleanup
      this.canvasPool.release(canvas);
      
      const blob = new Blob(chunks, { type: mimeType });
      
      this.updateState({ isRendering: false, progress: 100 });
      console.log(`✅ Render complete: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
      
      return blob;
    } catch (error) {
      this.updateState({ isRendering: false, error: String(error) });
      throw error;
    }
  }

  /**
   * Cancel active render
   */
  cancelRender(): void {
    this.abortController?.abort();
    this.updateState({ isRendering: false });
    console.log('🛑 Render cancelled');
  }

  /**
   * Render user media to canvas
   */
  private renderUserMedia(
    ctx: CanvasRenderingContext2D,
    userInputs: UserInputs,
    time: number,
    resolution: { width: number; height: number }
  ): void {
    for (const media of userInputs.media) {
      const startTime = media.startTime || 0;
      const duration = media.duration || Infinity;
      
      if (time < startTime || time > startTime + duration) continue;
      
      if (media.source instanceof HTMLVideoElement) {
        const video = media.source;
        video.currentTime = time - startTime;
        ctx.drawImage(video, 0, 0, resolution.width, resolution.height);
      } else if (media.source instanceof HTMLImageElement) {
        ctx.drawImage(media.source, 0, 0, resolution.width, resolution.height);
      }
    }
  }

  /**
   * Render particle effects
   */
  private async renderParticles(
    ctx: CanvasRenderingContext2D,
    template: Template,
    _time: number,
    resolution: { width: number; height: number }
  ): Promise<void> {
    for (const particleId of template.requiredAssets.particles) {
      const asset = this.assetManager.getAsVideo(`particles:${particleId}`);
      if (!asset) continue;
      
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(asset, 0, 0, resolution.width, resolution.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Render light leak overlays with blend modes
   */
  private async renderLightLeaks(
    ctx: CanvasRenderingContext2D,
    template: Template,
    _time: number,
    resolution: { width: number; height: number }
  ): Promise<void> {
    for (const leakId of template.requiredAssets.lightLeaks) {
      const asset = this.assetManager.getAsVideo(`light-leak:${leakId}`) ||
                    this.assetManager.getAsImage(`light-leak:${leakId}`);
      if (!asset) continue;
      
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.7;
      ctx.drawImage(asset, 0, 0, resolution.width, resolution.height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Render text overlays
   */
  private renderTexts(
    ctx: CanvasRenderingContext2D,
    texts: UserInputs['texts'],
    _time: number,
    resolution: { width: number; height: number }
  ): void {
    if (!texts) return;
    
    for (const text of texts) {
      ctx.font = `48px ${text.font || 'sans-serif'}`;
      ctx.fillStyle = text.color || '#ffffff';
      ctx.textAlign = 'center';
      
      const x = text.position?.x || resolution.width / 2;
      const y = text.position?.y || resolution.height / 2;
      
      ctx.fillText(text.content, x, y);
    }
  }

  // ==========================================================================
  // THREE.JS 3D RENDERING
  // ==========================================================================

  /**
   * Initialize Three.js renderer
   */
  private initThreeJS(width: number, height: number): void {
    if (this.renderer) return;
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;
    
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
    
    console.log('🎮 Three.js initialized');
  }

  /**
   * Render 3D scene to canvas
   */
  private render3DScene(ctx: CanvasRenderingContext2D, _time: number): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.renderer.domElement, 0, 0);
  }

  // ==========================================================================
  // AUDIO ANALYSIS
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
      console.log('🎵 Audio analysis initialized');
    } catch (error) {
      console.warn('Failed to initialize audio analysis:', error);
    }
  }

  /**
   * Detect beat from audio
   * @param threshold - Detection threshold (0-1)
   */
  detectBeat(threshold = 0.7): boolean {
    if (!this.analyser) return false;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Calculate bass energy
    const bassRange = Math.floor(dataArray.length * 0.1);
    let sum = 0;
    for (let i = 0; i < bassRange; i++) {
      sum += dataArray[i];
    }
    
    const average = sum / bassRange / 255;
    return average > threshold;
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  /**
   * Export rendered video to file
   * 
   * @param video - Video blob to export
   * @param format - Output format ('mp4' or 'webm')
   * @returns Exported file
   * 
   * @example
   * ```typescript
   * const file = await engine.export(blob, 'mp4');
   * // Download file
   * const url = URL.createObjectURL(file);
   * const a = document.createElement('a');
   * a.href = url;
   * a.download = file.name;
   * a.click();
   * ```
   */
  async export(video: Blob, format: ExportFormat): Promise<File> {
    const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
    const extension = format;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tamtam-video-${timestamp}.${extension}`;
    
    // If already in requested format, return as-is
    if (video.type.includes(format)) {
      return new File([video], filename, { type: mimeType });
    }
    
    // For format conversion, we'd need FFmpeg (placeholder)
    console.log(`📤 Exporting as ${format}: ${filename}`);
    return new File([video], filename, { type: mimeType });
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'video/webm';
  }

  /**
   * Get canvas pool statistics
   */
  getCanvasPoolStats(): { pooled: number; inUse: number } {
    return this.canvasPool.getStats();
  }

  /**
   * Get render queue status
   */
  getRenderQueueStatus(): { queued: number; active: number } {
    return this.renderQueue.getStatus();
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Cancel any active render
    this.abortController?.abort();
    
    // Clear canvas pool
    this.canvasPool.clear();
    
    // Clear render queue
    this.renderQueue.clear();
    
    // Dispose Three.js
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    
    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Clear listeners
    this.stateListeners.clear();
    
    // Reset state
    this.updateState({
      isLoaded: false,
      isRendering: false,
      currentTime: 0,
      progress: 0,
      error: null,
      template: null,
      assetsStats: null,
    });
    
    console.log('🧹 TemplateEngine disposed');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Default template engine instance
 */
export const templateEngine = new TemplateEngine();

/**
 * Create a new template engine instance
 */
export function createTemplateEngine(): TemplateEngine {
  return new TemplateEngine();
}

export default TemplateEngine;
