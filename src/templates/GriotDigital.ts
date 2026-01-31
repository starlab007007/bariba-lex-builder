/**
 * Griot Digital Template - v3.1 FIXED
 * Cross-browser fullscreen rendering with REAL premium assets
 * Fixes: Safari audio, MOV→WebM, lens-flare local paths, user media
 */

import { AssetLoader3D } from '@/lib/AssetLoader3D';
import { ParticleSystemManager } from '@/lib/ParticleSystemManager';
import { AudioSyncEngine } from '@/lib/AudioSyncEngine';
import { SUPABASE_ASSET_CDN_URL } from '@/lib/AssetRealMapping';

// ============================================================================
// TYPES
// ============================================================================

export interface GriotDigitalInputs {
  audioNarration: File;
  language?: 'bariba' | 'french' | 'auto';
  photos?: File[];
  videoFile?: File;
  interactiveMode?: boolean;
  style?: 'traditional' | 'modern' | 'fantasy' | 'historical';
  customTitle?: string;
  includeSubtitles?: boolean;
  subtitleLanguage?: 'bariba' | 'french' | 'both';
}

export interface TimelineSegment {
  id: string;
  startTime: number;
  endTime: number;
  type: 'intro' | 'content' | 'climax' | 'outro';
  effects: string[];
}

export interface BranchPoint {
  id: string;
  time: number;
  options: {
    label: string;
    nextSegment: string;
  }[];
}

export type RenderProgressCallback = (progress: number, stage: string) => void;

/** Render result */
export interface RenderResult {
  video: Blob;
  thumbnail: Blob;
  duration: number;
  metadata: {
    title: string;
    language: string;
    interactive: boolean;
    branchPoints?: BranchPoint[];
    segments: number;
  };
}

// ============================================================================
// RENDER CONFIGURATION - FULLSCREEN PORTRAIT 1080x1920
// ============================================================================

const RENDER_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 24,
  maxDuration: 60,
  videoBitrate: '6M',
  audioBitrate: '192k'
};

// ============================================================================
// CDN ASSET URLS - FICHIERS RÉELS VÉRIFIÉS
// ============================================================================

const CDN_BASE = SUPABASE_ASSET_CDN_URL;

// Light Leaks - WebM files in 3d-models folder (cross-folder mapping)
const LIGHT_LEAK_ASSETS = [
  `${CDN_BASE}/3d-models/leak-001.webm`,
  `${CDN_BASE}/3d-models/leak-003.webm`,
  `${CDN_BASE}/3d-models/leak-006.webm`,
  `${CDN_BASE}/3d-models/leak-010.webm`,
  `${CDN_BASE}/3d-models/leak-014.webm`,
];

// Particles - WebM files (NOT MOV - MOV not supported on Chrome Android)
const PARTICLE_ASSETS = [
  `${CDN_BASE}/3d-models/leak-015.webm`,
  `${CDN_BASE}/3d-models/leak-018.webm`,
  `${CDN_BASE}/3d-models/leak-020.webm`,
];

// Textures - MP4 files (video-XXX renamed to texture-XXX in mapping)
const TEXTURE_ASSETS = [
  `${CDN_BASE}/textures/video-001.mp4`,
  `${CDN_BASE}/textures/video-003.mp4`,
  `${CDN_BASE}/textures/video-005.mp4`,
];

// Transitions - MP4 files
const TRANSITION_ASSETS = [
  `${CDN_BASE}/transitions/transition-014.mp4`,
  `${CDN_BASE}/transitions/transition-018.mp4`,
  `${CDN_BASE}/transitions/transition-022.mp4`,
];

// Lens Flares - LOCAL PNG files (NOT CDN!)
const LENS_FLARE_ASSETS = [
  '/assets/envato/lens-flare/flare-015.png',
  '/assets/envato/lens-flare/flare-020.png',
  '/assets/envato/lens-flare/flare-025.png',
  '/assets/envato/lens-flare/flare-030.png',
];

