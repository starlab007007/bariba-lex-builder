/**
 * GriotDigital Template - Contes Visuels Premium
 * Transforme les contenus utilisateur en expériences immersives fullscreen
 * 
 * v3.0 - FULLSCREEN 1080x1920 avec VRAIS assets CDN uniquement
 * @module GriotDigital
 */

import * as THREE from 'three';
import { aiServicesHub, StoryStructure, AudioFile, ImageFile } from '@/lib/AIServicesHub';
import { AssetLoader3D } from '@/lib/AssetLoader3D';
import { ParticleSystemManager } from '@/lib/ParticleSystemManager';
import { AudioSyncEngine, BeatTimestamp } from '@/lib/AudioSyncEngine';
import { buildResolvedAssetUrl, SUPABASE_ASSET_CDN_URL } from '@/lib/AssetRealMapping';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Template category */
export type TemplateCategory = 
  | 'storytelling'
  | 'music'
  | 'business'
  | 'education'
  | 'future'
  | 'social';

/** Render quality preset */
export type RenderQuality = '720p' | '1080p' | '4K';

/** Template interface */
export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  descriptionBa?: string;
  requiredAssets: TemplateAssets;
  renderSettings: RenderSettings;
  aiFeatures: string[];
  tags?: string[];
  previewUrl?: string;
  demoVideoUrl?: string;
}

/** Template asset requirements */
export interface TemplateAssets {
  models: string[];
  particles: string[];
  lightLeaks: string[];
  lensFlares: string[];
  textures: string[];
  transitions: string[];
  audio: string[];
  fonts: string[];
}

/** Render settings */
export interface RenderSettings {
  resolution: RenderQuality;
  fps: number;
  duration: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

/** User inputs for Griot Digital */
export interface GriotDigitalInputs {
  /** Recorded story narration audio */
  audioNarration: File;
  /** Source language */
  language: 'bariba' | 'french' | 'auto';
  /** Optional photos for visual content */
  photos?: File[];
  /** Optional video file for background */
  videoFile?: File;
  /** Enable interactive branching stories */
  interactiveMode: boolean;
  /** Story style */
  style?: 'traditional' | 'modern' | 'fantasy' | 'historical';
  /** Custom title */
  customTitle?: string;
  /** Include subtitles */
  includeSubtitles?: boolean;
  /** Subtitle language */
  subtitleLanguage?: 'bariba' | 'french' | 'both';
}

/** Branch point for interactive stories */
export interface BranchPoint {
  id: string;
  timestamp: number;
  prompt: string;
  choices: BranchChoice[];
  defaultChoice: string;
  timeout: number;
}

/** Branch choice */
export interface BranchChoice {
  id: string;
  label: string;
  labelBa?: string;
  icon?: string;
  targetSegment: number;
  preview?: string;
}

/** Story timeline segment */
export interface TimelineSegment {
  index: number;
  startTime: number;
  endTime: number;
  type: 'intro' | 'development' | 'climax' | 'resolution' | 'outro' | 'branch';
  sceneIndex: number;
  cameraAnimation: CameraAnimation;
  effects: SegmentEffect[];
  characterAnimations: CharacterAnimation[];
  textOverlays: TextOverlay[];
  audioCues: AudioCue[];
  emotion?: string;
}

/** Camera animation definition */
export interface CameraAnimation {
  type: 'static' | 'pan' | 'orbit' | 'dolly' | 'crane' | 'handheld';
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  fov?: number;
}

/** Segment effect */
export interface SegmentEffect {
  type: 'particles' | 'lightLeak' | 'lensFlare' | 'transition' | 'colorGrade';
  assetId: string;
  trigger: 'start' | 'end' | 'beat' | 'keyword';
  intensity: number;
  duration?: number;
  position?: THREE.Vector3;
}

/** Character animation */
export interface CharacterAnimation {
  characterId: string;
  animationName: string;
  startTime: number;
  duration: number;
  blendWeight: number;
  lipSync?: boolean;
}

/** Text overlay */
export interface TextOverlay {
  text: string;
  textBa?: string;
  fontId: string;
  position: { x: number; y: number };
  size: number;
  color: string;
  animation: 'fadeIn' | 'typewriter' | 'slide' | 'scale';
  duration: number;
  delay: number;
}

/** Audio cue */
export interface AudioCue {
  type: 'sfx' | 'music' | 'ambient';
  assetId: string;
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
}

/** Render progress callback */
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
  width: 1080,     // Full HD portrait width
  height: 1920,    // Full HD portrait height
  fps: 24,         // Cinematic FPS
  maxDuration: 60, // Maximum 60 seconds
  videoBitrate: '6M',
  audioBitrate: '192k'
};

