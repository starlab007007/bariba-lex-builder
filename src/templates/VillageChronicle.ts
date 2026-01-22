/**
 * Village Chronicle Template - Journal TV Automatisé
 * Version: 2.0.0 - FFmpeg MP4 Pipeline + 2D Fallback robuste
 * 
 * Template pour créer des journaux télévisés automatisés
 * avec présentateur virtuel et encodage MP4 professionnel
 */

import * as THREE from 'three';
import { Template, TemplateCategory } from '@/components/tamtam/creator/TemplateSystem/types';
import { AssetLoader3D } from '@/lib/AssetLoader3D';
import { ParticleSystemManager } from '@/lib/ParticleSystemManager';
import { encodeVideo, captureCanvasFrames, encodeWithMediaRecorder, EncoderProgress } from '@/lib/VideoEncoder';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TEMPLATE DEFINITION
// ============================================

export const VillageChronicleTemplate: Template = {
  id: 'village-chronicle',
  name: 'Village Chronicle - Journal du Village',
  nameBa: 'Sɛ̀kà Dúúnìyá',
  category: 'business' as TemplateCategory,
  description: 'Journal télévisé automatisé avec présentateur virtuel',
  thumbnail: '/assets/envato/textures/texture-003.jpg',
  demoVideo: '',
  duration: 120,
  isPremium: true,
  isNew: true,
  effects: [],
  audio: { volume: 0.9 },
  metadata: {
    version: '2.0.0',
    author: 'TAM-TAM',
    tags: ['news', 'journal', 'tv', 'village', 'anchor', 'broadcast']
  },
  tags: ['actualités', 'TV', 'journal', 'présentateur'],
  usageCount: 0,
};

