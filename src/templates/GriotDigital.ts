/**
 * GriotDigital Template - Contes 3D Interactifs
 * Transforme les contes oraux traditionnels en expériences 3D immersives
 * 
 * @module GriotDigital
 */

import * as THREE from 'three';
import { aiServicesHub, StoryStructure, AudioFile, ImageFile } from '@/lib/AIServicesHub';
import { AssetLoader3D } from '@/lib/AssetLoader3D';
import { ParticleSystemManager } from '@/lib/ParticleSystemManager';
import { AudioSyncEngine, BeatTimestamp } from '@/lib/AudioSyncEngine';

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
  /** Unique identifier */
  id: string;
  /** Time in seconds when branch occurs */
  timestamp: number;
  /** Question or prompt for user */
  prompt: string;
  /** Available choices */
  choices: BranchChoice[];
  /** Default choice if no interaction */
  defaultChoice: string;
  /** Timeout in seconds */
  timeout: number;
}

/** Branch choice */
export interface BranchChoice {
  /** Choice identifier */
  id: string;
  /** Display label */
  label: string;
  /** Label in Bariba */
  labelBa?: string;
  /** Icon or emoji */
  icon?: string;
  /** Target branch/segment to jump to */
  targetSegment: number;
  /** Preview text */
  preview?: string;
}

/** Story timeline segment */
export interface TimelineSegment {
  /** Segment index */
  index: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Segment type */
  type: 'intro' | 'development' | 'climax' | 'resolution' | 'outro' | 'branch';
  /** Scene to display */
  sceneIndex: number;
  /** Camera animation */
  cameraAnimation: CameraAnimation;
  /** Active effects */
  effects: SegmentEffect[];
  /** Character animations */
  characterAnimations: CharacterAnimation[];
  /** Text overlays */
  textOverlays: TextOverlay[];
  /** Audio cues */
  audioCues: AudioCue[];
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
      'particles:particle-001.webm', // Golden dust → leak-001.webm
      'particles:particle-005.webm', // Fireflies → leak-005.webm
      'particles:particle-012.webm', // Magic sparkles → leak-012.webm
      'particles:particle-018.webm', // Smoke wisps → leak-018.webm
      'particles:particle-025.webm', // Stars → leak-025.webm
    ],
    lightLeaks: [
      'light-leak:leak-001.webm', // Warm sunset (from 3d-models)
      'light-leak:leak-004.webm', // Mystical blue (from 3d-models)
      'light-leak:leak-009.webm', // Golden hour (from 3d-models)
      'light-leak:leak-015.webm', // Fire glow (from 3d-models)
    ],
    lensFlares: [
      'flare-015.png', // Sun flare
      'flare-032.png', // Moonlight
      'flare-088.png', // Magical glow
    ],
    textures: [
      'texture-001.png', // African patterns
      'texture-045.png', // Fabric weave
      'texture-112.png', // Ground texture
    ],
    transitions: [
      'transition-001.mp4', // Page turn
      'transition-008.mp4', // Smoke wipe
      'transition-015.mp4', // Light burst
    ],
    audio: [
      'audio-001.mp3', // Kora intro
      'audio-005.mp3', // Ambient village
      'audio-012.mp3', // Dramatic tension
      'audio-020.mp3', // Resolution theme
    ],
    fonts: [
      'font-001.ttf', // African display
      'font-003.ttf', // Subtitle sans
      'font-007.ttf', // Decorative
    ]
  },
  
  renderSettings: {
    resolution: '4K',
    fps: 60,
    duration: 0, // Calculated dynamically from audio
    aspectRatio: '9:16'
  },
  
  aiFeatures: [
    'Story Director',
    'Face Mapping',
    'Lip-sync',
    'Interactive Branching',
    'Voice Analysis',
    'Beat Sync',
    'Auto-Subtitles',
    'Scene Composition'
  ],
  
  tags: ['storytelling', 'griot', '3d', 'interactive', 'cultural', 'bariba', 'animation'],
  previewUrl: '/templates/griot-digital-preview.jpg',
  demoVideoUrl: '/templates/griot-digital-demo.mp4'
};

