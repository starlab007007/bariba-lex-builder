// src/components/templates/OneTakePro/AssetManager.ts

export interface Asset {
  path: string;
  type: 'image' | 'video';
  loaded: boolean;
  element?: HTMLImageElement | HTMLVideoElement;
}

export class AssetManager {
  private assets = new Map<string, Asset>();
  private basePath = '/templates/one-take-pro/assets/';
  
  // ⚠️ IMPORTANT : Ajustez ces nombres selon vos assets téléchargés
  // Pour connaître vos nombres : ls public/templates/one-take-pro/assets/lens-flare/png/ | wc -l
  private readonly LENS_FLARE_PNG_COUNT = 50;  // ← Ajustez avec votre nombre
  private readonly LENS_FLARE_VIDEO_COUNT = 10; // ← Ajustez avec votre nombre
  private readonly LIGHT_LEAK_COUNT = 30;       // ← Ajustez avec votre nombre
  private readonly SMOKE_COUNT = 25;            // ← Ajustez avec votre nombre
  private readonly FIRE_COUNT = 15;             // ← Ajustez avec votre nombre
  
  constructor() {
    this.initializeAssetPaths();
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
    
    // Lens Flare Video (optionnel)
    for (let i = 1; i <= this.LENS_FLARE_VIDEO_COUNT; i++) {
      const id = `flare-video-${i}`;
      this.assets.set(id, {
        path: `${this.basePath}lens-flare/video/flare-video-${this.pad(i)}.mp4`,
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
      // 3 light leaks
      'leak-1', 'leak-2', 'leak-3',
      // 2 smoke, 2 fire
      'smoke-1', 'smoke-2', 'fire-1', 'fire-2'
    ];
    
    const promises = essentials
      .filter(id => this.assets.has(id))
      .map(id => this.loadAsset(id).catch(err => {
        console.warn(`⚠️ Impossible de précharger ${id}:`, err);
        return null;
      }));
    
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
    
    if (asset.loaded) {
      return asset;
    }
    
    return asset.type === 'image' 
      ? this.loadImage(asset)
      : this.loadVideo(asset);
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
        reject(new Error(`Impossible de charger l'image: ${asset.path}`));
      };
      img.src = asset.path;
    });
  }
  
  /**
   * Charger une vidéo
   */
  private loadVideo(asset: Asset): Promise<Asset> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      
      video.addEventListener('loadeddata', () => {
        asset.element = video;
        asset.loaded = true;
        resolve(asset);
      });
      
      video.addEventListener('error', () => {
        reject(new Error(`Impossible de charger la vidéo: ${asset.path}`));
      });
      
      video.src = asset.path;
    });
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
   * Helper pour padding des numéros
   */
  private pad(num: number): string {
    return num.toString().padStart(3, '0');
  }
}
