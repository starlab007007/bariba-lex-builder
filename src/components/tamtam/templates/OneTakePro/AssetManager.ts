// src/components/templates/OneTakePro/AssetManager.ts

export interface Asset {
  path: string;
  type: 'image' | 'video';
  loaded: boolean;
  element?: HTMLImageElement | HTMLVideoElement;
  error?: string;
  httpStatus?: number;
}

export interface AssetDiagnostics {
  testedAssets: { id: string; ok: boolean; error?: string }[];
  browserSupport: { mp4: boolean; webm: boolean; mov: boolean };
}

export class AssetManager {
  private assets = new Map<string, Asset>();
  private basePath = '/templates/one-take-pro/assets/';
  private diagnostics: AssetDiagnostics = {
    testedAssets: [],
    browserSupport: { mp4: false, webm: false, mov: false }
  };
  
  // ✅ Asset counts based on actual files in public/templates/one-take-pro/assets/
  private readonly LENS_FLARE_PNG_COUNT = 22;   // flare-001.png to flare-022.png
  private readonly LENS_FLARE_VIDEO_COUNT = 28; // flare-001.mp4 to flare-028.mp4
  private readonly LIGHT_LEAK_COUNT = 57;       // leak-001.mp4 to leak-057.mp4
  private readonly SMOKE_COUNT = 19;            // smoke-001.mov to smoke-019.mov
  private readonly FIRE_COUNT = 5;              // fire-001.mov to fire-005.mov
  
  constructor() {
    this.initializeAssetPaths();
    this.detectBrowserSupport();
  }
  
  /**
   * Detect browser codec support
   */
  private detectBrowserSupport(): void {
    const video = document.createElement('video');
    this.diagnostics.browserSupport = {
      mp4: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
      webm: video.canPlayType('video/webm; codecs="vp8"') !== '',
      mov: video.canPlayType('video/quicktime') !== ''
    };
    console.log('🎬 Browser codec support:', this.diagnostics.browserSupport);
  }
  
  /**
   * Initialiser tous les chemins d'assets
   */
  private initializeAssetPaths(): void {
    // Lens Flare PNG
    for (let i = 1; i <= this.LENS_FLARE_PNG_COUNT; i++) {
      const id = `flare-png-${i}`;
      this.assets.set(id, {
        path: `${this.basePath}lens-flare/png/flare-${this.pad(i)}.png`,
        type: 'image',
        loaded: false
      });
    }
    
    // Lens Flare Video - actual filenames: flare-001.mp4 to flare-028.mp4
    for (let i = 1; i <= this.LENS_FLARE_VIDEO_COUNT; i++) {
      const id = `flare-video-${i}`;
      this.assets.set(id, {
        path: `${this.basePath}lens-flare/video/flare-${this.pad(i)}.mp4`,
        type: 'video',
        loaded: false
      });
    }
    
    // Light Leak
    for (let i = 1; i <= this.LIGHT_LEAK_COUNT; i++) {
      const id = `leak-${i}`;
      this.assets.set(id, {
        path: `${this.basePath}light-leak/leak-${this.pad(i)}.mp4`,
        type: 'video',
        loaded: false
      });
    }
    
    // Smoke
    for (let i = 1; i <= this.SMOKE_COUNT; i++) {
      const id = `smoke-${i}`;
      this.assets.set(id, {
        path: `${this.basePath}smoke/smoke-${this.pad(i)}.mov`,
        type: 'video',
        loaded: false
      });
    }
    
    // Fire
    for (let i = 1; i <= this.FIRE_COUNT; i++) {
      const id = `fire-${i}`;
      this.assets.set(id, {
        path: `${this.basePath}fire/fire-${this.pad(i)}.mov`,
        type: 'video',
        loaded: false
      });
    }
    
    console.log(`✅ AssetManager initialisé : ${this.assets.size} assets référencés`);
  }
  
  /**
   * Précharger les assets essentiels
   */
  async preloadEssentials(): Promise<void> {
    const essentials: string[] = [
      // 5 lens flares les plus courants
      'flare-png-1', 'flare-png-2', 'flare-png-3', 'flare-png-4', 'flare-png-5',
      // 5 light leaks (MP4 - confirmed working)
      'leak-1', 'leak-2', 'leak-3', 'leak-4', 'leak-5',
    ];
    
    const promises = essentials
      .filter(id => this.assets.has(id))
      .map(async id => {
        try {
          const asset = await this.loadAsset(id);
          this.diagnostics.testedAssets.push({ id, ok: asset.loaded });
          return asset;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.diagnostics.testedAssets.push({ id, ok: false, error: errorMsg });
          console.warn(`⚠️ Impossible de précharger ${id}:`, errorMsg);
          return null;
        }
      });
    
    await Promise.all(promises);
    console.log('✅ Assets essentiels préchargés');
  }
  