// ============================================================================
// CDN ASSET URLS - VRAIS FICHIERS UNIQUEMENT
// ============================================================================

const CDN_BASE = SUPABASE_ASSET_CDN_URL;

// Light Leaks - FICHIERS RÉELS dans light-leak/
const LIGHT_LEAK_ASSETS = [
  `${CDN_BASE}/light-leak/leak-001.webm`,
  `${CDN_BASE}/light-leak/leak-003.webm`,
  `${CDN_BASE}/light-leak/leak-004.webm`,
  `${CDN_BASE}/light-leak/leak-006.webm`,
  `${CDN_BASE}/light-leak/leak-014.webm`,
];

// Particles (using light leak files as particle effects)
const PARTICLE_ASSETS = [
  `${CDN_BASE}/light-leak/leak-001.webm`,
  `${CDN_BASE}/light-leak/leak-003.webm`,
  `${CDN_BASE}/light-leak/leak-006.webm`,
];

// Textures - FICHIERS RÉELS dans textures/
const TEXTURE_ASSETS = [
  `${CDN_BASE}/textures/texture-001.mp4`,
  `${CDN_BASE}/textures/texture-005.mp4`,
  `${CDN_BASE}/textures/texture-008.mp4`,
  `${CDN_BASE}/textures/texture-012.mp4`,
];

// Transitions - FICHIERS RÉELS dans transitions/
const TRANSITION_ASSETS = [
  `${CDN_BASE}/transitions/transition-014.mp4`,
  `${CDN_BASE}/transitions/transition-018.mp4`,
  `${CDN_BASE}/transitions/transition-022.mp4`,
];

// Lens Flares (CDN - fichiers réels dans lens-flare/)
const LENS_FLARE_ASSETS = [
  `${CDN_BASE}/lens-flare/flare-015.png`,
  `${CDN_BASE}/lens-flare/flare-032.png`,
  `${CDN_BASE}/lens-flare/flare-020.png`,
  `${CDN_BASE}/lens-flare/flare-025.png`,
  `${CDN_BASE}/lens-flare/flare-030.png`,
];

// ============================================================================
// GRIOT DIGITAL TEMPLATE
// ============================================================================

export const GriotDigitalTemplate: Template = {
  id: 'griot-digital',
  name: 'Griot Digital - Contes Visuels',
  category: 'storytelling',
  description: 'Transforme vos contenus en expériences visuelles immersives fullscreen avec effets premium',
  descriptionBa: 'Yí kɔ̀gbè sɔ́ wɛ̀rɛ̀ mɔ̀ 3D dó kpɔ́n',
  
  requiredAssets: {
    models: [],
    particles: PARTICLE_ASSETS,
    lightLeaks: LIGHT_LEAK_ASSETS,
    lensFlares: LENS_FLARE_ASSETS,
    textures: TEXTURE_ASSETS,
    transitions: TRANSITION_ASSETS,
    audio: [],
    fonts: []
  },
  
  renderSettings: {
    resolution: '1080p',
    fps: 24,
    duration: 0,
    aspectRatio: '9:16'
  },
  
  aiFeatures: [
    'Story Director',
    'Photo Integration',
    'Video Background',
    'Beat Sync',
    'Auto-Subtitles',
    'Premium VFX'
  ],
  
  tags: ['storytelling', 'griot', 'premium', 'fullscreen', 'cultural', 'bariba'],
  previewUrl: '/templates/griot-digital-preview.jpg',
  demoVideoUrl: '/templates/griot-digital-demo.mp4'
};

// ============================================================================
// GRIOT DIGITAL ENGINE - v3.0 FULLSCREEN avec VRAIS ASSETS
// ============================================================================

export class GriotDigitalEngine {
  private assetLoader: AssetLoader3D;
  private particleManager: ParticleSystemManager;
  private audioEngine: AudioSyncEngine;
  
