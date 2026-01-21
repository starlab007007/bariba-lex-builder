/**
 * Village Chronicle Template - Journal TV Automatisé
 * Version: 1.0.0
 * 
 * Template pour créer des journaux télévisés automatisés
 * avec présentateur virtuel 3D et lip-sync
 */

import * as THREE from 'three';
import { Template, EffectType, TemplateCategory } from '@/components/tamtam/creator/TemplateSystem/types';
import { AssetLoader3D } from '@/lib/AssetLoader3D';
import { aiServicesHub } from '@/lib/AIServicesHub';
import { ParticleSystemManager } from '@/lib/ParticleSystemManager';

// ============================================
// TEMPLATE DEFINITION
// ============================================

export const VillageChronicleTemplate: Template = {
  id: 'village-chronicle',
  name: 'Village Chronicle - Journal du Village',
  category: 'storytelling' as TemplateCategory,
  description: 'Journal télévisé automatisé avec présentateur virtuel',
  thumbnail: '/assets/templates/village-chronicle.jpg',
  effects: [],
  metadata: {
    version: '1.0.0',
    tags: ['news', 'journal', 'tv', 'village', 'anchor']
  }
};

// Extended template config (not part of Template interface)
export const VillageChronicleConfig = {
  requiredAssets: {
    models: [], // No real GLB files available
    particles: [
      // Particles use leak-XXX.webm files via mapping
      'particles:particle-003.webm', // → leak-003.webm
      'particles:particle-011.webm', // → leak-011.webm
      'particles:particle-025.webm', // → leak-025.webm
    ],
    lightLeaks: [
      // Light leaks from 3d-models cross-folder
      'light-leak:leak-002.webm', // → 3d-models/leak-002.webm
      'light-leak:leak-007.webm', // → 3d-models/leak-007.webm
      'light-leak:leak-013.webm', // → 3d-models/leak-013.webm
    ],
    lensFlares: [
      'lens-flare:flare-008.png',
      'lens-flare:flare-019.png',
      'lens-flare:flare-045.png',
    ],
    textures: [
      // Textures use video-XXX.mp4 files via mapping
      'textures:texture-008.mp4', // → video-008.mp4
      'textures:texture-067.mp4', // → video-067.mp4
      'textures:texture-134.mp4', // → video-134.mp4
    ],
    transitions: [
      'transitions:transition-003.mp4',
    ],
    audio: [
      'audio/traditional:traditional-003.mp3', // → audio-003.mp3
      'audio/percussion:percussion-003.mp3', // → audio-007.mp3
    ],
    fonts: []
  },
  renderSettings: {
    resolution: '1080p',
    fps: 30,
    duration: 300
  },
  aiFeatures: [
    'News Director',
    'Virtual Anchor',
    'Script Generation',
    'Auto-Broadcast'
  ]
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface NewsItem {
  id: string;
  type: 'breaking' | 'main' | 'announcement' | 'weather';
  title: string;
  description: string;
  media: File[];
  priority: number; // 1-5
  timestamp: Date;
  location?: string;
  reporter?: string;
}

export interface VillageInfo {
  name: string;
  location: { lat: number; lng: number };
  weatherAPI?: string;
  motto?: string;
  population?: number;
}

export interface VillageChronicleInputs {
  village: VillageInfo;
  newsItems: NewsItem[];
  anchorVoice?: File;
  anchorPhoto?: File;
  broadcastTime: string;
  language: 'bariba' | 'french' | 'bilingual';
  duration: number; // minutes
}

export interface NewsScript {
  id: string;
  newsId: string;
  text: string;
  textBariba?: string;
  duration: number;
  cuePoints: CuePoint[];
}

export interface CuePoint {
  time: number;
  action: 'show_media' | 'transition' | 'lower_third' | 'graphic';
  data: Record<string, unknown>;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: ForecastDay[];
}

export interface ForecastDay {
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

export interface NewsShow {
  opening: ShowSegment;
  mainNews: ShowSegment[];
  secondaryNews: ShowSegment[];
  weather: ShowSegment;
  announcements: ShowSegment;
  closing: ShowSegment;
  totalDuration: number;
}

export interface ShowSegment {
  type: 'opening' | 'news' | 'weather' | 'announcement' | 'closing';
  script: NewsScript;
  media?: File[];
  graphics?: GraphicOverlay[];
  duration: number;
}

export interface GraphicOverlay {
  type: 'lower_third' | 'full_screen' | 'ticker' | 'logo';
  content: Record<string, string>;
  position: { x: number; y: number };
  animation: 'slide_in' | 'fade' | 'pop';
}

export interface VirtualAnchor {
  model: THREE.Object3D;
  voice: VoiceModel;
  lipSync: LipSyncController;
  speak: (text: string) => Promise<AudioBuffer>;
  setExpression: (expression: string) => void;
  animate: (animation: string) => void;
}

export interface VoiceModel {
  id: string;
  name: string;
  isCloned: boolean;
  language: string;
}

export interface BroadcastSchedule {
  id: string;
  time: string;
  days: string[];
  platforms: ('youtube' | 'facebook' | 'whatsapp')[];
  isActive: boolean;
}

// ============================================
// LIP SYNC CONTROLLER
// ============================================

class LipSyncController {
  private model: THREE.Object3D;
  private morphTargets: Map<string, number> = new Map();
  private animationMixer?: THREE.AnimationMixer;

  constructor(model: THREE.Object3D) {
    this.model = model;
    this.initMorphTargets();
  }

  private initMorphTargets(): void {
    const visemes = ['A', 'E', 'I', 'O', 'U', 'M', 'B', 'P', 'F', 'V', 'TH', 'L', 'rest'];
    visemes.forEach((v, i) => this.morphTargets.set(v, i));
  }

  animate(phonemes: PhonemeData[]): void {
    phonemes.forEach(phoneme => {
      setTimeout(() => {
        this.setMouthShape(phoneme.viseme);
      }, phoneme.time * 1000);
    });
  }

  private setMouthShape(viseme: string): void {
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
        const targetIndex = this.morphTargets.get(viseme) ?? 0;
        // Reset all morph targets
        child.morphTargetInfluences.fill(0);
        // Set the target viseme
        if (targetIndex < child.morphTargetInfluences.length) {
          child.morphTargetInfluences[targetIndex] = 1;
        }
      }
    });
  }

  setExpression(expression: string): void {
    console.log(`Setting expression: ${expression}`);
    // Apply facial expression blend shapes
  }
}