  /**
   * Charger un asset spécifique
   */
  async loadAsset(id: string): Promise<Asset> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error(`Asset ${id} introuvable`);
    }
    
    if (asset.loaded && asset.element) {
      return asset;
    }
    
    return asset.type === 'image' 
      ? this.loadImage(asset)
      : this.loadVideoWithFetch(asset);
  }
  
  /**
   * Charger une image
   */
  private loadImage(asset: Asset): Promise<Asset> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        asset.element = img;
        asset.loaded = true;
        resolve(asset);
      };
      img.onerror = () => {
        asset.error = `Image load failed: ${asset.path}`;
        reject(new Error(asset.error));
      };
      img.src = asset.path;
    });
  }
  
  /**
   * Charger une vidéo avec fetch -> blob pour bypass CORS/range issues
   */
  private async loadVideoWithFetch(asset: Asset): Promise<Asset> {
    try {
      // First try fetch to detect HTTP errors
      const response = await fetch(asset.path);
      
      if (!response.ok) {
        asset.httpStatus = response.status;
        asset.error = `HTTP ${response.status}: ${asset.path}`;
        throw new Error(asset.error);
      }
      
      asset.httpStatus = response.status;
      
      // Convert to blob for reliable playback
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        
        const timeoutId = setTimeout(() => {
          asset.error = `Timeout loading video: ${asset.path}`;
          reject(new Error(asset.error));
        }, 10000);
        
        video.addEventListener('loadeddata', () => {
          clearTimeout(timeoutId);
          
          // Verify video actually decoded
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            asset.error = `Codec not supported: ${asset.path}`;
            reject(new Error(asset.error));
            return;
          }
          
          asset.element = video;
          asset.loaded = true;
          resolve(asset);
        });
        
        video.addEventListener('error', () => {
          clearTimeout(timeoutId);
          const errorCode = video.error?.code ?? 0;
          const errorMessages: Record<number, string> = {
            1: 'MEDIA_ERR_ABORTED',
            2: 'MEDIA_ERR_NETWORK',
            3: 'MEDIA_ERR_DECODE (codec not supported)',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
          };
          asset.error = `${errorMessages[errorCode] || 'Unknown error'}: ${asset.path}`;
          reject(new Error(asset.error));
        });
        
        video.src = blobUrl;
      });
    } catch (fetchError) {
      // Handle fetch failures (network, CORS, etc.)
      if (!asset.error) {
        asset.error = `Fetch failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
      }
      throw new Error(asset.error);
    }
  }
  
  /**
   * Try to find first playable video from a list
   */
  async findFirstPlayableVideo(type: 'light-leak' | 'smoke' | 'fire'): Promise<string | null> {
    let prefix: string;
    let count: number;
    
    switch (type) {
      case 'light-leak':
        prefix = 'leak-';
        count = this.LIGHT_LEAK_COUNT;
        break;
      case 'smoke':
        prefix = 'smoke-';
        count = this.SMOKE_COUNT;
        break;
      case 'fire':
        prefix = 'fire-';
        count = this.FIRE_COUNT;
        break;
    }
    
    // Try first 5 assets of this type
    const idsToTry = Array.from({ length: Math.min(5, count) }, (_, i) => `${prefix}${i + 1}`);
    
    for (const id of idsToTry) {
      try {
        const asset = await this.loadAsset(id);
        if (asset.loaded && asset.element) {
          console.log(`✅ Found playable ${type}: ${id}`);
          return id;
        }
      } catch {
        // Try next
      }
    }
    
    // If smoke/fire failed (likely .mov), try light-leak as fallback
    if (type === 'smoke' || type === 'fire') {
      console.log(`⚠️ ${type} .mov not supported, trying light-leak fallback...`);
      for (let i = 1; i <= 5; i++) {
        const fallbackId = `leak-${i}`;
        try {
          const asset = await this.loadAsset(fallbackId);
          if (asset.loaded && asset.element) {
            console.log(`✅ Using ${fallbackId} as ${type} fallback`);
            return fallbackId;
          }
        } catch {
          // Try next
        }
      }
    }
    
    return null;
  }
  
  /**
   * Obtenir un asset aléatoire d'un type
   */
  getRandomAsset(type: 'lens-flare-png' | 'lens-flare-video' | 'light-leak' | 'smoke' | 'fire'): string {
    let prefix: string;
    let count: number;
    
    switch (type) {
      case 'lens-flare-png':
        prefix = 'flare-png-';
        count = this.LENS_FLARE_PNG_COUNT;
        break;
      case 'lens-flare-video':
        prefix = 'flare-video-';
        count = this.LENS_FLARE_VIDEO_COUNT;
        break;
      case 'light-leak':
        prefix = 'leak-';
        count = this.LIGHT_LEAK_COUNT;
        break;
      case 'smoke':
        prefix = 'smoke-';
        count = this.SMOKE_COUNT;
        break;
      case 'fire':
        prefix = 'fire-';
        count = this.FIRE_COUNT;
        break;
    }
    
    const randomIndex = Math.floor(Math.random() * count) + 1;
    return `${prefix}${randomIndex}`;
  }
  
  /**
   * Obtenir un asset par ID
   */
  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }
  
  /**
   * Vérifier si un asset est chargé
   */
  isLoaded(id: string): boolean {
    const asset = this.assets.get(id);
    return asset ? asset.loaded : false;
  }
  
  /**
   * Obtenir statistiques
   */
  getStats(): { total: number; loaded: number } {
    let loaded = 0;
    this.assets.forEach(asset => {
      if (asset.loaded) loaded++;
    });
    return { total: this.assets.size, loaded };
  }
  
  /**
   * Get diagnostics for debugging
   */
  getDiagnostics(): AssetDiagnostics {
    return this.diagnostics;
  }
  
  /**
   * Helper pour padding des numéros
   */
  private pad(num: number): string {
    return num.toString().padStart(3, '0');
  }
}