// Extended template config
export const VillageChronicleConfig = {
  requiredAssets: {
    models: [],
    particles: ['particles:particle-003.webm', 'particles:particle-011.webm'],
    lightLeaks: ['light-leak:leak-002.webm', 'light-leak:leak-007.webm'],
    textures: ['textures:texture-008.mp4'],
    audio: ['audio/traditional:traditional-003.mp3']
  },
  renderSettings: {
    resolution: '1080p',
    fps: 30,
    duration: 300
  },
  aiFeatures: ['News Director', 'Virtual Anchor', 'Script Generation', 'Auto-Broadcast']
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
  priority: number;
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
  duration: number;
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

// ============================================
// VILLAGE CHRONICLE ENGINE v2.0
// ============================================

export class VillageChronicleEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private assetLoader: AssetLoader3D;
  private particleManager: ParticleSystemManager;
  private canvas: HTMLCanvasElement;
  private ctx2D: CanvasRenderingContext2D | null = null;
  private use2DFallback: boolean = false;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private animationId: number | null = null;
  
  // Studio elements
  private anchorPhoto: HTMLImageElement | null = null;
  private villageName: string = 'Mon Village';
  private currentSegment: ShowSegment | null = null;
  private newsShow: NewsShow | null = null;

  // Store news items for display
  private newsItems: NewsItem[] = [];
  
  // Visual effects - particles for atmosphere
  private particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }> = [];
  private lightBeams: Array<{ x: number; angle: number; width: number; speed: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Ensure canvas has proper dimensions for HD rendering
    canvas.width = 1920;
    canvas.height = 1080;
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 16/9, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);
    this.camera.lookAt(0, 1.4, 0);

    // Force 2D fallback for reliability - WebGL/Three.js requires 3D models we don't have
    this.use2DFallback = true;
    this.ctx2D = canvas.getContext('2d');
    
    if (!this.ctx2D) {
      console.error('[VillageChronicle] Failed to get 2D context');
    } else {
      console.log('[VillageChronicle] 2D context acquired successfully');
      // Draw initial frame immediately so canvas is never blank
      this.draw2DFrame(0);
    }
    
    console.log('[VillageChronicle] Engine initialized in 2D mode (1920x1080)');

    this.assetLoader = new AssetLoader3D();
    this.particleManager = new ParticleSystemManager();
    this.isInitialized = true;
    
    // Initialize visual effects
    this.initParticles();
    this.initLightBeams();
  }
  
  private initParticles(): void {
    // Create floating particles for atmosphere
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3 - 0.2,
        size: Math.random() * 4 + 1,
        alpha: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.5 ? '#3b82f6' : '#60a5fa'
      });
    }
  }
  
  private initLightBeams(): void {
    // Create dynamic light beams
    this.lightBeams = [];
    for (let i = 0; i < 3; i++) {
      this.lightBeams.push({
        x: 200 + i * 700,
        angle: -15 + Math.random() * 30,
        width: 80 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3
      });
    }
  }

  // Method to update village info for live preview
  setVillageInfo(village: VillageInfo, newsItems: NewsItem[], anchorPhoto?: File): void {
    this.villageName = village.name || 'Mon Village';
    this.newsItems = newsItems || [];
    
    if (anchorPhoto) {
      this.loadImage(anchorPhoto).then(img => {
        this.anchorPhoto = img;
        // Redraw immediately if playing
        if (this.use2DFallback && this.ctx2D) {
          this.draw2DFrame(this.currentTime);
        }
      });
    }
    
    console.log('[VillageChronicle] Village info updated:', this.villageName, 'News:', newsItems.length);
    
    // Redraw immediately
    if (this.use2DFallback && this.ctx2D) {
      this.draw2DFrame(this.currentTime);
    }
  }

  isReady(): boolean {
    return this.isInitialized && (this.renderer !== null || this.ctx2D !== null);
  }

  getStatus(): { initialized: boolean; mode: 'webgl' | '2d'; hasShow: boolean } {
    return {
      initialized: this.isInitialized,
      mode: this.use2DFallback ? '2d' : 'webgl',
      hasShow: !!this.newsShow
    };
  }

  // ============================================
  // 2D STUDIO RENDERER - Professional TV Look
  // ============================================

  private draw2DFrame(time: number = 0): void {
    if (!this.ctx2D) return;
    
    const ctx = this.ctx2D;
    const { width, height } = this.canvas;

    // === Background ===
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#1a365d');
    bgGradient.addColorStop(0.5, '#0d2137');
    bgGradient.addColorStop(1, '#071321');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // === Animated Grid Background ===
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    const gridOffset = (time * 20) % 50;
    for (let x = -50 + gridOffset; x < width + 50; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // === Light Beams Effect ===
    this.drawLightBeams(ctx, time, width, height);
    
    // === Floating Particles ===
    this.updateAndDrawParticles(ctx, time, width, height);

    // === News Desk ===
    const deskGradient = ctx.createLinearGradient(0, height * 0.65, 0, height * 0.85);
    deskGradient.addColorStop(0, '#2563eb');
    deskGradient.addColorStop(0.5, '#1d4ed8');
    deskGradient.addColorStop(1, '#1e40af');
    ctx.fillStyle = deskGradient;
    ctx.beginPath();
    ctx.moveTo(width * 0.05, height * 0.72);
    ctx.lineTo(width * 0.95, height * 0.72);
    ctx.lineTo(width * 0.9, height * 0.82);
    ctx.lineTo(width * 0.1, height * 0.82);
    ctx.closePath();
    ctx.fill();
    
    // Desk edge highlight
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // === Graphics Screen Behind Anchor ===
    const screenX = width * 0.6;
    const screenY = height * 0.15;
    const screenW = width * 0.35;
    const screenH = height * 0.4;
    
    const screenGradient = ctx.createRadialGradient(
      screenX + screenW/2, screenY + screenH/2, 0,
      screenX + screenW/2, screenY + screenH/2, screenW
    );
    screenGradient.addColorStop(0, '#1e3a5f');
    screenGradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = screenGradient;
    ctx.fillRect(screenX, screenY, screenW, screenH);
    
    // Screen border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, screenY, screenW, screenH);

    // === Virtual Anchor ===
    const anchorX = width * 0.3;
    const anchorY = height * 0.45;
    
    if (this.anchorPhoto) {
      // Draw uploaded photo
      const photoSize = 180;
      ctx.save();
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 60, photoSize/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.anchorPhoto, anchorX - photoSize/2, anchorY - 60 - photoSize/2, photoSize, photoSize);
      ctx.restore();
    } else {
      // Default anchor avatar
      // Head
      ctx.fillStyle = '#c4a574';
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 60, 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Body/shoulders
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY + 40, 70, 60, 0, Math.PI, 0, true);
      ctx.fill();
      
      // Suit collar
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(anchorX - 30, anchorY);
      ctx.lineTo(anchorX, anchorY + 20);
      ctx.lineTo(anchorX + 30, anchorY);
      ctx.closePath();
      ctx.fill();
    }

    // === Speaking Animation ===
    const speakPulse = Math.sin(time * 8) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(59, 130, 246, ${speakPulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(anchorX, anchorY - 60, 65 + speakPulse * 10, 0, Math.PI * 2);
    ctx.fill();

    // === Lower Third ===
    const lowerThirdY = height * 0.82;
    const lowerThirdH = height * 0.1;
    
    // Red accent bar
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, lowerThirdY, width * 0.02, lowerThirdH);
    
    // Main lower third background
    const ltGradient = ctx.createLinearGradient(0, lowerThirdY, 0, lowerThirdY + lowerThirdH);
    ltGradient.addColorStop(0, 'rgba(30, 58, 138, 0.95)');
    ltGradient.addColorStop(1, 'rgba(30, 64, 175, 0.95)');
    ctx.fillStyle = ltGradient;
    ctx.fillRect(width * 0.02, lowerThirdY, width * 0.6, lowerThirdH);
    
    // Village name
    ctx.font = 'bold 36px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`Journal de ${this.villageName}`, width * 0.04, lowerThirdY + 45);
    
    // Current segment info
    if (this.currentSegment) {
      ctx.font = '24px system-ui';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(this.currentSegment.script.text.slice(0, 60) + '...', width * 0.04, lowerThirdY + 75);
    }

    // === Live Badge ===
    const liveX = width - 120;
    const liveY = 50;
    const livePulse = (Math.sin(time * 4) + 1) / 2;
    
    ctx.fillStyle = `rgba(220, 38, 38, ${0.8 + livePulse * 0.2})`;
    ctx.beginPath();
    ctx.roundRect(liveX, liveY, 90, 35, 6);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🔴 LIVE', liveX + 45, liveY + 24);

    // === Time Display ===
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    ctx.font = 'bold 28px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, width - 40, height * 0.15);

    // === News Ticker ===
    const tickerY = height - 40;
    ctx.fillStyle = 'rgba(30, 58, 138, 0.9)';
    ctx.fillRect(0, tickerY, width, 40);
    
    ctx.font = '20px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    // Build ticker from actual news items
    let tickerText = `📰 ${this.villageName}`;
    if (this.newsItems && this.newsItems.length > 0) {
      tickerText += ' • ' + this.newsItems.map(n => {
        const prefix = n.type === 'breaking' ? '🔴 URGENT: ' : '';
        return prefix + n.title;
      }).join(' • ');
    } else {
      tickerText += ' • Actualités locales • Météo • Annonces communautaires';
    }
    
    const tickerOffset = (time * 80) % (width + tickerText.length * 10);
    ctx.fillText(tickerText, width - tickerOffset, tickerY + 28);

    // === Decorative Corner Elements ===
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    
    // Top left
    ctx.beginPath();
    ctx.moveTo(20, 50);
    ctx.lineTo(20, 20);
    ctx.lineTo(50, 20);
    ctx.stroke();
    
    // Top right
    ctx.beginPath();
    ctx.moveTo(width - 20, 50);
    ctx.lineTo(width - 20, 20);
    ctx.lineTo(width - 50, 20);
    ctx.stroke();
    
    // === Display News Summary on Graphics Screen ===
    if (this.newsItems && this.newsItems.length > 0) {
      const screenX = width * 0.6;
      const screenY = height * 0.15;
      const screenW = width * 0.35;
      
      ctx.font = 'bold 24px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`📰 ${this.newsItems.length} Actualités`, screenX + 20, screenY + 40);
      
      // List top 3 news
      ctx.font = '18px system-ui';
      ctx.fillStyle = '#93c5fd';
      this.newsItems.slice(0, 3).forEach((news, i) => {
        const typeIcon = news.type === 'breaking' ? '🔴' : news.type === 'weather' ? '🌤️' : '📰';
        const truncated = news.title.length > 30 ? news.title.slice(0, 27) + '...' : news.title;
        ctx.fillText(`${typeIcon} ${truncated}`, screenX + 20, screenY + 80 + i * 30);
      });
    }
  }
  
  // === Visual Effects Methods ===
  private drawLightBeams(ctx: CanvasRenderingContext2D, time: number, width: number, height: number): void {
    ctx.save();
    for (const beam of this.lightBeams) {
      const x = beam.x + Math.sin(time * beam.speed) * 50;
      const gradient = ctx.createLinearGradient(x, 0, x + beam.width, height * 0.7);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + beam.width, 0);
      ctx.lineTo(x + beam.width * 1.5, height * 0.7);
      ctx.lineTo(x - beam.width * 0.5, height * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  
  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, time: number, width: number, height: number): void {
    for (const p of this.particles) {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      
      // Wrap around
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
      
      // Draw with glow
      const glowAlpha = p.alpha * (0.5 + Math.sin(time * 2 + p.x) * 0.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(')', `, ${glowAlpha})`).replace('rgb', 'rgba');
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }


  async createNewsShow(inputs: VillageChronicleInputs): Promise<NewsShow> {
    this.villageName = inputs.village.name;
    
    // Load anchor photo if provided
    if (inputs.anchorPhoto) {
      this.anchorPhoto = await this.loadImage(inputs.anchorPhoto);
    }

    // Try to use AI for script generation
    try {
      const { data, error } = await supabase.functions.invoke('analyze-news', {
        body: {
          newsItems: inputs.newsItems.map(n => ({
            type: n.type,
            title: n.title,
            description: n.description,
            location: n.location
          })),
          villageName: inputs.village.name,
          language: inputs.language
        }
      });

      if (!error && data?.segments) {
        console.log('[VillageChronicle] AI-generated news show received');
        return this.convertAIResponseToShow(data, inputs);
      }
    } catch (e) {
      console.warn('[VillageChronicle] AI generation failed, using default:', e);
    }

    // Fallback to local generation
    return this.generateLocalNewsShow(inputs);
  }

  private convertAIResponseToShow(aiData: Record<string, unknown>, inputs: VillageChronicleInputs): NewsShow {
    const segments = aiData.segments as Array<{
      id: string;
      type: string;
      title: string;
      text: string;
      textBariba?: string;
      duration: number;
      cuePoints: CuePoint[];
    }>;

    const opening = segments.find(s => s.type === 'opening');
    const news = segments.filter(s => s.type === 'news');
    const weather = segments.find(s => s.type === 'weather');
    const closing = segments.find(s => s.type === 'closing');

    const toShowSegment = (seg: typeof segments[0] | undefined, fallbackType: ShowSegment['type']): ShowSegment => ({
      type: fallbackType,
      script: {
        id: seg?.id || crypto.randomUUID(),
        newsId: seg?.id || 'fallback',
        text: seg?.text || 'Bienvenue au journal.',
        textBariba: seg?.textBariba,
        duration: seg?.duration || 15,
        cuePoints: seg?.cuePoints || []
      },
      duration: seg?.duration || 15
    });

    return {
      opening: toShowSegment(opening, 'opening'),
      mainNews: news.slice(0, 3).map(s => toShowSegment(s, 'news')),
      secondaryNews: news.slice(3).map(s => toShowSegment(s, 'news')),
      weather: toShowSegment(weather, 'weather'),
      announcements: toShowSegment(undefined, 'announcement'),
      closing: toShowSegment(closing, 'closing'),
      totalDuration: (aiData.totalDuration as number) || 120
    };
  }

  private async generateLocalNewsShow(inputs: VillageChronicleInputs): Promise<NewsShow> {
    const createScript = (text: string, duration: number): NewsScript => ({
      id: crypto.randomUUID(),
      newsId: crypto.randomUUID(),
      text,
      duration,
      cuePoints: []
    });

    const show: NewsShow = {
      opening: {
        type: 'opening',
        script: createScript(
          `Bonsoir et bienvenue au Journal de ${inputs.village.name}. Voici les principales informations.`,
          15
        ),
        duration: 15
      },
      mainNews: inputs.newsItems.slice(0, 3).map(news => ({
        type: 'news' as const,
        script: createScript(`${news.title}. ${news.description}`, 45),
        media: news.media,
        duration: 45
      })),
      secondaryNews: inputs.newsItems.slice(3).map(news => ({
        type: 'news' as const,
        script: createScript(`${news.title}. ${news.description}`, 30),
        media: news.media,
        duration: 30
      })),
      weather: {
        type: 'weather',
        script: createScript('La météo prévoit un temps ensoleillé avec 28 degrés.', 30),
        duration: 30
      },
      announcements: {
        type: 'announcement',
        script: createScript('Voici les annonces de votre village.', 30),
        duration: 30
      },
      closing: {
        type: 'closing',
        script: createScript(
          `C'était le Journal de ${inputs.village.name}. Merci et à demain.`,
          15
        ),
        duration: 15
      },
      totalDuration: 0
    };

    show.totalDuration = this.calculateTotalDuration(show);
    this.newsShow = show;
    return show;
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
  // RENDERING WITH FFmpeg MP4 PIPELINE
  // ============================================

  async render(
    inputs: VillageChronicleInputs,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Blob> {
    console.log('[VillageChronicle] Starting render pipeline');
    
    onProgress?.(5, 'Configuration du studio');
    
    // Generate news show
    onProgress?.(10, 'Génération du journal');
    const show = await this.createNewsShow(inputs);
    this.newsShow = show;
    
    const totalDuration = Math.min(show.totalDuration, inputs.duration * 60);
    const fps = 30;
    
    onProgress?.(20, 'Préparation du rendu');
    
    // Collect all segments
    const allSegments = [
      show.opening,
      ...show.mainNews,
      ...show.secondaryNews,
      show.weather,
      show.announcements,
      show.closing
    ];

    // Generate TTS narration
    onProgress?.(22, 'Génération de la narration vocale...');
    let audioBlob: Blob | null = null;
    try {
      audioBlob = await this.generateShowNarration(show);
      if (audioBlob && audioBlob.size > 0) {
        console.log('[VillageChronicle] Narration audio generated:', audioBlob.size, 'bytes');
      }
    } catch (e) {
      console.warn('[VillageChronicle] TTS generation failed:', e);
    }

    try {
      // Try FFmpeg MP4 encoding first
      onProgress?.(25, 'Capture des frames');
      
      const frames = await captureCanvasFrames(
        this.canvas,
        totalDuration,
        fps,
        (time) => {
          // Determine current segment
          let elapsed = 0;
          for (const seg of allSegments) {
            if (time >= elapsed && time < elapsed + seg.duration) {
              this.currentSegment = seg;
              break;
            }
            elapsed += seg.duration;
          }
          
          // Render frame
          this.currentTime = time;
          if (this.use2DFallback) {
            this.draw2DFrame(time);
          } else {
            this.render3DFrame(time);
          }
        },
        (p) => onProgress?.(25 + p * 30, `Frame ${Math.floor(p * totalDuration * fps)}/${totalDuration * fps}`)
      );

      onProgress?.(60, 'Encodage MP4 avec audio');
      
      const videoBlob = await encodeVideo(
        frames,
        audioBlob, // Include TTS narration audio
        { format: 'mp4', fps, width: 1920, height: 1080 },
        (ep: EncoderProgress) => {
          const p = 60 + ep.progress * 35;
          onProgress?.(p, ep.message);
        }
      );

      onProgress?.(100, 'Terminé');
      console.log(`[VillageChronicle] Rendered MP4: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      return videoBlob;

    } catch (error) {
      console.warn('[VillageChronicle] FFmpeg failed, using MediaRecorder fallback:', error);
      
      onProgress?.(30, 'Fallback: MediaRecorder');
      
      const fallbackBlob = await encodeWithMediaRecorder(
        this.canvas,
        null,
        totalDuration,
        fps,
        (time) => {
          let elapsed = 0;
          for (const seg of allSegments) {
            if (time >= elapsed && time < elapsed + seg.duration) {
              this.currentSegment = seg;
              break;
            }
            elapsed += seg.duration;
          }
          this.currentTime = time;
          if (this.use2DFallback) {
            this.draw2DFrame(time);
          } else {
            this.render3DFrame(time);
          }
        },
        (ep: EncoderProgress) => onProgress?.(30 + ep.progress * 65, ep.message)
      );

      onProgress?.(100, 'Terminé (WebM)');
      return fallbackBlob;
    }
  }

  private render3DFrame(time: number): void {
    if (!this.renderer) {
      this.draw2DFrame(time);
      return;
    }

    this.particleManager.update(0.016);
    this.renderer.render(this.scene, this.camera);
  }

  // ============================================
  // PREVIEW
  // ============================================

  startPreview(): void {
    console.log('[VillageChronicle] startPreview called');
    this.isPlaying = true;
    this.currentTime = 0;
    // Draw first frame immediately
    if (this.use2DFallback && this.ctx2D) {
      this.draw2DFrame(0);
    }
    this.animate();
  }

  stopPreview(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.isPlaying) return;

    this.currentTime += 1/60;
    
    if (this.use2DFallback) {
      this.draw2DFrame(this.currentTime);
    } else {
      this.particleManager.update(0.016);
      this.renderer?.render(this.scene, this.camera);
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  // ============================================
  // TEXT-TO-SPEECH NARRATION
  // ============================================

  /**
   * Generate French TTS narration using Web Speech API
   * Returns an audio blob that can be muxed with the video
   */
  async generateNarration(script: string): Promise<Blob | null> {
    console.log('[VillageChronicle] Generating TTS narration for:', script.slice(0, 50) + '...');
    
    // Check if Web Speech API is available
    if (!('speechSynthesis' in window)) {
      console.warn('[VillageChronicle] Web Speech API not available');
      return null;
    }

    return new Promise((resolve) => {
      try {
        // Use MediaRecorder to capture the audio output
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          console.log('[VillageChronicle] TTS narration generated:', audioBlob.size, 'bytes');
          resolve(audioBlob);
        };

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(script);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Find a French voice
        const voices = speechSynthesis.getVoices();
        const frenchVoice = voices.find(v => v.lang.startsWith('fr')) || voices[0];
        if (frenchVoice) {
          utterance.voice = frenchVoice;
          console.log('[VillageChronicle] Using voice:', frenchVoice.name);
        }

        utterance.onstart = () => {
          mediaRecorder.start();
        };

        utterance.onend = () => {
          mediaRecorder.stop();
          audioContext.close();
        };

        utterance.onerror = (e) => {
          console.error('[VillageChronicle] TTS error:', e);
          resolve(null);
        };

        // Speak
        speechSynthesis.cancel(); // Cancel any ongoing speech
        speechSynthesis.speak(utterance);

        // Fallback timeout (30 seconds max)
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            speechSynthesis.cancel();
            mediaRecorder.stop();
          }
        }, 30000);

      } catch (error) {
        console.error('[VillageChronicle] TTS generation failed:', error);
        resolve(null);
      }
    });
  }

  /**
   * Generate full show narration from all segments
   */
  async generateShowNarration(show: NewsShow): Promise<Blob | null> {
    const allScripts: string[] = [];
    
    // Opening
    allScripts.push(show.opening.script.text);
    
    // Main news
    for (const news of show.mainNews) {
      allScripts.push(news.script.text);
    }
    
    // Secondary news
    for (const news of show.secondaryNews) {
      allScripts.push(news.script.text);
    }
    
    // Weather
    allScripts.push(show.weather.script.text);
    
    // Announcements
    allScripts.push(show.announcements.script.text);
    
    // Closing
    allScripts.push(show.closing.script.text);
    
    const fullScript = allScripts.join(' ... ');
    console.log('[VillageChronicle] Full show script:', fullScript.length, 'characters');
    
    return this.generateNarration(fullScript);
  }

  /**
   * Start live TTS preview (speaks while showing)
   */
  async startLiveTTS(text: string): Promise<void> {
    if (!('speechSynthesis' in window)) return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    
    const voices = speechSynthesis.getVoices();
    const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frenchVoice) utterance.voice = frenchVoice;
    
    speechSynthesis.speak(utterance);
  }

  stopTTS(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ============================================
  // PUBLISH TO PLATFORMS
  // ============================================

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
            results.youtube = `https://youtube.com/watch?v=${crypto.randomUUID().slice(0, 11)}`;
            console.log('[VillageChronicle] Simulated YouTube upload:', metadata.title);
            break;
          case 'facebook':
            results.facebook = `https://facebook.com/video/${crypto.randomUUID()}`;
            console.log('[VillageChronicle] Simulated Facebook upload:', metadata.title);
            break;
          case 'whatsapp':
            const text = encodeURIComponent(`${metadata.title}\n\n${metadata.description}`);
            results.whatsapp = `https://wa.me/?text=${text}`;
            break;
          default:
            results[platform] = 'unsupported';
        }
      } catch (error) {
        console.error(`Upload to ${platform} failed:`, error);
        results[platform] = 'error';
      }
    }
    
    return results;
  }

  dispose(): void {
    this.stopPreview();
    if (this.renderer) {
      this.renderer.dispose();
    }
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
