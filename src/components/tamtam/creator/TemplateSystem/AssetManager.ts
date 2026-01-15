/**
 * Asset Manager v3.0
 * Handles loading, caching, and management of template assets
 */

import { AssetCategory } from './types';

export class AssetManager {
  private cache = new Map<string, unknown>();
  private loadingPromises = new Map<string, Promise<unknown>>();
  
  private readonly ASSET_PATHS: Record<AssetCategory, string> = {
    '3d-models': '/assets/envato/3d-models/',
    'audio': '/assets/envato/audio/',
    'fonts': '/assets/envato/fonts/',
    'particles': '/assets/envato/particles/',
    'transitions': '/assets/envato/transitions/',
    'textures': '/assets/envato/textures/',
    'lens-flare': '/assets/envato/lens-flare/',
    'light-leak': '/assets/envato/light-leak/'
  };

  private readonly EXTENSIONS: Record<AssetCategory, string> = {
    '3d-models': 'glb',
    'audio': 'mp3',
    'fonts': 'woff2',
    'particles': 'webm',
    'transitions': 'mp4',
    'textures': 'png',
    'lens-flare': 'png',
    'light-leak': 'mp4'
  };

  /**
   * Load an asset by ID
   * @param assetId Format: "category:filename" (e.g., "lens-flare:flare-001.png")
   */
  async load(assetId: string): Promise<unknown> {
    // Return cached asset
    if (this.cache.has(assetId)) {
      return this.cache.get(assetId);
    }
    
    // Return existing loading promise to prevent duplicate loads
    if (this.loadingPromises.has(assetId)) {
      return this.loadingPromises.get(assetId);
    }
    
    // Parse assetId
    const [category, filename] = assetId.split(':') as [AssetCategory, string];
    
    if (!category || !filename) {
      throw new Error(`Invalid asset ID format: ${assetId}. Expected "category:filename"`);
    }
    
    if (!this.ASSET_PATHS[category]) {
      throw new Error(`Unknown asset category: ${category}`);
    }
    
    const path = this.ASSET_PATHS[category] + filename;
    
    // Create loading promise
    const loadingPromise = this.loadAsset(category, path, filename);
    this.loadingPromises.set(assetId, loadingPromise);
    
    try {
      const asset = await loadingPromise;
      this.cache.set(assetId, asset);
      return asset;
    } finally {
      this.loadingPromises.delete(assetId);
    }
  }

  /**
   * Load asset based on category
   */
  private async loadAsset(category: AssetCategory, path: string, filename: string): Promise<unknown> {
    switch (category) {
      case '3d-models':
        return this.load3DModel(path);
      case 'audio':
        return this.loadAudio(path);
      case 'fonts':
        return this.loadFont(filename.replace(/\.[^/.]+$/, ''), path);
      case 'particles':
      case 'transitions':
      case 'light-leak':
        return this.loadVideo(path);
      case 'lens-flare':
      case 'textures':
        return this.loadImage(path);
      default:
        // Try to infer from extension
        if (path.match(/\.(mp4|webm|mov)$/i)) {
          return this.loadVideo(path);
        }
        return this.loadImage(path);
    }
  }

  /**
   * Load 3D model (GLTF/GLB)
   */
  private async load3DModel(path: string): Promise<unknown> {
    // Dynamic import to avoid loading Three.js unless needed
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => {
          console.warn(`3D model load failed: ${path}`, error);
          reject(new Error(`Failed to load 3D model: ${path}`));
        }
      );
    });
  }

  /**
   * Load audio file
   */
  private async loadAudio(path: string): Promise<AudioBuffer> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      
      return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn(`Audio load failed: ${path}`, error);
      throw new Error(`Failed to load audio: ${path}`);
    }
  }

  /**
   * Load font file
   */
  private async loadFont(fontName: string, path: string): Promise<FontFace> {
    try {
      const font = new FontFace(fontName, `url(${path})`);
      await font.load();
      document.fonts.add(font);
      return font;
    } catch (error) {
      console.warn(`Font load failed: ${path}`, error);
      throw new Error(`Failed to load font: ${path}`);
    }
  }

  /**
   * Load video file
   */
  private async loadVideo(path: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = path;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Video load timeout: ${path}`));
      }, 30000);
      
      video.addEventListener('loadeddata', () => {
        clearTimeout(timeoutId);
        resolve(video);
      });
      
      video.addEventListener('error', () => {
        clearTimeout(timeoutId);
        console.warn(`Video load failed: ${path}`);
        reject(new Error(`Failed to load video: ${path}`));
      });
      
      video.load();
    });
  }

  /**
   * Load image file
   */
  private async loadImage(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image load timeout: ${path}`));
      }, 15000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        console.warn(`Image load failed: ${path}`);
        reject(new Error(`Failed to load image: ${path}`));
      };
      
      img.src = path;
    });
  }

  /**
   * Get random assets from a category
   */
  getRandomAssetIds(category: AssetCategory, count: number = 1): string[] {
    const ext = this.EXTENSIONS[category];
    return Array.from({ length: count }, (_, i) => 
      `${category}:asset-${String(i + 1).padStart(3, '0')}.${ext}`
    );
  }

  /**
   * Preload assets for a template
   */
  async preloadForTemplate(templateId: string, assetIds: string[]): Promise<void> {
    console.log(`Preloading ${assetIds.length} assets for template: ${templateId}`);
    
    const results = await Promise.allSettled(
      assetIds.map(id => this.load(id))
    );
    
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`${failed.length} assets failed to preload for ${templateId}`);
    }
  }

  /**
   * Check if asset is cached
   */
  isCached(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Clear specific asset from cache
   */
  clearAsset(assetId: string): void {
    this.cache.delete(assetId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton instance
export const assetManager = new AssetManager();