  // Canvas for rendering
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Premium VFX assets - VRAIS FICHIERS UNIQUEMENT
  private lightLeakVideos: HTMLVideoElement[] = [];
  private particleVideos: HTMLVideoElement[] = [];
  private textureVideos: HTMLVideoElement[] = [];
  private transitionVideos: HTMLVideoElement[] = [];
  private lensFlareImages: HTMLImageElement[] = [];
  
  // User content
  private userPhotos: HTMLImageElement[] = [];
  private userVideo: HTMLVideoElement | null = null;
  private userAudioBlob: Blob | null = null;
  
  // State
  private assetsLoaded: boolean = false;
  private storyTitle: string = '';
  private currentStyle: string = 'traditional';
  private timeline: TimelineSegment[] = [];
  private branchPoints: BranchPoint[] = [];

  constructor() {
    this.assetLoader = new AssetLoader3D();
    this.particleManager = new ParticleSystemManager();
    this.audioEngine = new AudioSyncEngine();
  }

  /**
   * Initialize the rendering canvas - FULLSCREEN 1080x1920
   */
  public async initialize(): Promise<void> {
    console.log('[GriotDigital v3] Initializing FULLSCREEN engine (1080x1920)...');
    
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
    
    console.log('[GriotDigital v3] Canvas initialized:', RENDER_CONFIG.width, 'x', RENDER_CONFIG.height);
  }

  /**
   * Load all REAL premium assets from CDN
   */
  public async loadAssets(
    onProgress?: (progress: number, asset: string) => void
  ): Promise<void> {
    console.log('[GriotDigital v3] Loading REAL premium assets from CDN...');
    
    const totalAssets = LIGHT_LEAK_ASSETS.length + PARTICLE_ASSETS.length + 
                        TEXTURE_ASSETS.length + LENS_FLARE_ASSETS.length +
                        TRANSITION_ASSETS.length;
    let loaded = 0;
    
    onProgress?.(0, 'Loading premium VFX...');

    // Load Light Leaks (MANDATORY - no fallback)
    console.log('[GriotDigital v3] Loading Light Leaks...');
    for (const url of LIGHT_LEAK_ASSETS) {
      try {
        const video = await this.loadVideoAsset(url);
        if (video) {
          this.lightLeakVideos.push(video);
        }
      } catch (e) {
        console.warn('[GriotDigital v3] Light leak failed:', url);
      }
      loaded++;
      onProgress?.(loaded / totalAssets, `Light Leak ${loaded}/${LIGHT_LEAK_ASSETS.length}`);
    }
    console.log(`[GriotDigital v3] ✅ Light Leaks: ${this.lightLeakVideos.length} loaded`);

    // Load Particles
    console.log('[GriotDigital v3] Loading Particles...');
    for (const url of PARTICLE_ASSETS) {
      try {
        const video = await this.loadVideoAsset(url);
        if (video) {
          this.particleVideos.push(video);
        }
      } catch (e) {
        console.warn('[GriotDigital v3] Particle failed:', url);
      }
      loaded++;
      onProgress?.(loaded / totalAssets, `Particles ${this.particleVideos.length}/${PARTICLE_ASSETS.length}`);
    }
    console.log(`[GriotDigital v3] ✅ Particles: ${this.particleVideos.length} loaded`);

    // Load Textures
    console.log('[GriotDigital v3] Loading Textures...');
    for (const url of TEXTURE_ASSETS) {
      try {
        const video = await this.loadVideoAsset(url);
        if (video) {
          this.textureVideos.push(video);
        }
      } catch (e) {
        console.warn('[GriotDigital v3] Texture failed:', url);
      }
      loaded++;
      onProgress?.(loaded / totalAssets, `Textures ${this.textureVideos.length}/${TEXTURE_ASSETS.length}`);
    }
    console.log(`[GriotDigital v3] ✅ Textures: ${this.textureVideos.length} loaded`);

    // Load Transitions
    console.log('[GriotDigital v3] Loading Transitions...');
    for (const url of TRANSITION_ASSETS) {
      try {
        const video = await this.loadVideoAsset(url);
        if (video) {
          this.transitionVideos.push(video);
        }
      } catch (e) {
        console.warn('[GriotDigital v3] Transition failed:', url);
      }
      loaded++;
      onProgress?.(loaded / totalAssets, `Transitions ${this.transitionVideos.length}`);
    }
    console.log(`[GriotDigital v3] ✅ Transitions: ${this.transitionVideos.length} loaded`);

    // Load Lens Flares (local PNG)
    console.log('[GriotDigital v3] Loading Lens Flares...');
    for (const url of LENS_FLARE_ASSETS) {
      try {
        const img = await this.loadImageAsset(url);
        if (img) {
          this.lensFlareImages.push(img);
        }
      } catch (e) {
        console.warn('[GriotDigital v3] Lens flare failed:', url);
      }
      loaded++;
      onProgress?.(loaded / totalAssets, `Lens Flares ${this.lensFlareImages.length}`);
    }
    console.log(`[GriotDigital v3] ✅ Lens Flares: ${this.lensFlareImages.length} loaded`);

    this.assetsLoaded = true;
    
    console.log('[GriotDigital v3] 🎬 PREMIUM ASSETS LOADED:', {
      lightLeaks: this.lightLeakVideos.length,
      particles: this.particleVideos.length,
      textures: this.textureVideos.length,
      transitions: this.transitionVideos.length,
      lensFlares: this.lensFlareImages.length
    });
    
    onProgress?.(1, 'Assets ready!');
  }

