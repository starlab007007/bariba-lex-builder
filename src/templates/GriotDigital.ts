/**
 * GriotDigital Template - Contes 3D Interactifs
 * Transforme les contes oraux traditionnels en expériences 3D immersives
 * 
 * v2.0 - Optimized: 720p@18fps, FFmpeg encoding, 2D fallback
 * @module GriotDigital
 */

import * as THREE from 'three';
import { aiServicesHub, StoryStructure, AudioFile, ImageFile } from '@/lib/AIServicesHub';
import { AssetLoader3D } from '@/lib/AssetLoader3D';
import { ParticleSystemManager } from '@/lib/ParticleSystemManager';
import { AudioSyncEngine, BeatTimestamp } from '@/lib/AudioSyncEngine';
// VideoEncoder imports kept for potential future FFmpeg upgrade
import { 
  createGriotCharacter, 
  createVillageScene, 
  createSkyDome, 
  createParticleSystem,
  updateParticles
} from '@/lib/GriotFallbackScene';
import GriotFallbackScene from '@/lib/GriotFallbackScene';

const { STYLE_PALETTES } = GriotFallbackScene;

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
  duration: number; // 0 = dynamic based on audio
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

/** User inputs for Griot Digital */
export interface GriotDigitalInputs {
  /** Recorded story narration audio */
  audioNarration: File;
  /** Source language */
  language: 'bariba' | 'french' | 'auto';
  /** Optional photos for face mapping */
  photos?: File[];
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
// RENDER CONFIGURATION - OPTIMIZED FOR SPEED
// ============================================================================

const RENDER_CONFIG = {
  width: 1280,     // 720p width
  height: 720,     // 720p height
  fps: 18,         // Optimized FPS (same as Village Chronicle)
  maxDuration: 30, // Maximum 30 seconds
  videoBitrate: '4M',
  audioBitrate: '128k'
};

// ============================================================================
// GRIOT DIGITAL TEMPLATE
// ============================================================================

/**
 * Griot Digital Template Definition
 */
export const GriotDigitalTemplate: Template = {
  id: 'griot-digital',
  name: 'Griot Digital - Contes 3D Animés',
  category: 'storytelling',
  description: 'Transforme contes oraux en expériences 3D interactives avec avatars animés et effets cinématiques',
  descriptionBa: 'Yí kɔ̀gbè sɔ́ wɛ̀rɛ̀ mɔ̀ 3D dó kpɔ́n',
  
  requiredAssets: {
    models: [
      'model-001.glb', // Griot character
      'model-002.glb', // Village scene
      'model-003.glb', // Forest scene
      'model-004.glb', // Night sky dome
      'model-005.glb', // Props pack
    ],
    particles: [
      'particles:particle-001.webm',
      'particles:particle-005.webm',
      'particles:particle-012.webm',
    ],
    lightLeaks: [
      'light-leak:leak-001.webm',
      'light-leak:leak-004.webm',
      'light-leak:leak-009.webm',
    ],
    lensFlares: [
      'flare-015.png',
      'flare-032.png',
    ],
    textures: [],
    transitions: [],
    audio: [
      'audio-001.mp3',
      'audio-005.mp3',
    ],
    fonts: []
  },
  
  renderSettings: {
    resolution: '720p',  // Optimized from 4K
    fps: 18,             // Optimized from 60
    duration: 0,
    aspectRatio: '16:9'  // Changed to landscape 720p
  },
  
  aiFeatures: [
    'Story Director',
    'Face Mapping',
    'Lip-sync',
    'Interactive Branching',
    'Voice Analysis',
    'Beat Sync',
    'Auto-Subtitles'
  ],
  
  tags: ['storytelling', 'griot', '3d', 'interactive', 'cultural', 'bariba', 'animation'],
  previewUrl: '/templates/griot-digital-preview.jpg',
  demoVideoUrl: '/templates/griot-digital-demo.mp4'
};

// ============================================================================
// GRIOT DIGITAL ENGINE - v2.0 with FFmpeg and 2D Fallback
// ============================================================================

/**
 * GriotDigitalEngine - Core rendering engine for Griot Digital template
 * v2.0: Optimized for 720p@18fps with FFmpeg encoding and 2D fallback
 */
export class GriotDigitalEngine {
  private assetLoader: AssetLoader3D;
  private particleManager: ParticleSystemManager;
  private audioEngine: AudioSyncEngine;
  