// ============================================================================
// GRIOT DIGITAL TEMPLATE DEFINITION (simplified - no Template interface)
// ============================================================================

export const GriotDigitalTemplate = {
  id: 'griot-digital',
  name: 'Griot Digital - Contes Visuels',
  category: 'storytelling',
  description: 'Transforme vos contenus en expériences visuelles immersives fullscreen avec effets premium',
  descriptionBa: 'Yí kɔ̀gbè sɔ́ wɛ̀rɛ̀ mɔ̀ 3D dó kpɔ́n',
  thumbnail: '/templates/griot-digital-preview.jpg',
  demoVideo: '/templates/griot-digital-demo.mp4',
  effects: [],
  tags: ['storytelling', 'griot', 'premium', 'fullscreen', 'cultural', 'bariba'],
};

// ============================================================================
// GRIOT DIGITAL ENGINE - v3.1 CROSS-BROWSER FIXED
// ============================================================================

export class GriotDigitalEngine {
  private assetLoader: AssetLoader3D;
  private particleManager: ParticleSystemManager;
  private audioEngine: AudioSyncEngine;
  
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Premium VFX assets
  private lightLeakVideos: HTMLVideoElement[] = [];
  private particleVideos: HTMLVideoElement[] = [];
  private textureVideos: HTMLVideoElement[] = [];
  private transitionVideos: HTMLVideoElement[] = [];
  private lensFlareImages: HTMLImageElement[] = [];
  
  // User content
  private userPhotos: HTMLImageElement[] = [];
  private userVideo: HTMLVideoElement | null = null;
  private userAudioBlob: Blob | null = null;
  private userAudioBuffer: AudioBuffer | null = null;
  
  // State
  private assetsLoaded: boolean = false;
  private storyTitle: string = '';
  private currentStyle: string = 'traditional';
  