  /**
   * Load a video asset from URL
   */
  private loadVideoAsset(url: string): Promise<HTMLVideoElement | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      const timeout = setTimeout(() => {
        console.warn('[GriotDigital v3] ⏱️ Video timeout:', url.substring(url.lastIndexOf('/') + 1));
        resolve(null);
      }, 15000);
      
      video.onloadeddata = () => {
        clearTimeout(timeout);
        video.play().catch(() => {});
        console.log('[GriotDigital v3] ✅ Video loaded:', url.substring(url.lastIndexOf('/') + 1));
        resolve(video);
      };
      
      video.onerror = (e) => {
        clearTimeout(timeout);
        console.error('[GriotDigital v3] ❌ Video failed:', url.substring(url.lastIndexOf('/') + 1), e);
        resolve(null);
      };
      
      video.src = url;
    });
  }

  /**
   * Load an image asset from URL
   */
  private loadImageAsset(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeout = setTimeout(() => resolve(null), 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log('[GriotDigital v3] ✅ Image loaded:', url.substring(url.lastIndexOf('/') + 1));
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn('[GriotDigital v3] ❌ Image failed:', url);
        resolve(null);
      };
      
      img.src = url;
    });
  }

  /**
   * Load user content (photos, video, audio)
   */
  private async loadUserContent(inputs: GriotDigitalInputs): Promise<void> {
    console.log('[GriotDigital v3] Loading user content...');
    
    // Store audio blob
    this.userAudioBlob = inputs.audioNarration;
    
    // Load user photos
    if (inputs.photos && inputs.photos.length > 0) {
      console.log(`[GriotDigital v3] Loading ${inputs.photos.length} user photos...`);
      for (const photoFile of inputs.photos) {
        const img = await this.loadUserPhoto(photoFile);
        if (img) {
          this.userPhotos.push(img);
        }
      }
      console.log(`[GriotDigital v3] ✅ User photos loaded: ${this.userPhotos.length}`);
    }
    
    // Load user video if provided
    if (inputs.videoFile) {
      console.log('[GriotDigital v3] Loading user video...');
      this.userVideo = await this.loadUserVideo(inputs.videoFile);
      if (this.userVideo) {
        console.log('[GriotDigital v3] ✅ User video loaded');
      }
    }
  }

  /**
   * Load a user photo file
   */
  private loadUserPhoto(file: File): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(null);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Load a user video file
   */
  private loadUserVideo(file: File): Promise<HTMLVideoElement | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        video.play().catch(() => {});
        resolve(video);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Process and render the Griot Digital story
   */
  public async render(
    inputs: GriotDigitalInputs,
    onProgress?: RenderProgressCallback
  ): Promise<RenderResult> {
    console.log('[GriotDigital v3] Starting FULLSCREEN render pipeline...');
    
    if (!this.canvas || !this.ctx) {
      throw new Error('Engine not initialized');
    }

    this.currentStyle = inputs.style || 'traditional';
    this.storyTitle = inputs.customTitle || 'Griot Digital';
    
    onProgress?.(0.05, 'Loading user content...');
    
    // Load user content (photos, video, audio)
    await this.loadUserContent(inputs);

    onProgress?.(0.10, 'Analyzing audio...');

    // Analyze audio duration
    const audioDuration = await this.getAudioDuration(inputs.audioNarration);
    const totalDuration = Math.min(audioDuration, RENDER_CONFIG.maxDuration);
    
    // Load audio for beat analysis
    try {
      await this.audioEngine.loadAudioBlob(inputs.audioNarration);
      console.log('[GriotDigital v3] Audio buffer loaded for beat analysis');
    } catch (error) {
      console.warn('[GriotDigital v3] Audio analysis failed:', error);
    }

    onProgress?.(0.15, 'Waiting for assets...');

    // Wait for assets to be ready
    if (!this.assetsLoaded) {
      await this.waitForAssets(10000);
    }

    onProgress?.(0.20, 'Rendering video with premium VFX...');

    // Render the video
    const video = await this.renderVideo(totalDuration, onProgress);

    onProgress?.(0.95, 'Generating thumbnail...');

    // Generate thumbnail
    const thumbnail = await this.generateThumbnail();

    onProgress?.(1.0, 'Complete!');
    
    console.log('[GriotDigital v3] Render complete!');

    return {
      video,
      thumbnail,
      duration: totalDuration,
      metadata: {
        title: this.storyTitle,
        language: inputs.language,
        interactive: inputs.interactiveMode,
        segments: 1
      }
    };
  }

  /**
   * Wait for assets to load
   */
  private async waitForAssets(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    while (!this.assetsLoaded && Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Render video using Canvas capture with MediaRecorder
   */
  private async renderVideo(
    durationSeconds: number,
    onProgress?: RenderProgressCallback
  ): Promise<Blob> {
    console.log(`[GriotDigital v3] Rendering ${durationSeconds}s @ ${RENDER_CONFIG.fps}fps FULLSCREEN`);
    
    const canvas = this.canvas!;
    const fps = RENDER_CONFIG.fps;
    const totalFrames = Math.ceil(durationSeconds * fps);
    
    return new Promise<Blob>((resolve, reject) => {
      try {
        // Create stream from canvas
        const stream = canvas.captureStream(fps);
        
        // Add audio track if available
        if (this.userAudioBlob) {
          this.addAudioToStream(stream, this.userAudioBlob);
        }
        
        const chunks: Blob[] = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 6000000
        });
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log(`[GriotDigital v3] Video recorded: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          resolve(blob);
        };
        
        recorder.onerror = (e) => {
          console.error('[GriotDigital v3] MediaRecorder error:', e);
          reject(e);
        };
        
        recorder.start(100);
        
        let currentFrame = 0;
        const frameInterval = 1000 / fps;
        
        const renderNextFrame = () => {
          if (currentFrame >= totalFrames) {
            recorder.stop();
            return;
          }
          
          const currentTime = currentFrame / fps;
          this.drawFrame(currentTime, durationSeconds);
          currentFrame++;
          
          // Update progress
          if (currentFrame % 5 === 0) {
            const progress = 0.20 + (currentFrame / totalFrames) * 0.70;
            onProgress?.(progress, `Frame ${currentFrame}/${totalFrames}`);
          }
          
          setTimeout(renderNextFrame, frameInterval);
        };
        
        // Start rendering
        renderNextFrame();
        
      } catch (error) {
        console.error('[GriotDigital v3] Render failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Add audio track to MediaStream
   */
  private addAudioToStream(stream: MediaStream, audioBlob: Blob): void {
    try {
      const audioContext = new AudioContext();
      const audioElement = new Audio(URL.createObjectURL(audioBlob));
      audioElement.volume = 1.0; // Full volume
      
      const source = audioContext.createMediaElementSource(audioElement);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination); // Also output to speakers (optional)
      
      destination.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track);
      });
      
      audioElement.play().catch((e) => {
        console.warn('[GriotDigital v3] Audio autoplay blocked:', e);
      });
      
      console.log('[GriotDigital v3] ✅ Audio track added to stream');
    } catch (error) {
      console.warn('[GriotDigital v3] Could not add audio to stream:', error);
    }
  }

  /**
   * Draw a single frame - FULLSCREEN with REAL assets
   */
  private drawFrame(currentTime: number, totalDuration: number): void {
    const ctx = this.ctx!;
    const width = RENDER_CONFIG.width;
    const height = RENDER_CONFIG.height;
    const progress = currentTime / totalDuration;
    
    // 1. BACKGROUND LAYER - User photo/video or gradient
    this.drawBackground(ctx, width, height, currentTime);
    
    // 2. LIGHT LEAK LAYER - FULLSCREEN from CDN
    this.drawLightLeaks(ctx, width, height, currentTime);
    
    // 3. PARTICLE LAYER - FULLSCREEN from CDN
    this.drawParticles(ctx, width, height, currentTime);
    
    // 4. TEXTURE OVERLAY - FULLSCREEN from CDN
    this.drawTextures(ctx, width, height, currentTime);
    
    // 5. LENS FLARES - From PNG assets
    this.drawLensFlares(ctx, width, height, currentTime);
    
    // 6. TRANSITIONS - At segment boundaries
    this.drawTransitions(ctx, width, height, currentTime, totalDuration);
    
    // 7. TITLE OVERLAY (first 5 seconds)
    if (currentTime < 5) {
      this.drawTitle(ctx, width, height, currentTime);
    }
    
    // 8. PROGRESS INDICATOR
    this.drawProgressIndicator(ctx, width, height, progress);
  }

  /**
   * Draw background - user content or gradient
   */
  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ): void {
    // If user video is available, use it as background
    if (this.userVideo && this.userVideo.readyState >= 2) {
      // Draw video cover-fit
      const vw = this.userVideo.videoWidth;
      const vh = this.userVideo.videoHeight;
      const scale = Math.max(width / vw, height / vh);
      const sw = vw * scale;
      const sh = vh * scale;
      const sx = (width - sw) / 2;
      const sy = (height - sh) / 2;
      
      ctx.drawImage(this.userVideo, sx, sy, sw, sh);
      return;
    }
    
    // If user photos are available, cycle through them
    if (this.userPhotos.length > 0) {
      const photoIndex = Math.floor(currentTime / 5) % this.userPhotos.length;
      const photo = this.userPhotos[photoIndex];
      
      // Draw photo cover-fit with Ken Burns effect
      const pw = photo.width;
      const ph = photo.height;
      const scale = Math.max(width / pw, height / ph) * (1 + Math.sin(currentTime * 0.3) * 0.05);
      const sw = pw * scale;
      const sh = ph * scale;
      const offsetX = Math.sin(currentTime * 0.2) * 20;
      const offsetY = Math.cos(currentTime * 0.15) * 15;
      const sx = (width - sw) / 2 + offsetX;
      const sy = (height - sh) / 2 + offsetY;
      
      ctx.drawImage(photo, sx, sy, sw, sh);
      
      // Apply darkening for text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    
    // Default: Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Draw REAL light leaks FULLSCREEN
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
    
    // Cycle through light leaks based on time
    const idx = Math.floor(currentTime / 6) % this.lightLeakVideos.length;
    const video = this.lightLeakVideos[idx];
    
    if (video && video.readyState >= 2) {
      ctx.globalAlpha = 0.45 + Math.sin(currentTime * 0.5) * 0.15;
      
      // Draw FULLSCREEN cover
      const vw = video.videoWidth || width;
      const vh = video.videoHeight || height;
      const scale = Math.max(width / vw, height / vh);
      const sw = vw * scale;
      const sh = vh * scale;
      const sx = (width - sw) / 2;
      const sy = (height - sh) / 2;
      
      ctx.drawImage(video, sx, sy, sw, sh);
    }
    
    ctx.restore();
  }

  /**
   * Draw REAL particles FULLSCREEN
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
    
    // Cycle through particles
    const idx = Math.floor(currentTime / 8) % this.particleVideos.length;
    const video = this.particleVideos[idx];
    
    if (video && video.readyState >= 2) {
      ctx.globalAlpha = 0.5;
      
      // Draw FULLSCREEN
      const vw = video.videoWidth || width;
      const vh = video.videoHeight || height;
      const scale = Math.max(width / vw, height / vh);
      const sw = vw * scale;
      const sh = vh * scale;
      const sx = (width - sw) / 2;
      const sy = (height - sh) / 2;
      
      ctx.drawImage(video, sx, sy, sw, sh);
    }
    
    ctx.restore();
  }

  /**
   * Draw REAL textures FULLSCREEN
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
    
    const video = this.textureVideos[0]; // Use first texture consistently
    
    if (video && video.readyState >= 2) {
      ctx.globalAlpha = 0.2;
      
      // Draw FULLSCREEN
      const vw = video.videoWidth || width;
      const vh = video.videoHeight || height;
      const scale = Math.max(width / vw, height / vh);
      const sw = vw * scale;
      const sh = vh * scale;
      const sx = (width - sw) / 2;
      const sy = (height - sh) / 2;
      
      ctx.drawImage(video, sx, sy, sw, sh);
    }
    
    ctx.restore();
  }

  /**
   * Draw REAL lens flares
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
    
    // Main flare at top right
    const flareIdx = Math.floor(currentTime / 5) % this.lensFlareImages.length;
    const flare = this.lensFlareImages[flareIdx];
    
    const pulseScale = 1 + Math.sin(currentTime * 2) * 0.15;
    ctx.globalAlpha = 0.6 + Math.sin(currentTime * 1.5) * 0.2;
    
    const flareSize = height * 0.25 * pulseScale;
    const offsetX = Math.sin(currentTime * 0.3) * 30;
    const offsetY = Math.cos(currentTime * 0.2) * 20;
    
    // Top-right flare
    ctx.drawImage(
      flare,
      width * 0.7 - flareSize / 2 + offsetX,
      height * 0.1 - flareSize / 2 + offsetY,
      flareSize,
      flareSize
    );
    
    // Secondary smaller flare at bottom-left
    if (this.lensFlareImages.length > 1) {
      const flare2 = this.lensFlareImages[(flareIdx + 1) % this.lensFlareImages.length];
      ctx.globalAlpha = 0.4;
      const flare2Size = flareSize * 0.6;
      ctx.drawImage(
        flare2,
        width * 0.2 - flare2Size / 2 - offsetX,
        height * 0.75 - flare2Size / 2 - offsetY,
        flare2Size,
        flare2Size
      );
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
    
    // Transitions at every 10 seconds
    const segmentDuration = 10;
    const timeInSegment = currentTime % segmentDuration;
    
    // Show transition in last 1.5 seconds of each segment
    if (timeInSegment > segmentDuration - 1.5) {
      const transitionIdx = Math.floor(currentTime / segmentDuration) % this.transitionVideos.length;
      const video = this.transitionVideos[transitionIdx];
      
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        
        const transitionProgress = (timeInSegment - (segmentDuration - 1.5)) / 1.5;
        ctx.globalAlpha = transitionProgress * 0.9;
        
        // Draw FULLSCREEN
        const vw = video.videoWidth || width;
        const vh = video.videoHeight || height;
        const scale = Math.max(width / vw, height / vh);
        const sw = vw * scale;
        const sh = vh * scale;
        const sx = (width - sw) / 2;
        const sy = (height - sh) / 2;
        
        ctx.drawImage(video, sx, sy, sw, sh);
        ctx.restore();
      }
    }
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
    
    // Main title
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.storyTitle, width / 2, height * 0.12);
    ctx.fillText(this.storyTitle, width / 2, height * 0.12);
    
    // Subtitle
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
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    ctx.restore();
  }

  /**
   * Generate thumbnail from current scene
   */
  private async generateThumbnail(): Promise<Blob> {
    if (!this.canvas) return new Blob();
    
    // Render a frame at 1 second for thumbnail
    this.drawFrame(1, 30);
    
    return new Promise((resolve) => {
      this.canvas!.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/jpeg', 0.9);
    });
  }

  /**
   * Get audio duration from file
   */
  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => resolve(30); // Default duration
    });
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Cleanup videos
    this.lightLeakVideos.forEach(v => { v.pause(); v.src = ''; });
    this.particleVideos.forEach(v => { v.pause(); v.src = ''; });
    this.textureVideos.forEach(v => { v.pause(); v.src = ''; });
    this.transitionVideos.forEach(v => { v.pause(); v.src = ''; });
    
    if (this.userVideo) {
      this.userVideo.pause();
      URL.revokeObjectURL(this.userVideo.src);
    }
    
    this.lightLeakVideos = [];
    this.particleVideos = [];
    this.textureVideos = [];
    this.transitionVideos = [];
    this.lensFlareImages = [];
    this.userPhotos = [];
    this.userVideo = null;
    this.userAudioBlob = null;
    
    this.canvas = null;
    this.ctx = null;
    this.assetsLoaded = false;
  }
}

// Export singleton engine instance
export const griotDigitalEngine = new GriotDigitalEngine();
