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
import { encodeVideo, captureCanvasFrames, encodeWithMediaRecorder, EncoderProgress, concatAudioBlobs } from '@/lib/VideoEncoder';
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
  temperature?: number;
  weatherIcon?: 'sunny' | 'cloudy' | 'rainy';
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
  
  // Cache for preloaded media images from news items
  private mediaCache: Map<string, HTMLImageElement> = new Map();

  // Cache for preloaded media videos from news items
  private videoCache: Map<string, HTMLVideoElement> = new Map();

  // Track media type per key (URL or file:filename)
  private mediaTypeCache: Map<string, 'image' | 'video'> = new Map();
  
  // Track media loading state for retry system
  private mediaLoadingState: Map<string, { attempts: number; loading: boolean; error: boolean }> = new Map();
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1500;
  
  // Track which media URL to display currently
  private currentMediaUrl: string | null = null;
  
  // Animation state for segment transitions
  private segmentAnimation: {
    phase: 'idle' | 'exit' | 'enter';
    progress: number;
    startTime: number;
    duration: number;
    currentSegmentIndex: number;
  } = { phase: 'idle', progress: 0, startTime: 0, duration: 0.8, currentSegmentIndex: -1 };
  
  // Subtitle synchronization state
  private subtitleState: {
    currentText: string;
    targetText: string;
    charIndex: number;
    lastCharTime: number;
    visible: boolean;
    fadeAlpha: number;
  } = { currentText: '', targetText: '', charIndex: 0, lastCharTime: 0, visible: false, fadeAlpha: 0 };
  
  // Visual effects - particles for atmosphere
  private particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }> = [];
  private lightBeams: Array<{ x: number; angle: number; width: number; speed: number }> = [];
  
  // Premium VFX - video/image overlays from CDN
  private premiumEffects: {
    lightLeaks: HTMLVideoElement[];
    particles: HTMLVideoElement[];
    textures: HTMLVideoElement[];
    lensFlares: HTMLImageElement[];
  } = {
    lightLeaks: [],
    particles: [],
    textures: [],
    lensFlares: []
  };
  private premiumEffectsLoaded: boolean = false;
  
  // Media loading progress callback
  private onMediaLoadProgress?: (loaded: number, total: number, currentUrl: string) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Use 720p for faster preview rendering (upgrade to 1080p for HD export)
    canvas.width = 1280;
    canvas.height = 720;
    
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
    
    console.log('[VillageChronicle] Engine initialized in 2D mode (1280x720 preview)');

    this.assetLoader = new AssetLoader3D();
    this.particleManager = new ParticleSystemManager();
    this.isInitialized = true;
    
    // Initialize visual effects
    this.initParticles();
    this.initLightBeams();
    
    // Load premium VFX assets from CDN (non-blocking)
    this.loadPremiumEffects();
  }
  
  /**
   * Load premium visual effects from CDN (particles, light leaks, textures, lens flares)
   * This runs in the background and effects appear once loaded
   */
  private async loadPremiumEffects(): Promise<void> {
    console.log('[VillageChronicle] Loading premium VFX from CDN...');
    
    const config = VillageChronicleConfig.requiredAssets;
    const cdnBase = 'https://pmrhezgnyffiskbaiudb.supabase.co/storage/v1/object/public/envato-assets';
    
    // Helper to load video element
    const loadVideo = (url: string): Promise<HTMLVideoElement | null> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        
        const timeout = setTimeout(() => {
          console.warn('[VillageChronicle] Video timeout:', url);
          resolve(null);
        }, 8000);
        
        video.onloadeddata = () => {
          clearTimeout(timeout);
          video.play().catch(() => {});
          console.log('[VillageChronicle] ✅ Loaded VFX video:', url.slice(-40));
          resolve(video);
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          console.warn('[VillageChronicle] ⚠️ Failed to load:', url.slice(-40));
          resolve(null);
        };
        
        video.src = url;
      });
    };
    
    // Helper to load image element
    const loadImage = (url: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const timeout = setTimeout(() => resolve(null), 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log('[VillageChronicle] ✅ Loaded lens flare:', url.slice(-40));
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        
        img.src = url;
      });
    };
    
    // Load light leaks (use 3d-models folder which contains leak-XXX.webm files)
    const lightLeakPromises = config.lightLeaks.map(id => {
      // light-leak:leak-XXX.webm -> 3d-models/leak-XXX.webm
      const filename = id.split(':')[1] || id;
      const url = `${cdnBase}/3d-models/${filename}`;
      return loadVideo(url);
    });
    
    // Load particle effects (use 3d-models folder with leak-XXX.webm as particles)
    const particlePromises = config.particles.map(id => {
      // particles:particle-003.webm -> 3d-models/leak-003.webm
      const match = id.match(/particle-(\d+)/);
      const num = match ? match[1] : '001';
      const url = `${cdnBase}/3d-models/leak-${num}.webm`;
      return loadVideo(url);
    });
    
    // Load textures (video textures)
    const texturePromises = config.textures.map(id => {
      // textures:texture-008.mp4 -> textures/video-008.mp4
      const match = id.match(/texture-(\d+)/);
      const num = match ? match[1] : '001';
      const url = `${cdnBase}/textures/video-${num}.mp4`;
      return loadVideo(url);
    });
    
    // Load lens flares (PNG images from local)
    const lensFlarePromises = ['flare-015.png', 'flare-032.png', 'flare-088.png'].map(filename => {
      const url = `/assets/envato/lens-flare/${filename}`;
      return loadImage(url);
    });
    
    try {
      const [lightLeaks, particles, textures, lensFlares] = await Promise.all([
        Promise.all(lightLeakPromises),
        Promise.all(particlePromises),
        Promise.all(texturePromises),
        Promise.all(lensFlarePromises)
      ]);
      
      this.premiumEffects.lightLeaks = lightLeaks.filter((v): v is HTMLVideoElement => v !== null);
      this.premiumEffects.particles = particles.filter((v): v is HTMLVideoElement => v !== null);
      this.premiumEffects.textures = textures.filter((v): v is HTMLVideoElement => v !== null);
      this.premiumEffects.lensFlares = lensFlares.filter((v): v is HTMLImageElement => v !== null);
      
      this.premiumEffectsLoaded = true;
      
      console.log('[VillageChronicle] Premium VFX loaded:', {
        lightLeaks: this.premiumEffects.lightLeaks.length,
        particles: this.premiumEffects.particles.length,
        textures: this.premiumEffects.textures.length,
        lensFlares: this.premiumEffects.lensFlares.length
      });
      
      // Redraw to show effects
      if (this.use2DFallback && this.ctx2D) {
        this.draw2DFrame(this.currentTime);
      }
    } catch (e) {
      console.warn('[VillageChronicle] Premium VFX loading failed:', e);
    }
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
    
    // Preload media from news items (uploaded URLs stored in newsItems)
    this.preloadNewsMedia(newsItems);
    
    console.log('[VillageChronicle] Village info updated:', this.villageName, 'News:', newsItems.length);
    
    // Redraw immediately
    if (this.use2DFallback && this.ctx2D) {
      this.draw2DFrame(this.currentTime);
    }
  }
  
  // Preload media images from uploaded news items (non-blocking) with retry system
  private preloadNewsMedia(newsItems: NewsItem[]): void {
    console.log('[VillageChronicle] Starting non-blocking media preload for', newsItems.length, 'news items');
    
    // Collect all URLs to load
    const allUrls: { url: string; newsTitle: string; isFile: boolean; file?: File; kind: 'image' | 'video' | 'unknown' }[] = [];
    
    for (const news of newsItems) {
      const newsAny = news as any;
      const urls: string[] = newsAny.mediaUrls || [];
      
      for (const url of urls) {
        if (url) {
          allUrls.push({ url, newsTitle: news.title, isFile: false, kind: this.isLikelyVideoUrl(url) ? 'video' : 'unknown' });
        }
      }
      
      // Also handle File objects if present
      if (news.media && news.media.length > 0) {
        for (const file of news.media) {
          if (file.type.startsWith('image/')) {
            allUrls.push({ url: `file:${file.name}`, newsTitle: news.title, isFile: true, file, kind: 'image' });
          } else if (file.type.startsWith('video/')) {
            allUrls.push({ url: `file:${file.name}`, newsTitle: news.title, isFile: true, file, kind: 'video' });
          }
        }
      }
    }
    
    const totalMedia = allUrls.length;
    let loadedCount = 0;
    
    // Run preloading with retry system
    const loadWithRetry = async (item: typeof allUrls[0]) => {
      const key = item.url;
      
      // Skip if already cached
      if (this.mediaCache.has(key) || this.videoCache.has(key)) {
        loadedCount++;
        return;
      }
      
      // Initialize loading state
      if (!this.mediaLoadingState.has(key)) {
        this.mediaLoadingState.set(key, { attempts: 0, loading: false, error: false });
      }
      
      const state = this.mediaLoadingState.get(key)!;
      
      // Skip if max retries exceeded
      if (state.attempts >= VillageChronicleEngine.MAX_RETRY_ATTEMPTS) {
        console.warn('[VillageChronicle] ⛔ Max retries reached for:', key.slice(-40));
        return;
      }
      
      state.loading = true;
      state.attempts++;
      
      try {
        // Decide how to load this media
        if (item.kind === 'video') {
          const vid = item.isFile && item.file ? await this.loadVideo(item.file) : await this.loadVideoFromUrl(item.url);
          this.videoCache.set(key, vid);
          this.mediaTypeCache.set(key, 'video');
        } else if (item.kind === 'image') {
          const img = item.isFile && item.file ? await this.loadImage(item.file) : await this.loadImageFromUrl(item.url);
          this.mediaCache.set(key, img);
          this.mediaTypeCache.set(key, 'image');
        } else {
          // Unknown (usually public URL): try image first, then video
          try {
            const img = await this.loadImageFromUrl(item.url);
            this.mediaCache.set(key, img);
            this.mediaTypeCache.set(key, 'image');
          } catch {
            const vid = await this.loadVideoFromUrl(item.url);
            this.videoCache.set(key, vid);
            this.mediaTypeCache.set(key, 'video');
          }
        }

        state.loading = false;
        state.error = false;
        loadedCount++;
        
        console.log(`[VillageChronicle] ✅ Preloaded media (${loadedCount}/${totalMedia}):`, key.slice(-40));
        
        // Notify progress callback
        this.onMediaLoadProgress?.(loadedCount, totalMedia, key);
        
        // Trigger redraw to show newly loaded media
        if (this.use2DFallback && this.ctx2D) {
          this.draw2DFrame(this.currentTime);
        }
        
      } catch (e) {
        state.loading = false;
        state.error = true;
        console.warn(`[VillageChronicle] ⚠️ Load attempt ${state.attempts}/${VillageChronicleEngine.MAX_RETRY_ATTEMPTS} failed:`, key.slice(-40));
        
        // Schedule retry after delay
        if (state.attempts < VillageChronicleEngine.MAX_RETRY_ATTEMPTS) {
          setTimeout(() => {
            loadWithRetry(item);
          }, VillageChronicleEngine.RETRY_DELAY_MS * state.attempts);
        }
      }
    };
    
    // Start loading all media in parallel (max 4 concurrent)
    const loadBatch = async () => {
      const batchSize = 4;
      for (let i = 0; i < allUrls.length; i += batchSize) {
        const batch = allUrls.slice(i, i + batchSize);
        await Promise.all(batch.map(item => loadWithRetry(item)));
      }
      console.log(`[VillageChronicle] Media preload complete. Cache: ${this.mediaCache.size}/${totalMedia}`);
    };
    
    // Run without awaiting - don't block initialization
    loadBatch().catch(e => console.warn('[VillageChronicle] Background preload error:', e));
  }
  
  // Set callback for media loading progress
  setMediaLoadProgressCallback(callback: (loaded: number, total: number, currentUrl: string) => void): void {
    this.onMediaLoadProgress = callback;
  }
  
  // Get media loading status for UI
  getMediaLoadingStatus(): { total: number; loaded: number; loading: number; errors: number } {
    let loaded = 0, loading = 0, errors = 0;
    this.mediaLoadingState.forEach(state => {
      if (this.mediaCache.has([...this.mediaLoadingState.keys()].find(k => this.mediaLoadingState.get(k) === state) || '')) {
        loaded++;
      } else if (state.loading) {
        loading++;
      } else if (state.error && state.attempts >= VillageChronicleEngine.MAX_RETRY_ATTEMPTS) {
        errors++;
      }
    });
    return { total: this.mediaLoadingState.size, loaded: this.mediaCache.size, loading, errors };
  }
  
  // Generate placeholder image for failed media
  private generatePlaceholder(width: number, height: number, text: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(1, '#0f1f33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `${Math.min(width, height) * 0.2}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', width / 2, height / 2 - 20);
    
    // Text
    ctx.font = `bold ${Math.min(width, height) * 0.06}px system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(text.slice(0, 30), width / 2, height / 2 + 30);
    
    return canvas;
  }
  
  private async loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 10000); // 10s timeout per image
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      img.src = url;
    });
  }

  private isLikelyVideoUrl(url: string): boolean {
    return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
  }

  private async loadVideoFromUrl(url: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.loop = true;

      const timeout = setTimeout(() => reject(new Error('Video load timeout')), 15000);

      video.onloadeddata = () => {
        clearTimeout(timeout);
        // Autoplay muted videos is usually allowed and helps keep frames available
        video.play().catch(() => {});
        resolve(video);
      };
      video.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      video.src = url;
      video.load();
    });
  }

  private async loadVideo(file: File): Promise<HTMLVideoElement> {
    const url = URL.createObjectURL(file);
    try {
      return await this.loadVideoFromUrl(url);
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
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
    
    // Scale factor for responsive text sizing (base is 1280x720)
    const scale = Math.min(width / 1280, height / 720);
    const fontScale = Math.max(0.6, scale); // Minimum 60% of original size

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
    const anchorX = width * 0.25;
    const anchorY = height * 0.50;
    const photoSize = Math.min(200, width * 0.18); // Responsive photo size
    
    if (this.anchorPhoto) {
      // Draw uploaded photo with circular mask
      ctx.save();
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 40, photoSize/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.anchorPhoto, anchorX - photoSize/2, anchorY - 40 - photoSize/2, photoSize, photoSize);
      ctx.restore();
      
      // Add circular border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 40, photoSize/2 + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Default anchor avatar - larger and more visible
      const headSize = Math.min(60, width * 0.05);
      
      // Head
      ctx.fillStyle = '#d4a574';
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 50, headSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Body/shoulders
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY + 30, headSize * 1.4, headSize * 1.2, 0, Math.PI, 0, true);
      ctx.fill();
      
      // Suit collar
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(anchorX - headSize * 0.6, anchorY);
      ctx.lineTo(anchorX, anchorY + 15);
      ctx.lineTo(anchorX + headSize * 0.6, anchorY);
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
    const lowerThirdH = height * 0.12; // Slightly taller for better readability
    
    // Red accent bar
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, lowerThirdY, width * 0.015, lowerThirdH);
    
    // Main lower third background with better contrast
    const ltGradient = ctx.createLinearGradient(0, lowerThirdY, 0, lowerThirdY + lowerThirdH);
    ltGradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    ltGradient.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
    ctx.fillStyle = ltGradient;
    ctx.fillRect(width * 0.015, lowerThirdY, width * 0.7, lowerThirdH);
    
    // Village name - responsive font size
    const titleFontSize = Math.max(20, Math.min(36, width * 0.028));
    ctx.font = `bold ${titleFontSize}px system-ui`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`📺 Journal de ${this.villageName}`, width * 0.03, lowerThirdY + titleFontSize + 8);
    ctx.shadowBlur = 0;
    
    // Current segment info or first news headline
    const subFontSize = Math.max(14, Math.min(24, width * 0.018));
    ctx.font = `${subFontSize}px system-ui`;
    ctx.fillStyle = '#93c5fd';
    
    let subText = '';
    if (this.currentSegment) {
      subText = this.currentSegment.script.text.slice(0, 50) + '...';
    } else if (this.newsItems && this.newsItems.length > 0) {
      subText = `📰 ${this.newsItems.length} actualité${this.newsItems.length > 1 ? 's' : ''} à la une`;
    }
    ctx.fillText(subText, width * 0.03, lowerThirdY + titleFontSize + subFontSize + 16);

    // === Live Badge - responsive positioning ===
    const badgeWidth = Math.max(70, width * 0.07);
    const badgeHeight = Math.max(28, height * 0.04);
    const liveX = width - badgeWidth - 15;
    const liveY = 15;
    const livePulse = (Math.sin(time * 4) + 1) / 2;
    
    ctx.fillStyle = `rgba(220, 38, 38, ${0.8 + livePulse * 0.2})`;
    ctx.beginPath();
    ctx.roundRect(liveX, liveY, badgeWidth, badgeHeight, 6);
    ctx.fill();
    
    const liveFontSize = Math.max(12, Math.min(16, width * 0.012));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${liveFontSize}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('🔴 EN DIRECT', liveX + badgeWidth / 2, liveY + badgeHeight * 0.7);

    // === Time Display - responsive ===
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const timeFontSize = Math.max(16, Math.min(24, width * 0.02));
    ctx.font = `bold ${timeFontSize}px system-ui`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText(timeStr, width - 15, liveY + badgeHeight + timeFontSize + 10);
    ctx.shadowBlur = 0;

    // === News Ticker - responsive ===
    const tickerH = Math.max(30, height * 0.045);
    const tickerY = height - tickerH;
    ctx.fillStyle = 'rgba(220, 38, 38, 0.95)';
    ctx.fillRect(0, tickerY, width, tickerH);
    
    const tickerFontSize = Math.max(12, Math.min(18, width * 0.014));
    ctx.font = `bold ${tickerFontSize}px system-ui`;
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
      tickerText += ' • Actualités locales • Météo • Annonces';
    }
    
    const tickerOffset = (time * 60) % (width + tickerText.length * 8);
    ctx.fillText(tickerText, width - tickerOffset, tickerY + tickerH * 0.7);

    // === Decorative Corner Elements - responsive ===
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 2;
    const cornerSize = Math.min(30, width * 0.025);
    
    // Top left
    ctx.beginPath();
    ctx.moveTo(10, cornerSize + 10);
    ctx.lineTo(10, 10);
    ctx.lineTo(cornerSize + 10, 10);
    ctx.stroke();
    
    // Top right (skip if badge is there)
    // Bottom left
    ctx.beginPath();
    ctx.moveTo(10, height - cornerSize - tickerH - 10);
    ctx.lineTo(10, height - tickerH - 10);
    ctx.lineTo(cornerSize + 10, height - tickerH - 10);
    ctx.stroke();
    
    // === Display News Media on Graphics Screen ===
    const screenContentX = width * 0.6;
    const screenContentY = height * 0.15;
    const screenContentW = width * 0.35;
    const screenContentH = height * 0.4;
    
    // Try to display media from current segment or news items
    let mediaDisplayed = false;
    
    // Check current segment for media
    if (this.currentSegment && this.currentSegment.type === 'news') {
      const segmentIndex = this.newsShow?.mainNews.indexOf(this.currentSegment) ?? -1;
      const newsItem = segmentIndex >= 0 ? this.newsItems[segmentIndex] : null;
      
      if (newsItem) {
        const newsAny = newsItem as any;
        const mediaUrls: string[] = newsAny.mediaUrls || [];
        
        // Build full media list (URLs + local files) and cycle through them during the segment
        const mediaKeys: string[] = [];
        for (const u of mediaUrls) if (u) mediaKeys.push(u);
        if (newsItem.media && newsItem.media.length > 0) {
          for (const f of newsItem.media) {
            if (f) mediaKeys.push(`file:${f.name}`);
          }
        }

        const uniqueKeys = Array.from(new Set(mediaKeys));

        if (uniqueKeys.length > 0) {
          // Compute segment elapsed time (relative) to drive cycling
          let segmentStart = 0;
          if (this.newsShow && this.currentSegment) {
            const orderedSegments = [
              this.newsShow.opening,
              ...this.newsShow.mainNews,
              ...this.newsShow.secondaryNews,
              this.newsShow.weather,
              this.newsShow.announcements,
              this.newsShow.closing
            ];
            let t = 0;
            for (const s of orderedSegments) {
              if (s === this.currentSegment) {
                segmentStart = t;
                break;
              }
              t += s.duration;
            }
          }

          const segElapsed = Math.max(0, time - segmentStart);
          const segDuration = this.currentSegment?.duration ?? 1;
          const cycleDuration = segDuration / Math.max(1, uniqueKeys.length);
          const idx = Math.floor(segElapsed / Math.max(0.1, cycleDuration)) % uniqueKeys.length;
          const key = uniqueKeys[idx];

          const kind = this.mediaTypeCache.get(key) || (this.videoCache.has(key) ? 'video' : 'image');

          // Draw on screen with cover fit
          ctx.save();
          ctx.beginPath();
          ctx.rect(screenContentX + 5, screenContentY + 5, screenContentW - 10, screenContentH - 10);
          ctx.clip();

          const drawCover = (sourceW: number, sourceH: number, draw: (x: number, y: number, w: number, h: number) => void) => {
            const srcAspect = sourceW / sourceH;
            const screenAspect = (screenContentW - 10) / (screenContentH - 10);
            let drawW: number, drawH: number, drawX: number, drawY: number;
            if (srcAspect > screenAspect) {
              drawH = screenContentH - 10;
              drawW = drawH * srcAspect;
              drawX = screenContentX + 5 - (drawW - (screenContentW - 10)) / 2;
              drawY = screenContentY + 5;
            } else {
              drawW = screenContentW - 10;
              drawH = drawW / srcAspect;
              drawX = screenContentX + 5;
              drawY = screenContentY + 5 - (drawH - (screenContentH - 10)) / 2;
            }
            draw(drawX, drawY, drawW, drawH);
          };

          if (kind === 'video') {
            const vid = this.videoCache.get(key);
            if (vid && vid.readyState >= 2) {
              // Keep a deterministic frame based on segment time (best-effort; no await in sync draw loop)
              const vdur = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 0;
              if (vdur > 0) {
                const target = segElapsed % vdur;
                if (Math.abs(vid.currentTime - target) > 0.25) {
                  try { vid.currentTime = target; } catch { /* ignore */ }
                }
              }
              drawCover(vid.videoWidth || (screenContentW - 10), vid.videoHeight || (screenContentH - 10), (x, y, w, h) => {
                ctx.drawImage(vid, x, y, w, h);
              });
              mediaDisplayed = true;
            }
          }

          if (!mediaDisplayed) {
            const img = this.mediaCache.get(key);
            if (img) {
              drawCover(img.width, img.height, (x, y, w, h) => {
                ctx.drawImage(img, x, y, w, h);
              });
              mediaDisplayed = true;
            }
          }

          ctx.restore();

          if (mediaDisplayed) {
            // Add media label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(screenContentX + 5, screenContentY + screenContentH - 35, screenContentW - 10, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px system-ui';
            ctx.textAlign = 'center';
            const counter = uniqueKeys.length > 1 ? ` (${idx + 1}/${uniqueKeys.length})` : '';
            ctx.fillText((newsItem.title.slice(0, 34) + counter).slice(0, 40), screenContentX + screenContentW / 2, screenContentY + screenContentH - 15);
          }
        }
      }
    }
    
    // Fallback: show news summary if no media
    if (!mediaDisplayed && this.newsItems && this.newsItems.length > 0) {
      ctx.font = 'bold 24px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`📰 ${this.newsItems.length} Actualités`, screenContentX + 20, screenContentY + 40);
      
      // List top 3 news
      ctx.font = '18px system-ui';
      ctx.fillStyle = '#93c5fd';
      this.newsItems.slice(0, 3).forEach((news, i) => {
        const typeIcon = news.type === 'breaking' ? '🔴' : news.type === 'weather' ? '🌤️' : '📰';
        const truncated = news.title.length > 30 ? news.title.slice(0, 27) + '...' : news.title;
        ctx.fillText(`${typeIcon} ${truncated}`, screenContentX + 20, screenContentY + 80 + i * 30);
      });
    }
    
    // === ANIMATED SEGMENT TRANSITIONS ===
    this.drawSegmentTransition(ctx, time, width, height);
    
    // === SYNCHRONIZED SUBTITLES ===
    this.drawSubtitles(ctx, time, width, height, fontScale);
    
    // === PREMIUM VFX OVERLAYS (from CDN) ===
    this.drawPremiumEffects(ctx, time, width, height);
  }
  
  /**
   * Draw animated segment transitions (slide-in/out effects)
   */
  private drawSegmentTransition(ctx: CanvasRenderingContext2D, time: number, width: number, height: number): void {
    if (this.segmentAnimation.phase === 'idle') return;
    
    const elapsed = time - this.segmentAnimation.startTime;
    const progress = Math.min(1, elapsed / this.segmentAnimation.duration);
    this.segmentAnimation.progress = progress;
    
    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - progress, 3);
    
    ctx.save();
    
    if (this.segmentAnimation.phase === 'exit') {
      // Slide out to the left with fade
      const offsetX = -eased * width * 0.3;
      const alpha = 1 - eased;
      
      // Draw transition overlay
      ctx.globalAlpha = eased * 0.8;
      ctx.fillStyle = '#0d2137';
      ctx.fillRect(0, 0, width, height);
      
      // Draw "NEXT" indicator
      ctx.globalAlpha = eased;
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 32px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⏭️ Prochain segment...', width / 2, height / 2);
      
    } else if (this.segmentAnimation.phase === 'enter') {
      // Slide in from right with scale
      const offsetX = (1 - eased) * width * 0.2;
      const scale = 0.9 + eased * 0.1;
      
      // Draw transition overlay fading out
      ctx.globalAlpha = 1 - eased;
      ctx.fillStyle = '#0d2137';
      ctx.fillRect(0, 0, width, height);
      
      // Draw segment title badge
      if (this.currentSegment) {
        const badgeAlpha = eased;
        const badgeY = height * 0.08 + (1 - eased) * 20;
        
        ctx.globalAlpha = badgeAlpha;
        
        // Segment type badge
        const typeEmoji = this.currentSegment.type === 'opening' ? '🎬' :
                         this.currentSegment.type === 'news' ? '📰' :
                         this.currentSegment.type === 'weather' ? '🌤️' :
                         this.currentSegment.type === 'announcement' ? '📢' : '👋';
        const typeLabel = this.currentSegment.type === 'opening' ? 'OUVERTURE' :
                         this.currentSegment.type === 'news' ? 'ACTUALITÉ' :
                         this.currentSegment.type === 'weather' ? 'MÉTÉO' :
                         this.currentSegment.type === 'announcement' ? 'ANNONCES' : 'CLÔTURE';
        
        // Draw badge background
        ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
        const badgeWidth = 200;
        const badgeHeight = 40;
        const badgeX = width / 2 - badgeWidth / 2 + offsetX;
        
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
        ctx.fill();
        
        // Draw badge text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${typeEmoji} ${typeLabel}`, width / 2 + offsetX, badgeY + 26);
      }
    }
    
    ctx.restore();
    
    // Reset phase when animation completes
    if (progress >= 1) {
      if (this.segmentAnimation.phase === 'exit') {
        // Transition to enter phase
        this.segmentAnimation.phase = 'enter';
        this.segmentAnimation.startTime = time;
        this.segmentAnimation.progress = 0;
      } else {
        this.segmentAnimation.phase = 'idle';
      }
    }
  }
  
  /**
   * Trigger segment transition animation
   */
  triggerSegmentTransition(segmentIndex: number): void {
    if (segmentIndex === this.segmentAnimation.currentSegmentIndex) return;
    
    this.segmentAnimation.phase = 'exit';
    this.segmentAnimation.startTime = this.currentTime;
    this.segmentAnimation.progress = 0;
    this.segmentAnimation.currentSegmentIndex = segmentIndex;
  }
  
  /**
   * Draw synchronized subtitles with typewriter effect
   */
  private drawSubtitles(ctx: CanvasRenderingContext2D, time: number, width: number, height: number, fontScale: number): void {
    // Update subtitle text from current segment script
    if (this.currentSegment?.script?.text && this.subtitleState.targetText !== this.currentSegment.script.text) {
      this.subtitleState.targetText = this.currentSegment.script.text;
      this.subtitleState.charIndex = 0;
      this.subtitleState.currentText = '';
      this.subtitleState.visible = true;
      this.subtitleState.fadeAlpha = 0;
    }
    
    // Typewriter effect: reveal characters over time
    const charsPerSecond = 25;
    const timeSinceLastChar = time - this.subtitleState.lastCharTime;
    
    if (timeSinceLastChar >= (1 / charsPerSecond) && this.subtitleState.charIndex < this.subtitleState.targetText.length) {
      this.subtitleState.charIndex++;
      this.subtitleState.currentText = this.subtitleState.targetText.slice(0, this.subtitleState.charIndex);
      this.subtitleState.lastCharTime = time;
    }
    
    // Fade in/out
    if (this.subtitleState.visible && this.subtitleState.fadeAlpha < 1) {
      this.subtitleState.fadeAlpha = Math.min(1, this.subtitleState.fadeAlpha + 0.05);
    }
    
    if (!this.subtitleState.currentText || !this.subtitleState.visible) return;
    
    ctx.save();
    ctx.globalAlpha = this.subtitleState.fadeAlpha;
    
    // Subtitle container (bottom of screen, above ticker)
    const subtitleY = height * 0.78;
    const subtitleMaxWidth = width * 0.9;
    const padding = 12;
    
    // Word wrap the current text
    const fontSize = Math.max(16, 22 * fontScale);
    ctx.font = `${fontSize}px system-ui`;
    
    const words = this.subtitleState.currentText.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > subtitleMaxWidth - padding * 2) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Take only last 2 lines to keep subtitles compact
    const displayLines = lines.slice(-2);
    const lineHeight = fontSize * 1.4;
    const boxHeight = displayLines.length * lineHeight + padding * 2;
    const boxWidth = subtitleMaxWidth;
    const boxX = (width - boxWidth) / 2;
    const boxY = subtitleY - boxHeight / 2;
    
    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    displayLines.forEach((line, i) => {
      const y = boxY + padding + (i + 0.5) * lineHeight;
      ctx.fillText(line, width / 2, y);
    });
    
    // Draw typing cursor at end
    if (this.subtitleState.charIndex < this.subtitleState.targetText.length) {
      const cursorBlink = Math.sin(time * 8) > 0;
      if (cursorBlink) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(width / 2 + ctx.measureText(displayLines[displayLines.length - 1] || '').width / 2 + 2, 
                    boxY + boxHeight - padding - lineHeight / 2 - fontSize / 2,
                    3, fontSize);
      }
    }
    
    ctx.restore();
  }
  
  /**
   * Update subtitle text manually
   */
  setSubtitleText(text: string): void {
    if (text !== this.subtitleState.targetText) {
      this.subtitleState.targetText = text;
      this.subtitleState.charIndex = 0;
      this.subtitleState.currentText = '';
      this.subtitleState.visible = true;
      this.subtitleState.fadeAlpha = 0;
      this.subtitleState.lastCharTime = this.currentTime;
    }
  }
  
  /**
   * Hide subtitles
   */
  hideSubtitles(): void {
    this.subtitleState.visible = false;
    this.subtitleState.fadeAlpha = 0;
  }
  
  /**
   * Draw premium visual effects loaded from CDN
   * (light leaks, particles WebM, textures, lens flares)
   */
  private drawPremiumEffects(ctx: CanvasRenderingContext2D, time: number, width: number, height: number): void {
    if (!this.premiumEffectsLoaded) return;
    
    ctx.save();
    
    // Draw light leaks (screen blend mode, subtle opacity)
    if (this.premiumEffects.lightLeaks.length > 0) {
      const idx = Math.floor(time / 10) % this.premiumEffects.lightLeaks.length;
      const video = this.premiumEffects.lightLeaks[idx];
      if (video && video.readyState >= 2) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.25 + Math.sin(time * 0.5) * 0.1;
        ctx.drawImage(video, 0, 0, width, height);
      }
    }
    
    // Draw particle overlays (additive blend for glow)
    if (this.premiumEffects.particles.length > 0) {
      const idx = Math.floor(time / 15) % this.premiumEffects.particles.length;
      const video = this.premiumEffects.particles[idx];
      if (video && video.readyState >= 2) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3;
        ctx.drawImage(video, 0, 0, width, height);
      }
    }
    
    // Draw texture overlays (overlay blend for film grain/texture)
    if (this.premiumEffects.textures.length > 0) {
      const video = this.premiumEffects.textures[0];
      if (video && video.readyState >= 2) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.15;
        ctx.drawImage(video, 0, 0, width, height);
      }
    }
    
    // Draw lens flares (screen blend, positioned for light sources)
    if (this.premiumEffects.lensFlares.length > 0) {
      const flareIdx = Math.floor(time / 20) % this.premiumEffects.lensFlares.length;
      const flare = this.premiumEffects.lensFlares[flareIdx];
      if (flare) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.4 + Math.sin(time * 2) * 0.2;
        
        // Position flare at top-right (simulating studio light)
        const flareX = width * 0.75;
        const flareY = height * 0.15;
        const flareSize = Math.min(width, height) * 0.4;
        
        ctx.drawImage(
          flare, 
          flareX - flareSize/2, 
          flareY - flareSize/2, 
          flareSize, 
          flareSize
        );
      }
    }
    
    ctx.restore();
  }
  
  // === Visual Effects Methods (procedural fallbacks) ===
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
    // Skip procedural particles if premium effects are loaded
    if (this.premiumEffectsLoaded && this.premiumEffects.particles.length > 0) return;
    
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

    // OPTIMIZED: Shorter durations for faster generation (target: 30-60s total)
    const show: NewsShow = {
      opening: {
        type: 'opening',
        script: createScript(
          `Bonsoir et bienvenue au Journal de ${inputs.village.name}.`,
          5 // Reduced from 15s
        ),
        duration: 5
      },
      mainNews: inputs.newsItems.slice(0, 2).map(news => ({
        type: 'news' as const,
        script: createScript(`${news.title}. ${news.description.slice(0, 100)}`, 12),
        media: news.media,
        duration: 12 // Reduced from 45s
      })),
      secondaryNews: inputs.newsItems.slice(2, 3).map(news => ({
        type: 'news' as const,
        script: createScript(`${news.title}.`, 8),
        media: news.media,
        duration: 8 // Reduced from 30s
      })),
      weather: {
        type: 'weather',
        script: createScript('Météo: temps ensoleillé, 28 degrés.', 5),
        duration: 5 // Reduced from 30s
      },
      announcements: {
        type: 'announcement',
        script: createScript('', 0), // Skip announcements for speed
        duration: 0
      },
      closing: {
        type: 'closing',
        script: createScript(
          `Merci d'avoir suivi le Journal de ${inputs.village.name}.`,
          5 // Reduced from 15s
        ),
        duration: 5
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
    onProgress?: (progress: number, stage: string) => void,
    quickPreview: boolean = true // Default to quick preview for speed
  ): Promise<Blob> {
    console.log('[VillageChronicle] Starting render pipeline (quickPreview:', quickPreview, ')');
    
    onProgress?.(5, 'Configuration du studio');
    
    // Generate news show
    onProgress?.(10, 'Génération du journal');
    const show = await this.createNewsShow(inputs);
    this.newsShow = show;
    
    // Use shorter duration for faster rendering: 30s for quick preview, 45s for HD
    const totalDuration = quickPreview ? Math.min(show.totalDuration, 30) : Math.min(show.totalDuration, 45);
    // Lower FPS for quick preview (12fps), full quality uses 24fps (cinematic)
    const fps = quickPreview ? 12 : 24;
    
    console.log(`[VillageChronicle] Rendering ${totalDuration}s @ ${fps}fps = ${totalDuration * fps} frames`);
    
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

    // Generate FINAL audio: narration (TTS) then presenter recording (if provided)
    let audioBlob: Blob | null = null;
    onProgress?.(22, 'Préparation de l\'audio...');
    try {
      audioBlob = await this.generateFinalAudio(show, inputs.anchorVoice);
      if (audioBlob && audioBlob.size > 0) {
        console.log('[VillageChronicle] Final audio prepared:', audioBlob.size, 'bytes', audioBlob.type);
      }
    } catch (e) {
      console.warn('[VillageChronicle] Final audio preparation failed:', e);
    }

    // Choose encoding path based on quickPreview flag
    const renderWidth = quickPreview ? 1280 : 1920;
    const renderHeight = quickPreview ? 720 : 1080;

    try {
      if (quickPreview) {
        // FAST PATH: Use MediaRecorder directly (no FFmpeg overhead)
        onProgress?.(25, 'Rendu rapide...');
        
        const videoBlob = await encodeWithMediaRecorder(
          this.canvas,
          audioBlob,
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
            this.draw2DFrame(time);
          },
          (ep: EncoderProgress) => {
            const currentProgress = Math.round(25 + ep.progress * 70);
            const frameInfo = `${Math.round(ep.progress * totalDuration * fps)}/${totalDuration * fps}`;
            onProgress?.(currentProgress, `Frame ${frameInfo}`);
          }
        );

        onProgress?.(100, 'Terminé');
        console.log(`[VillageChronicle] Quick preview: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
        return videoBlob;
      }

      // HD PATH: FFmpeg encoding with TTS
      onProgress?.(25, 'Capture des frames HD');
      
      const frames = await captureCanvasFrames(
        this.canvas,
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
        (p) => onProgress?.(25 + p * 30, `Frame ${Math.floor(p * totalDuration * fps)}/${totalDuration * fps}`)
      );

      onProgress?.(60, 'Encodage MP4');
      
      const videoBlob = await encodeVideo(
        frames,
        audioBlob,
        { format: 'mp4', fps, width: renderWidth, height: renderHeight },
        (ep: EncoderProgress) => {
          const p = 60 + ep.progress * 35;
          onProgress?.(p, ep.message);
        }
      );

      onProgress?.(100, 'Terminé');
      console.log(`[VillageChronicle] HD MP4: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      return videoBlob;

    } catch (error) {
      console.warn('[VillageChronicle] FFmpeg failed, using MediaRecorder fallback:', error);
      
      onProgress?.(30, 'Fallback: MediaRecorder');
      
      const fallbackBlob = await encodeWithMediaRecorder(
        this.canvas,
        audioBlob,
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
   * Generate French TTS narration using ElevenLabs server-side TTS
   * Returns actual audio Blob for video muxing with FFmpeg
   */
  async generateNarration(script: string): Promise<Blob | null> {
    console.log('[VillageChronicle] Generating TTS narration for:', script.slice(0, 100) + '...');
    
    try {
      // Request real audio from edge function with returnAudio=true
      const { data, error } = await supabase.functions.invoke('french-tts', {
        body: { 
          text: script, 
          voice: 'announcer', 
          speed: 0.9,
          returnAudio: true // Request actual audio blob
        }
      });
      
      if (error) {
        console.error('[VillageChronicle] TTS edge function error:', error);
        return null;
      }
      
      // Check if we got real audio (ElevenLabs)
      if (data?.success && data?.audioBase64) {
        console.log(`[VillageChronicle] ElevenLabs audio received: ${data.audioSize} bytes`);
        
        // Convert base64 to Blob using data URI approach
        const audioUrl = `data:${data.audioFormat || 'audio/mpeg'};base64,${data.audioBase64}`;
        const response = await fetch(audioUrl);
        const audioBlob = await response.blob();
        
        console.log(`[VillageChronicle] Audio Blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        return audioBlob;
      }
      
      // Fallback: no server-side audio available
      if (data?.text) {
        console.log('[VillageChronicle] Got optimized text but no audio - server TTS unavailable');
        console.log('[VillageChronicle] Optimized script:', data.text.slice(0, 100) + '...');
      }
      
      console.warn('[VillageChronicle] No audio generated - video will be silent');
      return null;
      
    } catch (e) {
      console.error('[VillageChronicle] TTS generation failed:', e);
      return null;
    }
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

  private async generateFinalAudio(show: NewsShow, anchorVoice?: File): Promise<Blob | null> {
    const tts = await this.generateShowNarration(show);
    const presenter = anchorVoice ? new Blob([await anchorVoice.arrayBuffer()], { type: anchorVoice.type || 'application/octet-stream' }) : null;

    if (tts && presenter) {
      console.log('[VillageChronicle] Combining TTS narration + presenter recording');
      return await concatAudioBlobs([tts, presenter]);
    }

    // If no presenter audio, keep TTS. If no TTS, keep presenter.
    return presenter || tts || null;
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