  // Audio context for cross-browser support
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.assetLoader = new AssetLoader3D();
    this.particleManager = new ParticleSystemManager();
    this.audioEngine = new AudioSyncEngine();
  }

  /**
   * Initialize the rendering canvas
   */
  public async initialize(): Promise<void> {
    console.log('[GriotDigital v3.1] Initializing FULLSCREEN engine (1080x1920)...');
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = RENDER_CONFIG.width;
    this.canvas.height = RENDER_CONFIG.height;
    
    this.ctx = this.canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false 
    });
    
    if (!this.ctx) {
      throw new Error('Failed to create 2D canvas context');
    }
    
    console.log('[GriotDigital v3.1] Canvas initialized:', RENDER_CONFIG.width, 'x', RENDER_CONFIG.height);
  }

  /**
   * Load all premium assets from CDN with validation
   */
  public async loadAssets(
    onProgress?: (progress: number, asset: string) => void
  ): Promise<void> {
    console.log('[GriotDigital v3.1] Loading premium assets...');
    
    const totalAssets = LIGHT_LEAK_ASSETS.length + PARTICLE_ASSETS.length + 
                        TEXTURE_ASSETS.length + LENS_FLARE_ASSETS.length +
                        TRANSITION_ASSETS.length;
    let loaded = 0;
    
    onProgress?.(0, 'Chargement des effets visuels...');

    // Load Light Leaks (CDN WebM)
    console.log('[GriotDigital v3.1] Loading Light Leaks...');
    for (const url of LIGHT_LEAK_ASSETS) {
      const video = await this.loadVideoAssetWithValidation(url);
      if (video) this.lightLeakVideos.push(video);
      loaded++;
      onProgress?.(loaded / totalAssets, `Light Leak ${this.lightLeakVideos.length}`);
    }
    console.log(`[GriotDigital v3.1] ✅ Light Leaks: ${this.lightLeakVideos.length}`);

    // Load Particles (CDN WebM)
    console.log('[GriotDigital v3.1] Loading Particles...');
    for (const url of PARTICLE_ASSETS) {
      const video = await this.loadVideoAssetWithValidation(url);
      if (video) this.particleVideos.push(video);
      loaded++;
      onProgress?.(loaded / totalAssets, `Particles ${this.particleVideos.length}`);
    }
    console.log(`[GriotDigital v3.1] ✅ Particles: ${this.particleVideos.length}`);

    // Load Textures (CDN MP4)
    console.log('[GriotDigital v3.1] Loading Textures...');
    for (const url of TEXTURE_ASSETS) {
      const video = await this.loadVideoAssetWithValidation(url);
      if (video) this.textureVideos.push(video);
      loaded++;
      onProgress?.(loaded / totalAssets, `Textures ${this.textureVideos.length}`);
    }
    console.log(`[GriotDigital v3.1] ✅ Textures: ${this.textureVideos.length}`);

    // Load Transitions (CDN MP4)
    console.log('[GriotDigital v3.1] Loading Transitions...');
    for (const url of TRANSITION_ASSETS) {
      const video = await this.loadVideoAssetWithValidation(url);
      if (video) this.transitionVideos.push(video);
      loaded++;
      onProgress?.(loaded / totalAssets, `Transitions ${this.transitionVideos.length}`);
    }
    console.log(`[GriotDigital v3.1] ✅ Transitions: ${this.transitionVideos.length}`);

    // Load Lens Flares (LOCAL PNG)
    console.log('[GriotDigital v3.1] Loading Lens Flares (local)...');
    for (const url of LENS_FLARE_ASSETS) {
      const img = await this.loadImageAsset(url);
      if (img) this.lensFlareImages.push(img);
      loaded++;
      onProgress?.(loaded / totalAssets, `Lens Flares ${this.lensFlareImages.length}`);
    }
    console.log(`[GriotDigital v3.1] ✅ Lens Flares: ${this.lensFlareImages.length}`);

    this.assetsLoaded = true;
    
    console.log('[GriotDigital v3.1] 🎬 ASSETS LOADED:', {
      lightLeaks: this.lightLeakVideos.length,
      particles: this.particleVideos.length,
      textures: this.textureVideos.length,
      transitions: this.transitionVideos.length,
      lensFlares: this.lensFlareImages.length
    });
    
    onProgress?.(1, 'Assets prêts!');
  }

  /**
   * Load video with validation (readyState >= 2)
   */
  private loadVideoAssetWithValidation(url: string): Promise<HTMLVideoElement | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      const filename = url.substring(url.lastIndexOf('/') + 1);
      console.log(`[GriotDigital v3.1] Loading: ${filename}`);
      
      const timeout = setTimeout(() => {
        console.warn(`[GriotDigital v3.1] ⏱️ Timeout: ${filename}`);
        resolve(null);
      }, 15000);
      
      video.oncanplaythrough = () => {
        clearTimeout(timeout);
        // Start playback immediately for smooth rendering
        video.play().catch(() => {});
        console.log(`[GriotDigital v3.1] ✅ Ready: ${filename} (${video.videoWidth}x${video.videoHeight})`);
        resolve(video);
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        console.error(`[GriotDigital v3.1] ❌ Failed: ${filename}`);
        resolve(null);
      };
      
      video.src = url;
      video.load();
    });
  }

  /**
   * Load image asset
   */
  private loadImageAsset(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const filename = url.substring(url.lastIndexOf('/') + 1);
      
      const timeout = setTimeout(() => {
        console.warn(`[GriotDigital v3.1] ⏱️ Image timeout: ${filename}`);
        resolve(null);
      }, 8000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`[GriotDigital v3.1] ✅ Image: ${filename}`);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`[GriotDigital v3.1] ❌ Image failed: ${filename}`);
        resolve(null);
      };
      
      img.src = url;
    });
  }

  /**
   * Load user content (photos, video, audio)
   */
  private async loadUserContent(inputs: GriotDigitalInputs): Promise<void> {
    console.log('[GriotDigital v3.1] 🎬 Loading user content...');
    
    // Store audio blob
    this.userAudioBlob = inputs.audioNarration;
    console.log(`[GriotDigital v3.1] ✅ Audio: ${(inputs.audioNarration.size / 1024).toFixed(1)} KB, type: ${inputs.audioNarration.type}`);
    
    // Decode audio to AudioBuffer for cross-browser support (Safari!)
    try {
      this.audioContext = new AudioContext();
      const arrayBuffer = await inputs.audioNarration.arrayBuffer();
      this.userAudioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log(`[GriotDigital v3.1] ✅ AudioBuffer decoded: ${this.userAudioBuffer.duration.toFixed(1)}s`);
    } catch (e) {
      console.warn('[GriotDigital v3.1] ⚠️ AudioBuffer decode failed, will use MediaElement fallback');
    }
    
    // Load user photos
    if (inputs.photos && inputs.photos.length > 0) {
      console.log(`[GriotDigital v3.1] 📷 Loading ${inputs.photos.length} photos...`);
      
      for (const file of inputs.photos) {
        const img = await this.loadUserPhoto(file);
        if (img) {
          this.userPhotos.push(img);
          console.log(`[GriotDigital v3.1] ✅ Photo: ${file.name} (${img.width}x${img.height})`);
        }
      }
      console.log(`[GriotDigital v3.1] 📷 Photos loaded: ${this.userPhotos.length}`);
    }
    
    // Load user video
    if (inputs.videoFile) {
      console.log('[GriotDigital v3.1] 🎥 Loading user video...');
      this.userVideo = await this.loadUserVideo(inputs.videoFile);
      if (this.userVideo) {
        console.log(`[GriotDigital v3.1] ✅ Video: ${this.userVideo.videoWidth}x${this.userVideo.videoHeight}`);
      }
    }
    
    console.log('[GriotDigital v3.1] 🎬 User content ready:', {
      photos: this.userPhotos.length,
      hasVideo: !!this.userVideo,
      hasAudio: !!this.userAudioBlob,
      hasAudioBuffer: !!this.userAudioBuffer
    });
  }

  private loadUserPhoto(file: File): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => resolve(img);
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      img.src = objectUrl;
    });
  }

  private loadUserVideo(file: File): Promise<HTMLVideoElement | null> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve(null);
        return;
      }
      
      const video = document.createElement('video');
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      const objectUrl = URL.createObjectURL(file);
      
      video.onloadeddata = () => {
        video.play().catch(() => {});
        resolve(video);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      video.src = objectUrl;
    });
  }

  /**
   * Main render method
   */
  public async render(
    inputs: GriotDigitalInputs,
    onProgress?: RenderProgressCallback
  ): Promise<RenderResult> {
    console.log('[GriotDigital v3.1] Starting render pipeline...');
    
    if (!this.canvas || !this.ctx) {
      throw new Error('Engine not initialized');
    }

    this.currentStyle = inputs.style || 'traditional';
    this.storyTitle = inputs.customTitle || 'Griot Digital';
    
    onProgress?.(0.05, 'Chargement du contenu...');
    
    // Load user content
    await this.loadUserContent(inputs);

    onProgress?.(0.10, 'Analyse audio...');

    // Get audio duration
    const audioDuration = this.userAudioBuffer 
      ? this.userAudioBuffer.duration
      : await this.getAudioDuration(inputs.audioNarration);
    const totalDuration = Math.min(audioDuration, RENDER_CONFIG.maxDuration);
    
    console.log(`[GriotDigital v3.1] Duration: ${totalDuration.toFixed(1)}s`);

    onProgress?.(0.15, 'Préparation des assets...');

    // Wait for assets
    if (!this.assetsLoaded) {
      await this.waitForAssets(12000);
    }

    onProgress?.(0.20, 'Rendu vidéo avec effets premium...');

    // Render video
    const video = await this.renderVideo(totalDuration, onProgress);

    onProgress?.(0.95, 'Génération miniature...');

    // Generate thumbnail
    const thumbnail = await this.generateThumbnail();

    onProgress?.(1.0, 'Terminé!');
    
    console.log('[GriotDigital v3.1] ✅ Render complete!');

    return {
      video,
      thumbnail,
      duration: totalDuration,
      metadata: {
        title: this.storyTitle,
        language: inputs.language || 'auto',
        interactive: inputs.interactiveMode || false,
        segments: Math.ceil(totalDuration / 10)
      }
    };
  }

  private async waitForAssets(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    while (!this.assetsLoaded && Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Render video with MediaRecorder - CROSS-BROWSER AUDIO FIX
   */
  private async renderVideo(
    durationSeconds: number,
    onProgress?: RenderProgressCallback
  ): Promise<Blob> {
    console.log(`[GriotDigital v3.1] 🎬 Rendering: ${durationSeconds.toFixed(1)}s @ ${RENDER_CONFIG.fps}fps`);
    console.log(`[GriotDigital v3.1] 📊 Content: ${this.userPhotos.length} photos, video=${!!this.userVideo}, audioBuffer=${!!this.userAudioBuffer}`);
    console.log(`[GriotDigital v3.1] 📊 VFX: ${this.lightLeakVideos.length} leaks, ${this.particleVideos.length} particles, ${this.lensFlareImages.length} flares`);
    
    const canvas = this.canvas!;
    const fps = RENDER_CONFIG.fps;
    const totalFrames = Math.ceil(durationSeconds * fps);
    
    return new Promise<Blob>((resolve, reject) => {
      try {
        // Create video stream
        const stream = canvas.captureStream(fps);
        console.log(`[GriotDigital v3.1] Canvas stream: ${stream.getVideoTracks().length} video tracks`);
        
        // Add audio - USE AUDIOBUFFER for Safari support!
        if (this.userAudioBuffer && this.audioContext) {
          this.addAudioBufferToStream(stream, durationSeconds);
        } else if (this.userAudioBlob) {
          this.addAudioElementToStream(stream);
        }
        
        console.log(`[GriotDigital v3.1] Stream tracks: ${stream.getTracks().length}`);
        
        const chunks: Blob[] = [];
        
        // Use most compatible codec
        const mimeType = this.getBestMimeType();
        console.log(`[GriotDigital v3.1] Using codec: ${mimeType}`);
        
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 6000000,
          audioBitsPerSecond: 192000
        });
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          this.cleanupAudio();
          const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
          console.log(`[GriotDigital v3.1] ✅ Video: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          resolve(blob);
        };
        
        recorder.onerror = (e) => {
          console.error('[GriotDigital v3.1] ❌ MediaRecorder error:', e);
          reject(e);
        };
        
        recorder.start(100);
        console.log('[GriotDigital v3.1] 🎬 Recording started...');
        
        let currentFrame = 0;
        const frameInterval = 1000 / fps;
        
        const renderNextFrame = () => {
          if (currentFrame >= totalFrames) {
            console.log('[GriotDigital v3.1] 🎬 All frames done, stopping...');
            recorder.stop();
            return;
          }
          
          const currentTime = currentFrame / fps;
          this.drawFrame(currentTime, durationSeconds);
          currentFrame++;
          
          if (currentFrame % 12 === 0) {
            const progress = 0.20 + (currentFrame / totalFrames) * 0.70;
            onProgress?.(progress, `Rendu ${Math.round((currentFrame / totalFrames) * 100)}%`);
          }
          
          setTimeout(renderNextFrame, frameInterval);
        };
        
        renderNextFrame();
        
      } catch (error) {
        console.error('[GriotDigital v3.1] ❌ Render failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Get best supported MIME type
   */
  private getBestMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  }

  /**
   * Add audio via AudioBuffer (SAFARI COMPATIBLE!)
   */
  private audioBufferSource: AudioBufferSourceNode | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;

  private addAudioBufferToStream(stream: MediaStream, duration: number): void {
    if (!this.audioContext || !this.userAudioBuffer) return;
    
    try {
      console.log('[GriotDigital v3.1] 🔊 Using AudioBuffer (Safari compatible)');
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create source from buffer
      this.audioBufferSource = this.audioContext.createBufferSource();
      this.audioBufferSource.buffer = this.userAudioBuffer;
      
      // Create destination for stream
      this.audioDestination = this.audioContext.createMediaStreamDestination();
      
      // Connect
      this.audioBufferSource.connect(this.audioDestination);
      
      // Add audio track to video stream
      this.audioDestination.stream.getAudioTracks().forEach(track => {
        console.log(`[GriotDigital v3.1] 🔊 Adding audio track: ${track.label}`);
        stream.addTrack(track);
      });
      
      // Start playback
      this.audioBufferSource.start(0);
      console.log('[GriotDigital v3.1] ✅ AudioBuffer playback started');
      
    } catch (error) {
      console.error('[GriotDigital v3.1] ❌ AudioBuffer setup failed:', error);
    }
  }

  /**
   * Fallback: Add audio via MediaElement
   */
  private addAudioElementToStream(stream: MediaStream): void {
    if (!this.userAudioBlob) return;
    
    try {
      console.log('[GriotDigital v3.1] 🔊 Using MediaElement fallback');
      
      this.audioContext = new AudioContext();
      this.audioElement = new Audio();
      this.audioElement.src = URL.createObjectURL(this.userAudioBlob);
      this.audioElement.volume = 1.0;
      
      const source = this.audioContext.createMediaElementSource(this.audioElement);
      const destination = this.audioContext.createMediaStreamDestination();
      
      source.connect(destination);
      
      destination.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track);
      });
      
      this.audioElement.play().catch(e => {
        console.warn('[GriotDigital v3.1] ⚠️ Audio autoplay blocked:', e);
      });
      
      console.log('[GriotDigital v3.1] ✅ MediaElement audio connected');
      
    } catch (error) {
      console.error('[GriotDigital v3.1] ❌ MediaElement audio failed:', error);
    }
  }

  private cleanupAudio(): void {
    if (this.audioBufferSource) {
      try { this.audioBufferSource.stop(); } catch {}
      this.audioBufferSource = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      URL.revokeObjectURL(this.audioElement.src);
      this.audioElement = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioDestination = null;
  }

  /**
   * Draw a single frame - FULLSCREEN with ALL layers
   */
  private drawFrame(currentTime: number, totalDuration: number): void {
    const ctx = this.ctx!;
    const width = RENDER_CONFIG.width;
    const height = RENDER_CONFIG.height;
    const progress = currentTime / totalDuration;
    
    // 1. BACKGROUND - User content or gradient
    this.drawBackground(ctx, width, height, currentTime);
    
    // 2. LIGHT LEAKS - Fullscreen from CDN
    this.drawLightLeaks(ctx, width, height, currentTime);
    
    // 3. PARTICLES - Fullscreen from CDN
    this.drawParticles(ctx, width, height, currentTime);
    
    // 4. TEXTURES - Fullscreen overlay
    this.drawTextures(ctx, width, height, currentTime);
    
    // 5. LENS FLARES - From local PNG
    this.drawLensFlares(ctx, width, height, currentTime);
    
    // 6. TRANSITIONS - At segment boundaries
    this.drawTransitions(ctx, width, height, currentTime, totalDuration);
    
    // 7. TITLE (first 5 seconds)
    if (currentTime < 5) {
      this.drawTitle(ctx, width, height, currentTime);
    }
    
    // 8. PROGRESS BAR
    this.drawProgressIndicator(ctx, width, height, progress);
  }

  /**
   * Draw background - user photos/video with Ken Burns
   */
  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ): void {
    ctx.clearRect(0, 0, width, height);
    
    // Priority 1: User video
    if (this.userVideo && this.userVideo.readyState >= 2) {
      this.drawCoverFit(ctx, this.userVideo, width, height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    
    // Priority 2: User photos with Ken Burns
    if (this.userPhotos.length > 0) {
      const photoIndex = Math.floor(currentTime / 5) % this.userPhotos.length;
      const photo = this.userPhotos[photoIndex];
      
      if (photo && photo.complete && photo.naturalWidth > 0) {
        const pw = photo.naturalWidth;
        const ph = photo.naturalHeight;
        
        // Ken Burns effect
        const zoom = 1 + Math.sin(currentTime * 0.25) * 0.06;
        const scale = Math.max(width / pw, height / ph) * zoom;
        const sw = pw * scale;
        const sh = ph * scale;
        
        const panX = Math.sin(currentTime * 0.15) * 25;
        const panY = Math.cos(currentTime * 0.12) * 20;
        const sx = (width - sw) / 2 + panX;
        const sy = (height - sh) / 2 + panY;
        
        ctx.drawImage(photo, sx, sy, sw, sh);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);
        return;
      }
    }
    
    // Fallback: Animated gradient
    const hue = 25 + Math.sin(currentTime * 0.1) * 10;
    const gradient = ctx.createLinearGradient(0, 0, width * 0.3, height);
    gradient.addColorStop(0, `hsl(${hue}, 60%, 15%)`);
    gradient.addColorStop(0.5, `hsl(${hue + 10}, 70%, 10%)`);
    gradient.addColorStop(1, `hsl(${hue - 5}, 40%, 8%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Draw light leaks fullscreen
   */
  private drawLightLeaks(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ): void {
    if (this.lightLeakVideos.length === 0) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    const idx = Math.floor(currentTime / 6) % this.lightLeakVideos.length;
    const video = this.lightLeakVideos[idx];
    
    if (video && video.readyState >= 2) {
      ctx.globalAlpha = 0.5 + Math.sin(currentTime * 0.5) * 0.15;
      this.drawCoverFit(ctx, video, width, height);
    }
    
    ctx.restore();
  }

  /**
   * Draw particles fullscreen
   */
  private drawParticles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ): void {
    if (this.particleVideos.length === 0) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const idx = Math.floor(currentTime / 8) % this.particleVideos.length;
    const video = this.particleVideos[idx];
    
    if (video && video.readyState >= 2) {
      ctx.globalAlpha = 0.45;
      this.drawCoverFit(ctx, video, width, height);
    }
    
    ctx.restore();
  }

  /**
   * Draw textures fullscreen
   */
  private drawTextures(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ): void {
    if (this.textureVideos.length === 0) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    
    const video = this.textureVideos[0];
    
    if (video && video.readyState >= 2) {
      ctx.globalAlpha = 0.2;
      this.drawCoverFit(ctx, video, width, height);
    }
    
    ctx.restore();
  }

  /**
   * Draw lens flares
   */
  private drawLensFlares(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ): void {
    if (this.lensFlareImages.length === 0) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    const idx = Math.floor(currentTime / 5) % this.lensFlareImages.length;
    const flare = this.lensFlareImages[idx];
    
    if (flare && flare.complete) {
      const pulse = 1 + Math.sin(currentTime * 2) * 0.12;
      ctx.globalAlpha = 0.55 + Math.sin(currentTime * 1.5) * 0.15;
      
      const size = height * 0.22 * pulse;
      const offsetX = Math.sin(currentTime * 0.3) * 25;
      const offsetY = Math.cos(currentTime * 0.2) * 18;
      
      // Main flare top-right
      ctx.drawImage(
        flare,
        width * 0.72 - size / 2 + offsetX,
        height * 0.1 - size / 2 + offsetY,
        size,
        size
      );
      
      // Secondary flare bottom-left
      if (this.lensFlareImages.length > 1) {
        const flare2 = this.lensFlareImages[(idx + 1) % this.lensFlareImages.length];
        ctx.globalAlpha = 0.35;
        const size2 = size * 0.55;
        ctx.drawImage(
          flare2,
          width * 0.2 - size2 / 2 - offsetX,
          height * 0.78 - size2 / 2 - offsetY,
          size2,
          size2
        );
      }
    }
    
    ctx.restore();
  }

  /**
   * Draw transitions at segment boundaries
   */
  private drawTransitions(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    totalDuration: number
  ): void {
    if (this.transitionVideos.length === 0) return;
    
    const segmentDuration = 10;
    const timeInSegment = currentTime % segmentDuration;
    
    // Show transition in last 1.2 seconds
    if (timeInSegment > segmentDuration - 1.2) {
      const transIdx = Math.floor(currentTime / segmentDuration) % this.transitionVideos.length;
      const video = this.transitionVideos[transIdx];
      
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        
        const transProgress = (timeInSegment - (segmentDuration - 1.2)) / 1.2;
        ctx.globalAlpha = transProgress * 0.85;
        
        this.drawCoverFit(ctx, video, width, height);
        ctx.restore();
      }
    }
  }

  /**
   * Draw cover-fit helper
   */
  private drawCoverFit(
    ctx: CanvasRenderingContext2D,
    source: HTMLVideoElement | HTMLImageElement,
    width: number,
    height: number
  ): void {
    const sw = 'videoWidth' in source ? (source.videoWidth || width) : source.naturalWidth || source.width;
    const sh = 'videoHeight' in source ? (source.videoHeight || height) : source.naturalHeight || source.height;
    
    if (sw === 0 || sh === 0) return;
    
    const scale = Math.max(width / sw, height / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;
    
    ctx.drawImage(source, dx, dy, dw, dh);
  }

  /**
   * Draw title overlay
   */
  private drawTitle(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ): void {
    const fadeIn = Math.min(1, currentTime / 1.5);
    const fadeOut = currentTime > 3.5 ? Math.max(0, 1 - (currentTime - 3.5) / 1.5) : 1;
    const alpha = fadeIn * fadeOut;
    
    if (alpha <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.storyTitle, width / 2, height * 0.12);
    ctx.fillText(this.storyTitle, width / 2, height * 0.12);
    
    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeText('Griot Digital', width / 2, height * 0.17);
    ctx.fillText('Griot Digital', width / 2, height * 0.17);
    
    ctx.restore();
  }

  /**
   * Draw progress indicator
   */
  private drawProgressIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number
  ): void {
    ctx.save();
    
    const barWidth = width * 0.8;
    const barHeight = 4;
    const barX = (width - barWidth) / 2;
    const barY = height - 50;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    ctx.restore();
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(): Promise<Blob> {
    if (!this.canvas) return new Blob();
    
    this.drawFrame(1, 30);
    
    return new Promise((resolve) => {
      this.canvas!.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/jpeg', 0.9);
    });
  }

  /**
   * Get audio duration
   */
  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => resolve(30);
    });
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.lightLeakVideos.forEach(v => { v.pause(); v.src = ''; });
    this.particleVideos.forEach(v => { v.pause(); v.src = ''; });
    this.textureVideos.forEach(v => { v.pause(); v.src = ''; });
    this.transitionVideos.forEach(v => { v.pause(); v.src = ''; });
    
    if (this.userVideo) {
      this.userVideo.pause();
      URL.revokeObjectURL(this.userVideo.src);
    }
    
    this.cleanupAudio();
    
    this.lightLeakVideos = [];
    this.particleVideos = [];
    this.textureVideos = [];
    this.transitionVideos = [];
    this.lensFlareImages = [];
    this.userPhotos = [];
    this.userVideo = null;
    this.userAudioBlob = null;
    this.userAudioBuffer = null;
    
    this.canvas = null;
    this.ctx = null;
    this.assetsLoaded = false;
  }
}

export const griotDigitalEngine = new GriotDigitalEngine();