  // Three.js components
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private clock: THREE.Clock;
  
  // 2D Fallback components
  private use2DFallback: boolean = false;
  private canvas2D: HTMLCanvasElement | null = null;
  private ctx2D: CanvasRenderingContext2D | null = null;
  private fallbackParticles: THREE.Points | null = null;
  
  // Loaded assets
  private models: Map<string, THREE.Group> = new Map();
  private animations: Map<string, THREE.AnimationClip[]> = new Map();
  private mixer: THREE.AnimationMixer | null = null;
  
  // Timeline
  private timeline: TimelineSegment[] = [];
  private currentSegment: number = 0;
  private isPlaying: boolean = false;
  
  // Interactive
  private branchPoints: BranchPoint[] = [];
  private onBranchCallback: ((branch: BranchPoint) => Promise<string>) | null = null;
  
  // State
  private currentStyle: string = 'traditional';
  private storyTitle: string = '';
  private audioBlob: Blob | null = null;

  constructor() {
    this.assetLoader = new AssetLoader3D();
    this.particleManager = new ParticleSystemManager();
    this.audioEngine = new AudioSyncEngine();
    this.clock = new THREE.Clock();
  }

  /**
   * Initialize the rendering context - ALWAYS use 2D Canvas for reliability
   */
  public async initialize(canvas?: HTMLCanvasElement): Promise<void> {
    console.log('[GriotDigital] Initializing engine (2D mode for reliability)...');
    
    // Create a fresh canvas to avoid context conflicts
    this.canvas2D = document.createElement('canvas');
    this.canvas2D.width = RENDER_CONFIG.width;
    this.canvas2D.height = RENDER_CONFIG.height;
    
    // Always use 2D context for maximum reliability
    this.ctx2D = this.canvas2D.getContext('2d', { willReadFrequently: true });
    this.use2DFallback = true;
    
    if (!this.ctx2D) {
      throw new Error('Failed to create 2D canvas context');
    }
    
    console.log('[GriotDigital] 2D Canvas initialized:', RENDER_CONFIG.width, 'x', RENDER_CONFIG.height);
  }

  /**
   * Load all required assets for the template
   */
  public async loadAssets(
    onProgress?: (progress: number, asset: string) => void
  ): Promise<void> {
    console.log('[GriotDigital] Loading assets...');
    
    if (this.use2DFallback) {
      // For 2D fallback, we don't need to load 3D models
      onProgress?.(1, '2D fallback mode - no models needed');
      return;
    }

    const assets = GriotDigitalTemplate.requiredAssets;
    const totalAssets = assets.models.length + assets.particles.length;
    let loaded = 0;

    // Load 3D models with fallback
    for (const modelId of assets.models) {
      try {
        const model = await this.assetLoader.loadModel(modelId);
        if (model) {
          this.models.set(modelId, model);
        }
        loaded++;
        onProgress?.(loaded / totalAssets, modelId);
      } catch (error) {
        console.warn(`[GriotDigital] Failed to load model ${modelId}, will use fallback`);
        loaded++;
        onProgress?.(loaded / totalAssets, modelId);
      }
    }

    // Check if we need to switch to 2D fallback
    if (this.models.size === 0) {
      console.log('[GriotDigital] No models loaded, switching to 2D fallback');
      this.use2DFallback = true;
    }

    // Load particle effects
    for (const particleId of assets.particles) {
      try {
        await this.particleManager.loadParticleEffect(particleId);
        loaded++;
        onProgress?.(loaded / totalAssets, particleId);
      } catch (error) {
        console.warn(`[GriotDigital] Failed to load particle ${particleId}`);
        loaded++;
      }
    }
    
    console.log(`[GriotDigital] Assets loaded. 2D fallback: ${this.use2DFallback}`);
  }