interface PhonemeData {
  phoneme: string;
  viseme: string;
  time: number;
  duration: number;
}

// ============================================
// VILLAGE CHRONICLE ENGINE
// ============================================

export class VillageChronicleEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private assetLoader: AssetLoader3D;
  private particleManager: ParticleSystemManager;
  private anchor?: VirtualAnchor;
  private newsShow?: NewsShow;
  private currentSegmentIndex: number = 0;
  private isPlaying: boolean = false;
  private canvas: HTMLCanvasElement;
  private ctx2D: CanvasRenderingContext2D | null = null;
  private use2DFallback: boolean = false;
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 16/9, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);
    this.camera.lookAt(0, 1.4, 0);

    // Try WebGL, fallback to 2D canvas
    try {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true,
        alpha: true 
      });
      this.renderer.setSize(1920, 1080);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.use2DFallback = false;
      console.log('[VillageChronicle] WebGL renderer initialized');
    } catch (error) {
      console.warn('[VillageChronicle] WebGL not available, using 2D fallback:', error);
      this.ctx2D = canvas.getContext('2d');
      this.use2DFallback = true;
    }

    this.assetLoader = new AssetLoader3D();
    this.particleManager = new ParticleSystemManager();
    this.isInitialized = true;
  }

  /**
   * Check if the engine is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && (this.renderer !== null || this.ctx2D !== null);
  }

  /**
   * Get engine status for debugging
   */
  getStatus(): { initialized: boolean; mode: 'webgl' | '2d'; hasAnchor: boolean } {
    return {
      initialized: this.isInitialized,
      mode: this.use2DFallback ? '2d' : 'webgl',
      hasAnchor: !!this.anchor
    };
  }

  /**
   * Draw 2D fallback studio when WebGL fails
   */
  private draw2DFallbackFrame(time: number = 0): void {
    if (!this.ctx2D) return;
    
    const ctx = this.ctx2D;
    const { width, height } = this.canvas;

    // Studio background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#1e3a5f');
    bgGradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Simple desk
    ctx.fillStyle = 'rgba(40, 60, 80, 0.9)';
    ctx.fillRect(width * 0.1, height * 0.7, width * 0.8, height * 0.15);

    // Anchor placeholder
    const anchorX = width / 2;
    const anchorY = height * 0.4;
    
    ctx.fillStyle = 'rgba(100, 140, 180, 0.7)';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY - 40, 40, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 50, 60, 70, 0, 0, Math.PI);
    ctx.fill();

    // Lower third
    ctx.fillStyle = 'rgba(180, 30, 30, 0.9)';
    ctx.fillRect(0, height * 0.85, width, height * 0.08);
    
    ctx.font = 'bold 24px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Journal du Village', width / 2, height * 0.9);
  }

  // ============================================
  // NEWS DIRECTOR - AI Content Generation
  // ============================================

  async createNewsShow(inputs: VillageChronicleInputs): Promise<NewsShow> {
    // 1. Sort news by priority
    const sortedNews = [...inputs.newsItems].sort((a, b) => b.priority - a.priority);
    
    // 2. Generate scripts for each news item
    const scripts = await Promise.all(
      sortedNews.map(news => this.generateNewsScript(news, inputs.language))
    );
    
    // 3. Get weather data
    const weather = await this.fetchWeather(inputs.village);
    const weatherScript = await this.generateWeatherReport(weather, inputs.language);
    
    // 4. Create show structure
    const show: NewsShow = {
      opening: await this.createOpening(inputs.village, inputs.language),
      mainNews: scripts.slice(0, 3).map((script, i) => ({
        type: 'news' as const,
        script,
        media: sortedNews[i].media,
        duration: script.duration
      })),
      secondaryNews: scripts.slice(3).map((script, i) => ({
        type: 'news' as const,
        script,
        media: sortedNews[i + 3]?.media,
        duration: script.duration
      })),
      weather: {
        type: 'weather' as const,
        script: weatherScript,
        duration: weatherScript.duration
      },
      announcements: await this.createAnnouncements(inputs.language),
      closing: await this.createClosing(inputs.village, inputs.language),
      totalDuration: 0
    };
    
    // Calculate total duration
    show.totalDuration = this.calculateTotalDuration(show);
    
    this.newsShow = show;
    return show;
  }

  private async generateNewsScript(
    news: NewsItem, 
    language: string
  ): Promise<NewsScript> {
    const prompt = `
      Génère un script de journal télévisé professionnel pour cette nouvelle:
      
      Type: ${news.type}
      Titre: ${news.title}
      Description: ${news.description}
      Lieu: ${news.location || 'Non spécifié'}
      
      Le script doit être:
      - Professionnel et objectif
      - Entre 30 et 60 secondes de lecture
      - ${language === 'bilingual' ? 'En français avec traduction Bariba' : `En ${language}`}
      
      Format: JSON avec { text, textBariba (si bilingue), duration, cuePoints }
    `;

    try {
      // Simplified script generation
      return {
        id: crypto.randomUUID(),
        newsId: news.id,
        text: `${news.title}. ${news.description}`,
        textBariba: undefined,
        duration: 45,
        cuePoints: []
      };
    } catch (error) {
      console.error('Script generation error:', error);
      // Fallback script
      return {
        id: crypto.randomUUID(),
        newsId: news.id,
        text: `${news.title}. ${news.description}`,
        duration: 30,
        cuePoints: []
      };
    }
  }

  private async fetchWeather(village: VillageInfo): Promise<WeatherData> {
    // Simulated weather data - in production, use actual weather API
    const conditions = ['Ensoleillé', 'Nuageux', 'Pluvieux', 'Orageux'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: 28 + Math.floor(Math.random() * 10),
      condition: randomCondition,
      humidity: 60 + Math.floor(Math.random() * 30),
      windSpeed: 5 + Math.floor(Math.random() * 15),
      forecast: [
        { day: 'Demain', high: 32, low: 24, condition: 'Ensoleillé', icon: '☀️' },
        { day: 'Après-demain', high: 30, low: 23, condition: 'Nuageux', icon: '⛅' },
        { day: 'Dans 3 jours', high: 29, low: 22, condition: 'Pluvieux', icon: '🌧️' }
      ]
    };
  }

  private async generateWeatherReport(
    weather: WeatherData, 
    language: string
  ): Promise<NewsScript> {
    const weatherText = language === 'bariba' 
      ? `Météo: ${weather.temperature}°C, ${weather.condition}. Humidité ${weather.humidity}%. Vent ${weather.windSpeed} km/h.`
      : `Voici la météo: Il fait actuellement ${weather.temperature} degrés avec un temps ${weather.condition.toLowerCase()}. 
         L'humidité est de ${weather.humidity}% et le vent souffle à ${weather.windSpeed} kilomètres par heure.
         Pour les prochains jours: ${weather.forecast.map(f => `${f.day}: ${f.high}°/${f.low}°, ${f.condition}`).join('. ')}.`;

    return {
      id: crypto.randomUUID(),
      newsId: 'weather',
      text: weatherText,
      duration: 40,
      cuePoints: [
        { time: 5, action: 'show_media', data: { type: 'weather_map' } },
        { time: 20, action: 'graphic', data: { type: 'forecast' } }
      ]
    };
  }

  private async createOpening(
    village: VillageInfo, 
    language: string
  ): Promise<ShowSegment> {
    const openingText = language === 'bariba'
      ? `${village.name} Journal. Bienvenue.`
      : `Bienvenue au Journal de ${village.name}. 
         Voici les principales informations de votre village aujourd'hui.`;

    return {
      type: 'opening',
      script: {
        id: crypto.randomUUID(),
        newsId: 'opening',
        text: openingText,
        duration: 15,
        cuePoints: [
          { time: 0, action: 'transition', data: { type: 'logo_reveal' } },
          { time: 5, action: 'lower_third', data: { text: village.name } }
        ]
      },
      duration: 15,
      graphics: [
        {
          type: 'logo',
          content: { villageName: village.name },
          position: { x: 0.5, y: 0.1 },
          animation: 'fade'
        }
      ]
    };
  }

  private async createAnnouncements(language: string): Promise<ShowSegment> {
    const text = language === 'bariba'
      ? 'Annonces du village.'
      : 'Et maintenant, les annonces de votre village.';

    return {
      type: 'announcement',
      script: {
        id: crypto.randomUUID(),
        newsId: 'announcements',
        text,
        duration: 30,
        cuePoints: []
      },
      duration: 30
    };
  }

  private async createClosing(
    village: VillageInfo, 
    language: string
  ): Promise<ShowSegment> {
    const closingText = language === 'bariba'
      ? `Merci. À demain ${village.name}.`
      : `C'était le Journal de ${village.name}. 
         Merci de nous avoir suivis et à demain pour de nouvelles informations.`;

    return {
      type: 'closing',
      script: {
        id: crypto.randomUUID(),
        newsId: 'closing',
        text: closingText,
        duration: 15,
        cuePoints: [
          { time: 10, action: 'transition', data: { type: 'logo_outro' } }
        ]
      },
      duration: 15
    };
  }

  private calculateTotalDuration(show: NewsShow): number {
    return show.opening.duration +
      show.mainNews.reduce((acc, s) => acc + s.duration, 0) +
      show.secondaryNews.reduce((acc, s) => acc + s.duration, 0) +
      show.weather.duration +
      show.announcements.duration +
      show.closing.duration;
  }

  // ============================================
  // VIRTUAL ANCHOR
  // ============================================

  async createVirtualAnchor(
    voiceSample?: File,
    photoSample?: File
  ): Promise<VirtualAnchor> {
    // Load 3D anchor model
    const anchorModel = await this.assetLoader.loadModel('model-006.glb');
    
    // Setup voice model
    let voiceModel: VoiceModel;
    if (voiceSample) {
      voiceModel = await this.cloneVoice(voiceSample);
    } else {
      voiceModel = this.getDefaultVoice();
    }
    
    // Apply face mapping if photo provided
    if (photoSample) {
      await this.applyFaceMapping(anchorModel, photoSample);
    }
    
    // Initialize lip sync
    const lipSync = new LipSyncController(anchorModel);
    
    // Add anchor to scene
    anchorModel.position.set(0, 0, 0);
    this.scene.add(anchorModel);
    
    this.anchor = {
      model: anchorModel,
      voice: voiceModel,
      lipSync,
      speak: async (text: string) => this.synthesizeSpeech(text, voiceModel, lipSync),
      setExpression: (expression: string) => lipSync.setExpression(expression),
      animate: (animation: string) => this.playAnchorAnimation(anchorModel, animation)
    };
    
    return this.anchor;
  }

  private async cloneVoice(voiceSample: File): Promise<VoiceModel> {
    // In production, use actual voice cloning API
    const audioData = await this.fileToArrayBuffer(voiceSample);
    console.log('Voice sample loaded:', audioData.byteLength, 'bytes');
    
    return {
      id: crypto.randomUUID(),
      name: 'Cloned Voice',
      isCloned: true,
      language: 'fr'
    };
  }

  private getDefaultVoice(): VoiceModel {
    return {
      id: 'default-anchor',
      name: 'Présentateur Village',
      isCloned: false,
      language: 'fr'
    };
  }

  private async applyFaceMapping(
    model: THREE.Object3D, 
    photo: File
  ): Promise<void> {
    const imageData = await this.fileToDataURL(photo);
    const texture = new THREE.TextureLoader().load(imageData);
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.includes('face')) {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  private async synthesizeSpeech(
    text: string, 
    voice: VoiceModel,
    lipSync: LipSyncController
  ): Promise<AudioBuffer> {
    // Generate speech audio
    const audioContext = new AudioContext();
    
    try {
      // Extract phonemes for lip sync
      const phonemes = await this.extractPhonemes(text);
      lipSync.animate(phonemes);
      // Return buffer with estimated duration
      const duration = text.length * 0.08;
      return audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      return audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    }
    
  }

  private async extractPhonemes(text: string): Promise<PhonemeData[]> {
    // Simplified phoneme extraction based on text
    const phonemes: PhonemeData[] = [];
    const words = text.split(' ');
    let time = 0;
    
    words.forEach(word => {
      word.split('').forEach(char => {
        const viseme = this.charToViseme(char);
        if (viseme) {
          phonemes.push({
            phoneme: char,
            viseme,
            time,
            duration: 0.08
          });
          time += 0.08;
        }
      });
      time += 0.15; // Pause between words
    });
    
    return phonemes;
  }

  private charToViseme(char: string): string | null {
    const visemeMap: Record<string, string> = {
      'a': 'A', 'à': 'A', 'â': 'A',
      'e': 'E', 'é': 'E', 'è': 'E', 'ê': 'E',
      'i': 'I', 'î': 'I', 'y': 'I',
      'o': 'O', 'ô': 'O',
      'u': 'U', 'û': 'U', 'ù': 'U',
      'm': 'M', 'n': 'M',
      'b': 'B', 'p': 'P',
      'f': 'F', 'v': 'V',
      'l': 'L', 'r': 'L',
      't': 'TH', 'd': 'TH', 's': 'TH', 'z': 'TH'
    };
    return visemeMap[char.toLowerCase()] || null;
  }

  private playAnchorAnimation(model: THREE.Object3D, animation: string): void {
    console.log(`Playing anchor animation: ${animation}`);
    // Apply animation to anchor model
  }

  // ============================================
  // STUDIO SETUP
  // ============================================

  async setupNewsStudio(): Promise<void> {
    // Clear existing scene
    while(this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // Load studio environment
    const studioDesk = await this.assetLoader.loadModel('model-007.glb');
    studioDesk.position.set(0, 0, -1);
    this.scene.add(studioDesk);

    const studioBackground = await this.assetLoader.loadModel('model-008.glb');
    studioBackground.position.set(0, 0, -5);
    this.scene.add(studioBackground);

    // Setup lighting
    this.setupStudioLighting();

    // Add news desk graphics screen
    this.addGraphicsScreen();
  }

  private setupStudioLighting(): void {
    // Key light
    const keyLight = new THREE.SpotLight(0xffffff, 1.5);
    keyLight.position.set(3, 4, 2);
    keyLight.castShadow = true;
    keyLight.angle = Math.PI / 6;
    this.scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.SpotLight(0xffffff, 0.8);
    fillLight.position.set(-3, 3, 2);
    this.scene.add(fillLight);

    // Back light
    const backLight = new THREE.SpotLight(0x6666ff, 0.5);
    backLight.position.set(0, 3, -3);
    this.scene.add(backLight);

    // Ambient
    const ambient = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambient);
  }

  private addGraphicsScreen(): void {
    // Create a screen behind the anchor for graphics
    const screenGeometry = new THREE.PlaneGeometry(3, 1.8);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x1a365d,
      side: THREE.DoubleSide 
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(1.5, 1.5, -2);
    screen.name = 'graphics_screen';
    this.scene.add(screen);
  }

  // ============================================
  // RENDERING
  // ============================================

  async render(
    inputs: VillageChronicleInputs,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Blob> {
    // 1. Setup studio
    onProgress?.(5, 'Configuration du studio');
    await this.setupNewsStudio();

    // 2. Create virtual anchor
    onProgress?.(15, 'Création du présentateur virtuel');
    await this.createVirtualAnchor(inputs.anchorVoice, inputs.anchorPhoto);

    // 3. Generate news show
    onProgress?.(30, 'Génération du journal');
    const show = await this.createNewsShow(inputs);

    // 4. Render each segment
    const chunks: Blob[] = [];
    const segments = [
      show.opening,
      ...show.mainNews,
      ...show.secondaryNews,
      show.weather,
      show.announcements,
      show.closing
    ];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentProgress = 30 + (i / segments.length) * 60;
      onProgress?.(segmentProgress, `Rendu: ${segment.type}`);

      const segmentBlob = await this.renderSegment(segment);
      chunks.push(segmentBlob);
    }

    // 5. Combine segments
    onProgress?.(95, 'Assemblage final');
    const finalVideo = await this.combineSegments(chunks);

    onProgress?.(100, 'Terminé');
    return finalVideo;
  }

  private async renderSegment(segment: ShowSegment): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = this.renderer.domElement;
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };

      // Play segment
      this.playSegment(segment, () => {
        recorder.stop();
      });

      recorder.start();
    });
  }

  private async playSegment(segment: ShowSegment, onComplete: () => void): Promise<void> {
    if (!this.anchor) {
      onComplete();
      return;
    }

    // Speak the script
    await this.anchor.speak(segment.script.text);

    // Handle cue points
    segment.script.cuePoints.forEach(cue => {
      setTimeout(() => {
        this.handleCuePoint(cue);
      }, cue.time * 1000);
    });

    // Wait for segment duration
    setTimeout(onComplete, segment.duration * 1000);
  }

  private handleCuePoint(cue: CuePoint): void {
    switch (cue.action) {
      case 'show_media':
        console.log('Showing media:', cue.data);
        break;
      case 'transition':
        console.log('Playing transition:', cue.data);
        break;
      case 'lower_third':
        this.showLowerThird(cue.data as { text: string });
        break;
      case 'graphic':
        console.log('Showing graphic:', cue.data);
        break;
    }
  }

  private showLowerThird(data: { text: string }): void {
    // Add lower third graphic to scene
    console.log('Lower third:', data.text);
  }

  private async combineSegments(segments: Blob[]): Promise<Blob> {
    // In production, use proper video concatenation
    // For now, just return all segments combined
    return new Blob(segments, { type: 'video/webm' });
  }

  // ============================================
  // BROADCAST AUTOMATION
  // ============================================

  scheduleAutoBroadcast(schedule: BroadcastSchedule): void {
    console.log('Scheduling broadcast:', schedule);
    
    // Store schedule in localStorage or database
    const schedules = JSON.parse(localStorage.getItem('broadcast_schedules') || '[]');
    schedules.push(schedule);
    localStorage.setItem('broadcast_schedules', JSON.stringify(schedules));
    
    // In production, this would set up a server-side cron job
  }

  async publishToPlatforms(
    video: Blob, 
    platforms: string[],
    metadata: { title: string; description: string }
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const platform of platforms) {
      try {
        switch (platform) {
          case 'youtube':
            results.youtube = await this.uploadToYouTube(video, metadata);
            break;
          case 'facebook':
            results.facebook = await this.uploadToFacebook(video, metadata);
            break;
          case 'whatsapp':
            results.whatsapp = await this.shareToWhatsApp(video, metadata);
            break;
        }
      } catch (error) {
        console.error(`Upload to ${platform} failed:`, error);
        results[platform] = 'error';
      }
    }
    
    return results;
  }

  private async uploadToYouTube(video: Blob, metadata: { title: string; description: string }): Promise<string> {
    // Simulated YouTube upload
    console.log('Uploading to YouTube:', metadata.title);
    return `https://youtube.com/watch?v=${crypto.randomUUID().slice(0, 11)}`;
  }

  private async uploadToFacebook(video: Blob, metadata: { title: string; description: string }): Promise<string> {
    // Simulated Facebook upload
    console.log('Uploading to Facebook:', metadata.title);
    return `https://facebook.com/video/${crypto.randomUUID()}`;
  }

  private async shareToWhatsApp(video: Blob, metadata: { title: string; description: string }): Promise<string> {
    // Create WhatsApp share link
    const text = encodeURIComponent(`${metadata.title}\n\n${metadata.description}`);
    return `https://wa.me/?text=${text}`;
  }

  // ============================================
  // UTILITIES
  // ============================================

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  private async fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ============================================
  // PREVIEW & PLAYBACK
  // ============================================

  startPreview(): void {
    this.isPlaying = true;
    this.animate();
  }

  stopPreview(): void {
    this.isPlaying = false;
  }

  private animate = (): void => {
    if (!this.isPlaying) return;

    requestAnimationFrame(this.animate);
    this.particleManager.update(0.016); // ~60fps delta
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.stopPreview();
    this.renderer.dispose();
    this.particleManager.dispose();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createVillageChronicleEngine(canvas: HTMLCanvasElement): VillageChronicleEngine {
  return new VillageChronicleEngine(canvas);
}

export default VillageChronicleTemplate;