// ============================================================================
// GRIOT DIGITAL ENGINE
// ============================================================================

/**
 * GriotDigitalEngine - Core rendering engine for Griot Digital template
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
  
  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {
    this.assetLoader = new AssetLoader3D();
    this.particleManager = new ParticleSystemManager();
    this.audioEngine = new AudioSyncEngine();
    this.clock = new THREE.Clock();
  }

  /**
   * Initialize the 3D rendering context
   */
  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(1080, 1920); // 9:16 portrait
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);
    this.camera.lookAt(0, 1, 0);
  }

  /**
   * Load all required assets for the template
   */
  public async loadAssets(
    onProgress?: (progress: number, asset: string) => void
  ): Promise<void> {
    const assets = GriotDigitalTemplate.requiredAssets;
    const totalAssets = 
      assets.models.length + 
      assets.particles.length + 
      assets.lightLeaks.length;
    let loaded = 0;

    // Load 3D models
    for (const modelId of assets.models) {
      try {
        const model = await this.assetLoader.loadModel(modelId);
        this.models.set(modelId, model);
        loaded++;
        onProgress?.(loaded / totalAssets, modelId);
      } catch (error) {
        console.warn(`Failed to load model ${modelId}:`, error);
      }
    }

    // Load particle effects
    for (const particleId of assets.particles) {
      try {
        await this.particleManager.loadParticleEffect(particleId);
        loaded++;
        onProgress?.(loaded / totalAssets, particleId);
      } catch (error) {
        console.warn(`Failed to load particle ${particleId}:`, error);
      }
    }

    // Preload audio
    for (const audioId of assets.audio) {
      try {
        // Audio will be loaded when needed
        loaded++;
        onProgress?.(loaded / totalAssets, audioId);
      } catch (error) {
        console.warn(`Failed to load audio ${audioId}:`, error);
      }
    }
  }

  /**
   * Process and render the Griot Digital story
   */
  public async render(
    inputs: GriotDigitalInputs,
    onProgress?: RenderProgressCallback
  ): Promise<RenderResult> {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Engine not initialized');
    }

    onProgress?.(0.05, 'Analyzing audio...');

    // 1. Convert file to AudioFile format
    const audioFile = await this.fileToAudioFile(inputs.audioNarration);
    
    // 2. Analyze story structure
    const storyAnalysis = await aiServicesHub.analyzeStory(
      audioFile,
      inputs.language === 'auto' ? 'french' : inputs.language
    );

    onProgress?.(0.15, 'Loading 3D assets...');

    // 3. Setup scene with models
    await this.setupScene(inputs.style || 'traditional');

    // 4. Face mapping if photos provided
    if (inputs.photos && inputs.photos.length > 0) {
      onProgress?.(0.25, 'Creating avatar...');
      await this.applyFaceMapping(inputs.photos);
    }

    onProgress?.(0.35, 'Creating timeline...');

    // 5. Create timeline from story analysis
    this.timeline = await this.createTimelineFromStory(storyAnalysis, audioFile);

    // 6. Generate branch points if interactive
    if (inputs.interactiveMode) {
      onProgress?.(0.40, 'Creating interactive branches...');
      this.branchPoints = await this.createBranchingPoints(storyAnalysis);
    }

    onProgress?.(0.45, 'Setting up lip-sync...');

    // 7. Setup lip-sync
    await this.setupLipSync(audioFile);

    onProgress?.(0.50, 'Rendering video...');

    // 8. Render the video
    const video = await this.renderVideo(audioFile, onProgress);

    onProgress?.(0.95, 'Generating thumbnail...');

    // 9. Generate thumbnail
    const thumbnail = await this.generateThumbnail();

    onProgress?.(1.0, 'Complete!');

    return {
      video,
      thumbnail,
      duration: audioFile.duration || storyAnalysis.estimatedDuration,
      metadata: {
        title: inputs.customTitle || storyAnalysis.title,
        language: inputs.language,
        interactive: inputs.interactiveMode,
        branchPoints: this.branchPoints.length > 0 ? this.branchPoints : undefined,
        segments: this.timeline.length
      }
    };
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

    // Add griot character
    const griotModel = this.models.get('model-001.glb');
    if (griotModel) {
      griotModel.position.set(0, 0, 0);
      griotModel.scale.setScalar(1);
      this.scene.add(griotModel);

      // Setup animation mixer
      this.mixer = new THREE.AnimationMixer(griotModel);
    }

    // Add environment based on style
    const envModel = this.models.get('model-002.glb');
    if (envModel) {
      envModel.position.set(0, -0.5, -3);
      envModel.scale.setScalar(2);
      this.scene.add(envModel);
    }

    // Apply cinematic lighting
    this.assetLoader.applyLighting(this.scene, 'cinematic');

    // Add sky dome
    const skyModel = this.models.get('model-004.glb');
    if (skyModel) {
      skyModel.scale.setScalar(50);
      this.scene.add(skyModel);
    }

    // Style-specific adjustments
    switch (style) {
      case 'traditional':
        this.scene.fog = new THREE.FogExp2(0x2d1b00, 0.015);
        break;
      case 'modern':
        this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.01);
        break;
      case 'fantasy':
        this.scene.fog = new THREE.FogExp2(0x0d0d2b, 0.02);
        // Add magical particles
        this.particleManager.play('particle-012.webm', {
          position: new THREE.Vector3(0, 2, 0),
          loop: true
        });
        break;
      case 'historical':
        this.scene.fog = new THREE.FogExp2(0x3d2b1f, 0.02);
        break;
    }
  }

  /**
   * Apply face mapping from photos to character model
   */
  private async applyFaceMapping(photos: File[]): Promise<void> {
    const imageFiles: ImageFile[] = await Promise.all(
      photos.map(async (file) => {
        const data = await this.fileToBase64(file);
        return {
          data,
          mimeType: file.type,
          name: file.name
        };
      })
    );

    try {
      const avatar = await aiServicesHub.photos3DAvatar(imageFiles);
      
      // Find the griot model and apply the face
      const griotModel = this.models.get('model-001.glb');
      if (griotModel && avatar) {
        // Find the head mesh and replace with custom face
        griotModel.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name.includes('head')) {
            // Apply custom face texture/geometry
            const avatarMesh = avatar.children[0] as THREE.Mesh;
            if (avatarMesh && avatarMesh.geometry) {
              // Morph the face onto the character
              child.geometry = avatarMesh.geometry;
              if (avatarMesh.material instanceof THREE.Material) {
                child.material = avatarMesh.material;
              }
            }
          }
        });
      }
    } catch (error) {
      console.warn('Face mapping failed, using default character:', error);
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
    const beats = this.audioEngine.analyzeBeats();

    for (let i = 0; i < story.segments.length; i++) {
      const segment = story.segments[i];
      
      // Find beats within this segment
      const segmentBeats = beats.filter(
        b => b.time >= segment.startTime && b.time <= segment.endTime
      );

      // Create camera animation based on segment type
      const cameraAnimation = this.getCameraAnimationForSegmentType(
        segment.type,
        i,
        story.segments.length
      );

      // Create effects based on emotion and beats
      const effects = this.getEffectsForSegment(segment, segmentBeats);

      // Create text overlays
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
        audioCues: this.getAudioCuesForSegment(segment, i)
      });
    }

    return timeline;
  }

  /**
   * Create branching points for interactive stories
   */
  private async createBranchingPoints(story: StoryStructure): Promise<BranchPoint[]> {
    const branches: BranchPoint[] = [];
    
    // Find key moments suitable for branching (3-5 points)
    const keyMoments = story.keyMoments.filter(
      m => m.type === 'transition' || m.type === 'reveal'
    ).slice(0, 5);

    for (let i = 0; i < Math.min(keyMoments.length, 5); i++) {
      const moment = keyMoments[i];
      
      branches.push({
        id: `branch-${i}`,
        timestamp: moment.time,
        prompt: `Que va-t-il se passer ensuite?`,
        choices: [
          {
            id: 'choice-a',
            label: 'Continuer l\'histoire',
            labelBa: 'Tɔ́n kpɔ́',
            icon: '➡️',
            targetSegment: i + 1,
            preview: 'L\'histoire continue normalement'
          },
          {
            id: 'choice-b',
            label: 'Chemin alternatif',
            labelBa: 'Sìrà gòdò',
            icon: '🔄',
            targetSegment: Math.min(i + 2, story.segments.length - 1),
            preview: 'Découvrir une fin différente'
          }
        ],
        defaultChoice: 'choice-a',
        timeout: 5
      });
    }

    return branches;
  }

  /**
   * Setup lip-sync for character
   */
  private async setupLipSync(audio: AudioFile): Promise<void> {
    // Store audio data for lip-sync animation
    const griotModel = this.models.get('model-001.glb');
    if (griotModel) {
      griotModel.userData.audioData = audio.data;
    }
  }

  /**
   * Render the complete video
   */
  private async renderVideo(
    audio: AudioFile,
    onProgress?: RenderProgressCallback
  ): Promise<Blob> {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Engine not initialized');
    }

    const duration = audio.duration || 60;
    const fps = GriotDigitalTemplate.renderSettings.fps;
    const totalFrames = Math.ceil(duration * fps);
    
    // Setup canvas stream for recording
    const canvas = this.renderer.domElement;
    const stream = canvas.captureStream(fps);
    
    // Create MediaRecorder
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        resolve(blob);
      };

      this.mediaRecorder.onerror = (e) => {
        reject(new Error('Recording failed'));
      };

      // Start recording
      this.mediaRecorder.start();
      this.isPlaying = true;
      this.clock.start();

      // Render loop
      let currentFrame = 0;
      const renderFrame = () => {
        if (currentFrame >= totalFrames || !this.isPlaying) {
          this.mediaRecorder?.stop();
          return;
        }

        const currentTime = currentFrame / fps;
        
        // Update timeline
        this.updateTimeline(currentTime);
        
        // Update animations
        const delta = this.clock.getDelta();
        this.mixer?.update(delta);
        
        // Update particles
        this.particleManager.update(delta);
        
        // Update lip-sync
        this.updateLipSync(currentTime);
        
        // Render
        this.renderer!.render(this.scene!, this.camera!);
        
        // Progress
        currentFrame++;
        const progress = 0.50 + (currentFrame / totalFrames) * 0.40;
        onProgress?.(progress, `Rendering frame ${currentFrame}/${totalFrames}`);
        
        requestAnimationFrame(renderFrame);
      };

      renderFrame();
    });
  }

  /**
   * Update timeline based on current time
   */
  private updateTimeline(currentTime: number): void {
    // Find current segment
    const segmentIndex = this.timeline.findIndex(
      s => currentTime >= s.startTime && currentTime < s.endTime
    );

    if (segmentIndex !== this.currentSegment && segmentIndex >= 0) {
      this.currentSegment = segmentIndex;
      this.onSegmentChange(this.timeline[segmentIndex]);
    }

    const segment = this.timeline[segmentIndex];
    if (!segment) return;

    // Update camera animation
    this.updateCameraAnimation(segment, currentTime);
    
    // Update effects
    this.updateEffects(segment, currentTime);
    
    // Update text overlays
    this.updateTextOverlays(segment, currentTime);
  }

  /**
   * Handle segment change
   */
  private onSegmentChange(segment: TimelineSegment): void {
    // Play segment-specific effects
    for (const effect of segment.effects) {
      if (effect.trigger === 'start') {
        this.triggerEffect(effect);
      }
    }

    // Play character animations
    for (const charAnim of segment.characterAnimations) {
      this.playCharacterAnimation(charAnim);
    }
  }

  /**
   * Update camera animation
   */
  private updateCameraAnimation(
    segment: TimelineSegment,
    currentTime: number
  ): void {
    if (!this.camera) return;

    const anim = segment.cameraAnimation;
    const progress = (currentTime - segment.startTime) / 
                     (segment.endTime - segment.startTime);
    
    const easedProgress = this.applyEasing(progress, anim.easing);
    
    // Interpolate position
    this.camera.position.lerpVectors(
      anim.startPosition,
      anim.endPosition,
      easedProgress
    );
    
    // Interpolate target
    const target = new THREE.Vector3().lerpVectors(
      anim.startTarget,
      anim.endTarget,
      easedProgress
    );
    this.camera.lookAt(target);
  }

  /**
   * Update effects based on current time
   */
  private updateEffects(segment: TimelineSegment, currentTime: number): void {
    for (const effect of segment.effects) {
      // Beat-triggered effects
      if (effect.trigger === 'beat') {
        const beats = this.audioEngine.analyzeBeats();
        const currentBeat = beats.find(
          b => Math.abs(b.time - currentTime) < 0.05
        );
        if (currentBeat) {
          this.triggerEffect(effect);
        }
      }
    }
  }

  /**
   * Trigger a visual effect
   */
  private triggerEffect(effect: SegmentEffect): void {
    switch (effect.type) {
      case 'particles':
        this.particleManager.play(effect.assetId, {
          position: effect.position || new THREE.Vector3(0, 1, 0),
          loop: false
        });
        break;
      case 'lightLeak':
        // Add light leak overlay
        break;
      case 'lensFlare':
        // Add lens flare
        break;
    }
  }

  /**
   * Update text overlays
   */
  private updateTextOverlays(
    segment: TimelineSegment,
    currentTime: number
  ): void {
    // Text overlay rendering would be handled by 2D canvas overlay
  }

  /**
   * Update lip-sync for character
   */
  private updateLipSync(currentTime: number): void {
    const griotModel = this.models.get('model-001.glb');
    if (!griotModel) return;

    // Simple mouth animation based on time
    const mouthOpenness = Math.abs(Math.sin(currentTime * 10)) * 0.5;
    
    // Apply mouth shape morph targets
    griotModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
        // Set mouth openness
        if (child.morphTargetInfluences.length > 10) {
          child.morphTargetInfluences[10] = mouthOpenness;
        }
      }
    });
  }

  /**
   * Play character animation
   */
  private playCharacterAnimation(anim: CharacterAnimation): void {
    if (!this.mixer) return;

    const griotModel = this.models.get('model-001.glb');
    if (!griotModel) return;

    // Find animation clip
    const clips = this.animations.get('model-001.glb');
    const clip = clips?.find(c => c.name === anim.animationName);
    
    if (clip) {
      const action = this.mixer.clipAction(clip);
      action.setEffectiveWeight(anim.blendWeight);
      action.play();
    }
  }

  /**
   * Generate thumbnail from current scene
   */
  private async generateThumbnail(): Promise<Blob> {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Engine not initialized');
    }

    // Render a frame
    this.renderer.render(this.scene, this.camera);
    
    // Get image data
    const canvas = this.renderer.domElement;
    
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

    // Add golden dust particles for all segments
    effects.push({
      type: 'particles',
      assetId: 'particle-001.webm',
      trigger: 'start',
      intensity: 0.5,
      position: new THREE.Vector3(0, 2, -1)
    });

    // Add beat-synced effects
    if (beats.length > 0) {
      effects.push({
        type: 'lensFlare',
        assetId: 'flare-015.png',
        trigger: 'beat',
        intensity: 0.7
      });
    }

    // Emotion-based effects
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

  private getMorphIndexForMouthShape(shape: string): number {
    const shapes: Record<string, number> = {
      'closed': 0,
      'open': 1,
      'wide': 2,
      'narrow': 3,
      'smile': 4,
      'pucker': 5
    };
    return shapes[shape] ?? 0;
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
    
    // Get duration
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
        resolve(result.split(',')[1]); // Remove data URL prefix
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
      audio.onerror = () => resolve(60); // Default duration
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
    
    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
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
  }
}

// Export singleton engine instance
export const griotDigitalEngine = new GriotDigitalEngine();