  /**
   * Process and render the Griot Digital story
   */
  public async render(
    inputs: GriotDigitalInputs,
    onProgress?: RenderProgressCallback
  ): Promise<RenderResult> {
    console.log('[GriotDigital] Starting render pipeline...');
    
    if (!this.canvas2D) {
      throw new Error('Engine not initialized');
    }

    this.currentStyle = inputs.style || 'traditional';
    onProgress?.(0.05, 'Analyzing audio...');

    // 1. Convert file to AudioFile format and store blob
    const audioFile = await this.fileToAudioFile(inputs.audioNarration);
    this.audioBlob = inputs.audioNarration;
    
    // 1b. Load audio buffer for beat analysis
    try {
      await this.audioEngine.loadAudioBlob(inputs.audioNarration);
      console.log('[GriotDigital] Audio buffer loaded for beat analysis');
    } catch (error) {
      console.warn('[GriotDigital] Audio buffer load failed, will use fallback beats:', error);
    }
    
    // 2. Analyze story structure (with fallback)
    let storyAnalysis: StoryStructure;
    try {
      storyAnalysis = await aiServicesHub.analyzeStory(
        audioFile,
        inputs.language === 'auto' ? 'french' : inputs.language
      );
    } catch (error) {
      console.warn('[GriotDigital] Story analysis failed, using default structure:', error);
      storyAnalysis = this.createDefaultStoryStructure(audioFile.duration || 30);
    }
    
    this.storyTitle = inputs.customTitle || storyAnalysis.title || 'Conte Digital';

    onProgress?.(0.15, 'Setting up scene...');

    // 3. Setup scene (3D or 2D fallback)
    if (!this.use2DFallback && this.scene) {
      await this.setupScene(inputs.style || 'traditional');
    }

    onProgress?.(0.25, 'Creating timeline...');

    // 4. Create timeline from story analysis
    this.timeline = await this.createTimelineFromStory(storyAnalysis, audioFile);

    // 5. Generate branch points if interactive
    if (inputs.interactiveMode) {
      onProgress?.(0.30, 'Creating interactive branches...');
      this.branchPoints = await this.createBranchingPoints(storyAnalysis);
    }

    onProgress?.(0.35, 'Rendering video...');

    // 6. Render the video using reliable Canvas capture
    const totalDuration = Math.min(audioFile.duration || 30, RENDER_CONFIG.maxDuration);
    const video = await this.renderVideoReliable(totalDuration, onProgress);

    onProgress?.(0.95, 'Generating thumbnail...');

    // 7. Generate thumbnail
    const thumbnail = await this.generateThumbnail();

    onProgress?.(1.0, 'Complete!');
    
    console.log('[GriotDigital] Render complete!');

    return {
      video,
      thumbnail,
      duration: totalDuration,
      metadata: {
        title: this.storyTitle,
        language: inputs.language,
        interactive: inputs.interactiveMode,
        branchPoints: this.branchPoints.length > 0 ? this.branchPoints : undefined,
        segments: this.timeline.length
      }
    };
  }

  /**
   * Render video using reliable Canvas-based capture with MediaRecorder
   * This avoids FFmpeg WASM loading issues that can cause hangs
   */
  private async renderVideoReliable(
    durationSeconds: number,
    onProgress?: RenderProgressCallback
  ): Promise<Blob> {
    console.log(`[GriotDigital] Rendering ${durationSeconds}s @ ${RENDER_CONFIG.fps}fps (2D Canvas)`);
    
    const canvas = this.canvas2D!;
    const fps = RENDER_CONFIG.fps;
    const totalFrames = Math.ceil(durationSeconds * fps);
    
    onProgress?.(0.40, 'Préparation du rendu...');
    
    // Use MediaRecorder for reliable capture
    return new Promise<Blob>((resolve, reject) => {
      try {
        const stream = canvas.captureStream(fps);
        
        // Add audio if available
        if (this.audioBlob) {
          this.addAudioToStream(stream, this.audioBlob);
        }
        
        const chunks: Blob[] = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 4000000
        });
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log(`[GriotDigital] Video recorded: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          resolve(blob);
        };
        
        recorder.onerror = (e) => {
          console.error('[GriotDigital] MediaRecorder error:', e);
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
          this.draw2DFrame(currentTime, durationSeconds);
          currentFrame++;
          
          // Update progress
          if (currentFrame % 5 === 0) {
            const progress = 0.40 + (currentFrame / totalFrames) * 0.50;
            onProgress?.(progress, `Frame ${currentFrame}/${totalFrames}`);
          }
          
          setTimeout(renderNextFrame, frameInterval);
        };
        
        // Start rendering
        renderNextFrame();
        
      } catch (error) {
        console.error('[GriotDigital] Render failed:', error);
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
      audioElement.volume = 0; // Silent in browser but captured
      
      const source = audioContext.createMediaElementSource(audioElement);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      destination.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track);
      });
      
      audioElement.play().catch(() => {
        console.warn('[GriotDigital] Audio autoplay blocked');
      });
    } catch (error) {
      console.warn('[GriotDigital] Could not add audio to stream:', error);
    }
  }

  /**
   * Render a 3D frame at given time
   */
  private render3DFrame(currentTime: number): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    // Update timeline
    this.updateTimeline(currentTime);
    
    // Update animations
    const delta = 1 / RENDER_CONFIG.fps;
    this.mixer?.update(delta);
    
    // Update particles
    this.particleManager.update(delta);
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Draw a 2D fallback frame (procedural animation)
   */
  private draw2DFrame(currentTime: number, totalDuration: number): void {
    const ctx = this.ctx2D;
    const canvas = this.canvas2D;
    if (!ctx || !canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const progress = currentTime / totalDuration;
    
    // Get style palette
    const palette = STYLE_PALETTES[this.currentStyle as keyof typeof STYLE_PALETTES] || STYLE_PALETTES.traditional;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw gradient background
    const gradient = ctx.createRadialGradient(
      width * 0.5, height * 0.4, 0,
      width * 0.5, height * 0.5, width * 0.8
    );
    gradient.addColorStop(0, this.hexToRgba(palette.background, 1));
    gradient.addColorStop(1, this.hexToRgba(palette.fog, 1));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw village silhouettes
    this.drawVillageSilhouettes(ctx, width, height, palette);
    
    // Draw animated griot character
    this.drawGriotCharacter(ctx, width, height, currentTime, palette);
    
    // Draw floating particles
    this.drawParticles(ctx, width, height, currentTime, palette);
    
    // Draw light leak overlay
    this.drawLightLeak(ctx, width, height, currentTime, palette);
    
    // Draw beat pulse
    this.drawBeatPulse(ctx, width, height, currentTime, palette);
    
    // Draw title (first 5 seconds)
    if (currentTime < 5) {
      this.drawTitle(ctx, width, height, currentTime);
    }
    
    // Draw segment indicator
    this.drawSegmentIndicator(ctx, width, height, progress);
  }

  /**
   * Draw village silhouettes in background
   */
  private drawVillageSilhouettes(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: typeof STYLE_PALETTES.traditional
  ): void {
    ctx.save();
    ctx.fillStyle = this.hexToRgba(palette.secondary, 0.3);
    
    // Draw huts
    const hutPositions = [0.15, 0.35, 0.65, 0.85];
    hutPositions.forEach((xPos, i) => {
      const x = width * xPos;
      const y = height * 0.75;
      const size = 40 + i * 10;
      
      // Hut body
      ctx.beginPath();
      ctx.arc(x, y, size * 0.6, Math.PI, 0);
      ctx.lineTo(x + size * 0.6, y + size * 0.4);
      ctx.lineTo(x - size * 0.6, y + size * 0.4);
      ctx.closePath();
      ctx.fill();
      
      // Roof
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.3);
      ctx.lineTo(x + size * 0.8, y);
      ctx.lineTo(x - size * 0.8, y);
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.restore();
  }

  /**
   * Draw animated griot character
   */
  private drawGriotCharacter(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    palette: typeof STYLE_PALETTES.traditional
  ): void {
    ctx.save();
    
    const centerX = width * 0.5;
    const baseY = height * 0.55;
    
    // Subtle breathing animation
    const breathe = Math.sin(currentTime * 2) * 3;
    const sway = Math.sin(currentTime * 1.5) * 5;
    
    // Body (robe)
    const robeGradient = ctx.createLinearGradient(
      centerX - 60, baseY,
      centerX + 60, baseY + 120
    );
    robeGradient.addColorStop(0, this.hexToRgba(palette.secondary, 0.9));
    robeGradient.addColorStop(1, this.hexToRgba(palette.secondary, 0.6));
    
    ctx.fillStyle = robeGradient;
    ctx.beginPath();
    ctx.moveTo(centerX + sway, baseY - 40 + breathe);
    ctx.quadraticCurveTo(centerX - 80, baseY + 60, centerX - 70, baseY + 140);
    ctx.lineTo(centerX + 70, baseY + 140);
    ctx.quadraticCurveTo(centerX + 80, baseY + 60, centerX + sway, baseY - 40 + breathe);
    ctx.fill();
    
    // Head
    ctx.fillStyle = this.hexToRgba(palette.primary, 0.9);
    ctx.beginPath();
    ctx.arc(centerX + sway, baseY - 60 + breathe, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Hat/Headdress
    ctx.fillStyle = this.hexToRgba(palette.accent, 0.9);
    ctx.beginPath();
    ctx.ellipse(centerX + sway, baseY - 95 + breathe, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Staff
    ctx.strokeStyle = this.hexToRgba(0x4a3728, 0.9);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX + 50 + sway, baseY + 130);
    ctx.lineTo(centerX + 60 + sway, baseY - 80 + breathe);
    ctx.stroke();
    
    // Staff orb (pulsing)
    const orbPulse = 1 + Math.sin(currentTime * 4) * 0.2;
    ctx.fillStyle = this.hexToRgba(palette.accent, 0.8);
    ctx.shadowColor = this.hexToRgba(palette.accent, 0.8);
    ctx.shadowBlur = 20 * orbPulse;
    ctx.beginPath();
    ctx.arc(centerX + 60 + sway, baseY - 90 + breathe, 12 * orbPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.restore();
  }

  /**
   * Draw floating particles
   */
  private drawParticles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    palette: typeof STYLE_PALETTES.traditional
  ): void {
    ctx.save();
    
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 137.5; // Golden angle
      const x = ((seed + currentTime * 20) % width);
      const y = ((seed * 2.3 + currentTime * 30) % height);
      const size = 2 + Math.sin(seed + currentTime * 3) * 1.5;
      const alpha = 0.3 + Math.sin(seed + currentTime * 2) * 0.3;
      
      ctx.fillStyle = this.hexToRgba(palette.accent, alpha);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  /**
   * Draw light leak overlay
   */
  private drawLightLeak(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    palette: typeof STYLE_PALETTES.traditional
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Animated light leak from corner
    const leakX = width * 0.85 + Math.sin(currentTime * 0.5) * 50;
    const leakY = height * 0.15 + Math.cos(currentTime * 0.3) * 30;
    const leakRadius = 200 + Math.sin(currentTime) * 50;
    
    const leakGradient = ctx.createRadialGradient(
      leakX, leakY, 0,
      leakX, leakY, leakRadius
    );
    leakGradient.addColorStop(0, this.hexToRgba(palette.accent, 0.4));
    leakGradient.addColorStop(0.5, this.hexToRgba(palette.accent, 0.1));
    leakGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = leakGradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
  }

  /**
   * Draw beat pulse effect
   */
  private drawBeatPulse(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    palette: typeof STYLE_PALETTES.traditional
  ): void {
    // Simulate beat detection with sine wave
    const beatIntensity = Math.pow(Math.sin(currentTime * 4) * 0.5 + 0.5, 4);
    
    if (beatIntensity > 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      
      const pulseGradient = ctx.createRadialGradient(
        width * 0.5, height * 0.5, 0,
        width * 0.5, height * 0.5, width * 0.6
      );
      pulseGradient.addColorStop(0, this.hexToRgba(palette.accent, beatIntensity * 0.2));
      pulseGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = pulseGradient;
      ctx.fillRect(0, 0, width, height);
      
      ctx.restore();
    }
  }

  /**
   * Draw title text
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
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.storyTitle, width / 2, height * 0.15);
    ctx.fillText(this.storyTitle, width / 2, height * 0.15);
    
    // Subtitle
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText('Griot Digital', width / 2, height * 0.22);
    ctx.fillText('Griot Digital', width / 2, height * 0.22);
    
    ctx.restore();
  }

  /**
   * Draw segment indicator
   */
  private drawSegmentIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number
  ): void {
    ctx.save();
    
    // Progress bar at bottom
    const barWidth = width * 0.8;
    const barHeight = 4;
    const barX = (width - barWidth) / 2;
    const barY = height - 30;
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    
    ctx.restore();
  }

  /**
   * Convert hex color to rgba string
   */
  private hexToRgba(hex: number | string, alpha: number): string {
    const hexNum = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
    const r = (hexNum >> 16) & 255;
    const g = (hexNum >> 8) & 255;
    const b = hexNum & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Setup the 3D scene based on style
   */
  private async setupScene(style: string): Promise<void> {
    if (!this.scene) return;

    // Clear existing objects
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    const palette = STYLE_PALETTES[style as keyof typeof STYLE_PALETTES] || STYLE_PALETTES.traditional;

    // Try to add loaded models, or use fallbacks
    const griotModel = this.models.get('model-001.glb');
    if (griotModel) {
      griotModel.position.set(0, 0, 0);
      griotModel.scale.setScalar(1);
      this.scene.add(griotModel);
      this.mixer = new THREE.AnimationMixer(griotModel);
    } else {
      // Add fallback griot character
      const fallbackGriot = createGriotCharacter(style);
      this.scene.add(fallbackGriot);
    }

    // Add environment
    const envModel = this.models.get('model-002.glb');
    if (envModel) {
      envModel.position.set(0, -0.5, -3);
      envModel.scale.setScalar(2);
      this.scene.add(envModel);
    } else {
      // Add fallback village scene
      const fallbackVillage = createVillageScene(style);
      this.scene.add(fallbackVillage);
    }

    // Add sky
    const skyModel = this.models.get('model-004.glb');
    if (skyModel) {
      skyModel.scale.setScalar(50);
      this.scene.add(skyModel);
    } else {
      // Add fallback sky dome
      const fallbackSky = createSkyDome(style);
      this.scene.add(fallbackSky);
    }

    // Add particles
    this.fallbackParticles = createParticleSystem(style);
    this.scene.add(this.fallbackParticles);

    // Apply cinematic lighting
    this.assetLoader.applyLighting(this.scene, 'cinematic');

    // Style-specific fog
    this.scene.fog = new THREE.FogExp2(palette.fog, 0.015);
  }

  /**
   * Update timeline based on current time
   */
  private updateTimeline(currentTime: number): void {
    const segmentIndex = this.timeline.findIndex(
      s => currentTime >= s.startTime && currentTime < s.endTime
    );

    if (segmentIndex !== this.currentSegment && segmentIndex >= 0) {
      this.currentSegment = segmentIndex;
    }

    const segment = this.timeline[segmentIndex];
    if (!segment || !this.camera) return;

    // Update camera animation
    const anim = segment.cameraAnimation;
    const progress = (currentTime - segment.startTime) / (segment.endTime - segment.startTime);
    const easedProgress = this.applyEasing(Math.min(1, Math.max(0, progress)), anim.easing);
    
    this.camera.position.lerpVectors(anim.startPosition, anim.endPosition, easedProgress);
    const target = new THREE.Vector3().lerpVectors(anim.startTarget, anim.endTarget, easedProgress);
    this.camera.lookAt(target);

    // Update fallback particles
    if (this.fallbackParticles) {
      updateParticles(this.fallbackParticles, 1 / RENDER_CONFIG.fps);
    }
  }

  /**
   * Create timeline from story analysis
   */
  private async createTimelineFromStory(
    story: StoryStructure,
    audio: AudioFile
  ): Promise<TimelineSegment[]> {
    const timeline: TimelineSegment[] = [];
    
    let beats: BeatTimestamp[];
    try {
      if (this.audioEngine.hasBuffer()) {
        beats = this.audioEngine.analyzeBeats();
      } else {
        beats = this.audioEngine.getDefaultBeats(audio.duration || 30);
      }
    } catch (error) {
      beats = this.audioEngine.getDefaultBeats(audio.duration || 30);
    }

    for (let i = 0; i < story.segments.length; i++) {
      const segment = story.segments[i];
      const segmentBeats = beats.filter(
        b => b.time >= segment.startTime && b.time <= segment.endTime
      );

      const cameraAnimation = this.getCameraAnimationForSegmentType(
        segment.type,
        i,
        story.segments.length
      );

      const effects = this.getEffectsForSegment(segment, segmentBeats);

      const textOverlays: TextOverlay[] = [];
      if (i === 0) {
        textOverlays.push({
          text: story.title,
          fontId: 'font-001.ttf',
          position: { x: 0.5, y: 0.2 },
          size: 48,
          color: '#ffffff',
          animation: 'fadeIn',
          duration: 3,
          delay: 0.5
        });
      }

      timeline.push({
        index: i,
        startTime: segment.startTime,
        endTime: segment.endTime,
        type: segment.type,
        sceneIndex: this.getSceneIndexForSegmentType(segment.type),
        cameraAnimation,
        effects,
        characterAnimations: [{
          characterId: 'griot',
          animationName: this.getAnimationForEmotion(segment.emotion),
          startTime: segment.startTime,
          duration: segment.endTime - segment.startTime,
          blendWeight: 1,
          lipSync: true
        }],
        textOverlays,
        audioCues: this.getAudioCuesForSegment(segment, i),
        emotion: segment.emotion
      });
    }

    return timeline;
  }

  /**
   * Create default story structure when AI analysis fails
   */
  private createDefaultStoryStructure(duration: number): StoryStructure {
    const segmentDuration = duration / 4;
    return {
      title: 'Conte Digital',
      summary: 'Conte généré automatiquement',
      estimatedDuration: duration,
      confidence: 70,
      suggestedStyle: 'traditional',
      emotionalArc: [],
      segments: [
        { index: 0, type: 'intro', startTime: 0, endTime: segmentDuration, emotion: 'neutral', text: '', visualSuggestions: [] },
        { index: 1, type: 'development', startTime: segmentDuration, endTime: segmentDuration * 2, emotion: 'contemplative', text: '', visualSuggestions: [] },
        { index: 2, type: 'climax', startTime: segmentDuration * 2, endTime: segmentDuration * 3, emotion: 'intense', text: '', visualSuggestions: [] },
        { index: 3, type: 'resolution', startTime: segmentDuration * 3, endTime: duration, emotion: 'happy', text: '', visualSuggestions: [] }
      ],
      keyMoments: [],
      language: 'french',
      themes: ['storytelling']
    };
  }

  /**
   * Create branching points for interactive stories
   */
  private async createBranchingPoints(story: StoryStructure): Promise<BranchPoint[]> {
    const branches: BranchPoint[] = [];
    
    const keyMoments = story.keyMoments.filter(
      m => m.type === 'transition' || m.type === 'reveal'
    ).slice(0, 3);

    for (let i = 0; i < keyMoments.length; i++) {
      const moment = keyMoments[i];
      
      branches.push({
        id: `branch-${i}`,
        timestamp: moment.time,
        prompt: `Que va-t-il se passer ensuite?`,
        choices: [
          {
            id: 'choice-a',
            label: 'Continuer',
            labelBa: 'Tɔ́n kpɔ́',
            icon: '➡️',
            targetSegment: i + 1
          },
          {
            id: 'choice-b',
            label: 'Chemin alternatif',
            labelBa: 'Sìrà gòdò',
            icon: '🔄',
            targetSegment: Math.min(i + 2, story.segments.length - 1)
          }
        ],
        defaultChoice: 'choice-a',
        timeout: 5
      });
    }

    return branches;
  }

  /**
   * Generate thumbnail from current scene
   */
  private async generateThumbnail(): Promise<Blob> {
    const canvas = this.canvas2D;
    if (!canvas) {
      return new Blob();
    }

    // Render a frame at 1 second
    if (this.use2DFallback) {
      this.draw2DFrame(1, 30);
    } else if (this.renderer && this.scene && this.camera) {
      this.render3DFrame(1);
    }
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/jpeg', 0.9);
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getCameraAnimationForSegmentType(
    type: string,
    index: number,
    totalSegments: number
  ): CameraAnimation {
    const basePosition = new THREE.Vector3(0, 1.6, 5);
    const targetPosition = new THREE.Vector3(0, 1.2, 3);
    
    switch (type) {
      case 'intro':
        return {
          type: 'dolly',
          startPosition: new THREE.Vector3(0, 2, 8),
          endPosition: basePosition,
          startTarget: new THREE.Vector3(0, 1, 0),
          endTarget: new THREE.Vector3(0, 1, 0),
          easing: 'easeOut'
        };
      case 'climax':
        return {
          type: 'orbit',
          startPosition: basePosition,
          endPosition: new THREE.Vector3(-2, 1.6, 4),
          startTarget: new THREE.Vector3(0, 1, 0),
          endTarget: new THREE.Vector3(0, 1.2, 0),
          easing: 'easeInOut'
        };
      case 'resolution':
        return {
          type: 'crane',
          startPosition: targetPosition,
          endPosition: new THREE.Vector3(0, 3, 6),
          startTarget: new THREE.Vector3(0, 1, 0),
          endTarget: new THREE.Vector3(0, 0, 0),
          easing: 'easeIn'
        };
      default:
        return {
          type: 'static',
          startPosition: basePosition,
          endPosition: basePosition.clone().add(new THREE.Vector3(0.5, 0, -0.5)),
          startTarget: new THREE.Vector3(0, 1, 0),
          endTarget: new THREE.Vector3(0, 1, 0),
          easing: 'linear'
        };
    }
  }

  private getEffectsForSegment(
    segment: { type: string; emotion: string },
    beats: BeatTimestamp[]
  ): SegmentEffect[] {
    const effects: SegmentEffect[] = [];

    effects.push({
      type: 'particles',
      assetId: 'particle-001.webm',
      trigger: 'start',
      intensity: 0.5,
      position: new THREE.Vector3(0, 2, -1)
    });

    if (beats.length > 0) {
      effects.push({
        type: 'lensFlare',
        assetId: 'flare-015.png',
        trigger: 'beat',
        intensity: 0.7
      });
    }

    switch (segment.emotion) {
      case 'intense':
      case 'dramatic':
        effects.push({
          type: 'lightLeak',
          assetId: 'leak-015.webm',
          trigger: 'start',
          intensity: 0.8
        });
        break;
      case 'mystical':
      case 'magical':
        effects.push({
          type: 'particles',
          assetId: 'particle-012.webm',
          trigger: 'start',
          intensity: 0.9
        });
        break;
    }

    return effects;
  }

  private getSceneIndexForSegmentType(type: string): number {
    switch (type) {
      case 'intro': return 0;
      case 'development': return 1;
      case 'climax': return 2;
      case 'resolution': return 3;
      default: return 0;
    }
  }

  private getAnimationForEmotion(emotion: string): string {
    const emotionToAnimation: Record<string, string> = {
      'neutral': 'idle',
      'happy': 'gesture_happy',
      'sad': 'gesture_sad',
      'intense': 'gesture_dramatic',
      'excited': 'gesture_excited',
      'contemplative': 'gesture_thinking',
      'mystical': 'gesture_mystical'
    };
    return emotionToAnimation[emotion] || 'idle';
  }

  private getAudioCuesForSegment(
    segment: { type: string },
    index: number
  ): AudioCue[] {
    const cues: AudioCue[] = [];

    if (index === 0) {
      cues.push({
        type: 'music',
        assetId: 'audio-001.mp3',
        volume: 0.3,
        fadeIn: 2
      });
    }

    if (segment.type === 'climax') {
      cues.push({
        type: 'music',
        assetId: 'audio-012.mp3',
        volume: 0.5,
        fadeIn: 1
      });
    }

    return cues;
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default:
        return t;
    }
  }

  private async fileToAudioFile(file: File): Promise<AudioFile> {
    const data = await this.fileToBase64(file);
    const duration = await this.getAudioDuration(file);
    
    return {
      data,
      mimeType: file.type,
      duration,
      name: file.name
    };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

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
   * Set callback for interactive branch decisions
   */
  public setBranchCallback(
    callback: (branch: BranchPoint) => Promise<string>
  ): void {
    this.onBranchCallback = callback;
  }

  /**
   * Get current playback state
   */
  public getPlaybackState(): {
    isPlaying: boolean;
    currentTime: number;
    currentSegment: number;
    totalSegments: number;
  } {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.clock.getElapsedTime(),
      currentSegment: this.currentSegment,
      totalSegments: this.timeline.length
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.isPlaying = false;
    
    // Dispose Three.js resources
    this.models.forEach((model) => {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    
    this.models.clear();
    this.animations.clear();
    
    // Dispose particle manager
    this.particleManager.dispose();
    
    // Dispose asset loader
    this.assetLoader.dispose();
    
    // Dispose renderer
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas2D = null;
    this.ctx2D = null;
  }
}

// Export singleton engine instance
export const griotDigitalEngine = new GriotDigitalEngine();
