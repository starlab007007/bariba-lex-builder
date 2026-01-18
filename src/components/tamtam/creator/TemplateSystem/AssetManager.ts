/**
 * TAM-TAM Asset Manager v4.1
 * Flexible asset loading with support for mixed naming conventions
 * Includes automatic path resolution for misnamed assets
 * Handles: 3d-models, audio/*, fonts, particles, transitions, textures, lens-flare, light-leak
 */

import type { AssetCategory } from './types';
import { resolveAssetPath, isAssetAvailable, buildResolvedAssetUrl } from '@/lib/AssetRealMapping';

// ============================================================================
// TYPES
// ============================================================================

export interface AssetDescriptor {
  id: string; // Format: "category:filename" or "category/subfolder:filename"
  category: AssetCategory | string;
  subfolder?: string;
  filename: string;
  format: AssetFormat;
}

export type AssetFormat = 
  | 'webm' | 'mp4' | 'mov'
  | 'png' | 'jpg' | 'jpeg' | 'webp'
  | 'glb' | 'gltf'
  | 'mp3' | 'wav' | 'ogg'
  | 'ttf' | 'otf' | 'woff' | 'woff2';

export type LoadedAssetData = 
  | HTMLImageElement 
  | HTMLVideoElement 
  | AudioBuffer 
  | FontFace 
  | Blob
  | ArrayBuffer;

export interface LoadedAsset {
  id: string;
  descriptor: AssetDescriptor;
  data: LoadedAssetData;
  objectUrl?: string;
  loadedAt: number;
  size: number;
}

export interface LoadProgress {
  total: number;
  loaded: number;
  current: string;
  percent: number;
  errors: string[];
}

export interface AssetManagerConfig {
  basePath: string;
  timeout: number;
  maxCacheSize: number; // in MB
  maxCacheAge: number; // in ms
  enableIndexedDB: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: AssetManagerConfig = {
  basePath: '/assets/envato',
  timeout: 30000, // 30 seconds
  maxCacheSize: 200, // 200MB
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableIndexedDB: true,
};

// ============================================================================
// FORMAT DETECTION
// ============================================================================

const VIDEO_FORMATS: AssetFormat[] = ['webm', 'mp4', 'mov'];
const IMAGE_FORMATS: AssetFormat[] = ['png', 'jpg', 'jpeg', 'webp'];
const AUDIO_FORMATS: AssetFormat[] = ['mp3', 'wav', 'ogg'];
const FONT_FORMATS: AssetFormat[] = ['ttf', 'otf', 'woff', 'woff2'];
const MODEL_FORMATS: AssetFormat[] = ['glb', 'gltf'];

function getFormatFromFilename(filename: string): AssetFormat {
  const ext = filename.split('.').pop()?.toLowerCase() as AssetFormat;
  return ext || 'png';
}

function getAssetType(format: AssetFormat): 'video' | 'image' | 'audio' | 'font' | 'model' | 'unknown' {
  if (VIDEO_FORMATS.includes(format)) return 'video';
  if (IMAGE_FORMATS.includes(format)) return 'image';
  if (AUDIO_FORMATS.includes(format)) return 'audio';
  if (FONT_FORMATS.includes(format)) return 'font';
  if (MODEL_FORMATS.includes(format)) return 'model';
  return 'unknown';
}

// ============================================================================
// BROWSER SUPPORT DETECTION
// ============================================================================

const browserSupport = {
  webm: false,
  mp4: false,
  mov: false,
  webp: false,
};

function detectBrowserSupport(): void {
  const video = document.createElement('video');
  browserSupport.webm = video.canPlayType('video/webm; codecs="vp9"') !== '';
  browserSupport.mp4 = video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
  browserSupport.mov = video.canPlayType('video/quicktime') !== '';
  
  // WebP support
  const canvas = document.createElement('canvas');
  browserSupport.webp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// Initialize on load
if (typeof window !== 'undefined') {
  detectBrowserSupport();
}

// ============================================================================
// ASSET MANAGER CLASS
// ============================================================================

class AssetManagerClass {
  private config: AssetManagerConfig;
  private cache: Map<string, LoadedAsset> = new Map();
  private loadingPromises: Map<string, Promise<LoadedAsset>> = new Map();
  private audioContext: AudioContext | null = null;
  private progress: LoadProgress = {
    total: 0,
    loaded: 0,
    current: '',
    percent: 0,
    errors: [],
  };
  private listeners: Set<(progress: LoadProgress) => void> = new Set();

  constructor(config: Partial<AssetManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Parse asset ID into descriptor
   * Supports formats:
   * - "category:filename" → /assets/envato/category/filename
   * - "category/subfolder:filename" → /assets/envato/category/subfolder/filename
   * - "audio/modern:track.mp3" → /assets/envato/audio/modern/track.mp3
   */
  parseAssetId(assetId: string): AssetDescriptor {
    const [path, filename] = assetId.split(':');
    
    if (!filename) {
      throw new Error(`Invalid asset ID format: ${assetId}. Expected "category:filename"`);
    }

    const pathParts = path.split('/');
    const category = pathParts[0] as AssetCategory;
    const subfolder = pathParts.length > 1 ? pathParts.slice(1).join('/') : undefined;
    const format = getFormatFromFilename(filename);

    return {
      id: assetId,
      category,
      subfolder,
      filename,
      format,
    };
  }

  /**
   * Build full URL for an asset
   */
  buildAssetUrl(descriptor: AssetDescriptor): string {
    const { category, subfolder, filename } = descriptor;
    const pathParts = [this.config.basePath, category];
    
    if (subfolder) {
      pathParts.push(subfolder);
    }
    
    pathParts.push(filename);
    return pathParts.join('/');
  }

  /**
   * Load a single asset by ID
   */
  async load(assetId: string): Promise<LoadedAsset> {
    // Resolve asset path using real mapping (handles misnamed files)
    const resolvedId = resolveAssetPath(assetId);
    const cacheKey = assetId; // Keep original ID for cache consistency
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.loadedAt < this.config.maxCacheAge) {
      return cached;
    }

    // Check if already loading
    const existing = this.loadingPromises.get(cacheKey);
    if (existing) {
      return existing;
    }

    // Start loading with resolved path
    const loadPromise = this.loadAsset(resolvedId);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      // Store with original ID for consistency
      result.id = assetId;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load multiple assets with progress tracking
   */
  async loadMultiple(assetIds: string[]): Promise<Map<string, LoadedAsset>> {
    this.progress = {
      total: assetIds.length,
      loaded: 0,
      current: '',
      percent: 0,
      errors: [],
    };
    this.notifyProgress();

    const results = new Map<string, LoadedAsset>();

    await Promise.all(
      assetIds.map(async (id) => {
        try {
          this.progress.current = id;
          this.notifyProgress();

          const asset = await this.load(id);
          results.set(id, asset);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.progress.errors.push(`${id}: ${message}`);
          console.warn(`[AssetManager] Failed to load ${id}:`, error);
        } finally {
          this.progress.loaded++;
          this.progress.percent = Math.round((this.progress.loaded / this.progress.total) * 100);
          this.notifyProgress();
        }
      })
    );

    return results;
  }

  /**
   * Preload all assets required by a template
   * Filters out virtual asset categories that don't require file loading
   */
  async preloadForTemplate(effects: Array<{ assetId: string }>): Promise<void> {
    const assetIds = effects.map(e => e.assetId).filter(Boolean);
    
    // Filter out virtual asset categories that don't need file loading
    const virtualCategories = ['text', 'procedural', 'dynamic', 'virtual'];
    const loadableAssetIds = assetIds.filter(id => {
      const category = id.split(':')[0];
      return !virtualCategories.includes(category);
    });
    
    const uniqueIds = [...new Set(loadableAssetIds)];
    await this.loadMultiple(uniqueIds);
  }

  /**
   * Check if an asset ID represents a virtual (non-file) asset
   */
  isVirtualAsset(assetId: string): boolean {
    const virtualCategories = ['text', 'procedural', 'dynamic', 'virtual'];
    const category = assetId.split(':')[0];
    return virtualCategories.includes(category);
  }

  /**
   * Get a loaded asset (must be already loaded)
   */
  get(assetId: string): LoadedAsset | undefined {
    return this.cache.get(assetId);
  }

  /**
   * Get asset as specific type
   */
  getAsImage(assetId: string): HTMLImageElement | null {
    const asset = this.cache.get(assetId);
    return asset?.data instanceof HTMLImageElement ? asset.data : null;
  }

  getAsVideo(assetId: string): HTMLVideoElement | null {
    const asset = this.cache.get(assetId);
    return asset?.data instanceof HTMLVideoElement ? asset.data : null;
  }

  getAsAudio(assetId: string): AudioBuffer | null {
    const asset = this.cache.get(assetId);
    return asset?.data instanceof AudioBuffer ? asset.data : null;
  }

  getAsFont(assetId: string): FontFace | null {
    const asset = this.cache.get(assetId);
    return asset?.data instanceof FontFace ? asset.data : null;
  }

  getAsBlob(assetId: string): Blob | null {
    const asset = this.cache.get(assetId);
    return asset?.data instanceof Blob ? asset.data : null;
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: LoadProgress) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current progress
   */
  getProgress(): LoadProgress {
    return { ...this.progress };
  }

  /**
   * Clear cache (with optional pattern matching)
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      // Revoke all object URLs
      for (const asset of this.cache.values()) {
        if (asset.objectUrl) {
          URL.revokeObjectURL(asset.objectUrl);
        }
      }
      this.cache.clear();
      return;
    }

    // Clear matching entries
    for (const [key, asset] of this.cache.entries()) {
      if (key.includes(pattern)) {
        if (asset.objectUrl) {
          URL.revokeObjectURL(asset.objectUrl);
        }
        this.cache.delete(key);
      }
    }
  }

  /**
   * Check if asset is cached
   */
  isCached(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { count: number; sizeBytes: number; sizeMB: number } {
    let sizeBytes = 0;
    for (const asset of this.cache.values()) {
      sizeBytes += asset.size;
    }
    return {
      count: this.cache.size,
      sizeBytes,
      sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
    };
  }

  /**
   * Enforce cache size limit (LRU eviction)
   */
  private enforceMaxCacheSize(): void {
    const stats = this.getCacheStats();
    if (stats.sizeMB <= this.config.maxCacheSize) return;

    // Sort by loadedAt (oldest first) and remove until under limit
    const entries = [...this.cache.entries()].sort(
      (a, b) => a[1].loadedAt - b[1].loadedAt
    );

    let currentSize = stats.sizeBytes;
    const maxBytes = this.config.maxCacheSize * 1024 * 1024;

    for (const [key, asset] of entries) {
      if (currentSize <= maxBytes) break;
      
      if (asset.objectUrl) {
        URL.revokeObjectURL(asset.objectUrl);
      }
      this.cache.delete(key);
      currentSize -= asset.size;
    }
  }

  // ==========================================================================
  // PRIVATE LOADING METHODS
  // ==========================================================================

  private async loadAsset(assetId: string): Promise<LoadedAsset> {
    const descriptor = this.parseAssetId(assetId);
    const url = this.buildAssetUrl(descriptor);
    const assetType = getAssetType(descriptor.format);

    let data: LoadedAssetData;
    let objectUrl: string | undefined;
    let size = 0;

    switch (assetType) {
      case 'image':
        const imageResult = await this.loadImage(url);
        data = imageResult.element;
        size = imageResult.size;
        break;

      case 'video':
        const videoResult = await this.loadVideo(url, descriptor);
        data = videoResult.element;
        objectUrl = videoResult.objectUrl;
        size = videoResult.size;
        break;

      case 'audio':
        const audioResult = await this.loadAudio(url);
        data = audioResult.buffer;
        size = audioResult.size;
        break;

      case 'font':
        const fontResult = await this.loadFont(url, descriptor.filename);
        data = fontResult.font;
        size = fontResult.size;
        break;

      case 'model':
        const modelResult = await this.loadModel(url);
        data = modelResult.data;
        size = modelResult.size;
        break;

      default:
        const blobResult = await this.loadBlob(url);
        data = blobResult.blob;
        size = blobResult.size;
    }

    const loadedAsset: LoadedAsset = {
      id: assetId,
      descriptor,
      data,
      objectUrl,
      loadedAt: Date.now(),
      size,
    };

    this.enforceMaxCacheSize();
    return loadedAsset;
  }

  private async loadImage(url: string): Promise<{ element: HTMLImageElement; size: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        reject(new Error(`Image load timeout: ${url}`));
      }, this.config.timeout);

      img.onload = () => {
        clearTimeout(timeout);
        // Estimate size from dimensions (rough)
        const size = (img.width * img.height * 4); // RGBA
        resolve({ element: img, size });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  private async loadVideo(
    url: string, 
    descriptor: AssetDescriptor
  ): Promise<{ element: HTMLVideoElement; objectUrl: string; size: number }> {
    // Try original format first, then fallback to alternatives
    const urlsToTry = [url];
    
    // Add fallback URLs for WebM (try MP4) and MOV (try WebM/MP4)
    if (descriptor.format === 'webm') {
      const mp4Url = url.replace('.webm', '.mp4');
      urlsToTry.push(mp4Url);
    } else if (descriptor.format === 'mov') {
      const webmUrl = url.replace('.mov', '.webm');
      const mp4Url = url.replace('.mov', '.mp4');
      if (browserSupport.webm) urlsToTry.push(webmUrl);
      urlsToTry.push(mp4Url);
    }

    let lastError: Error | null = null;

    for (const tryUrl of urlsToTry) {
      try {
        const response = await this.fetchWithTimeout(tryUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const result = await new Promise<{ element: HTMLVideoElement; objectUrl: string; size: number }>((resolve, reject) => {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.loop = true;
          video.playsInline = true;

          const timeout = setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Video load timeout: ${tryUrl}`));
          }, this.config.timeout);

          video.onloadeddata = () => {
            clearTimeout(timeout);
            resolve({ element: video, objectUrl, size: blob.size });
          };

          video.onerror = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to decode video: ${tryUrl}`));
          };

          video.src = objectUrl;
          video.load();
        });

        // Success - log if we used fallback
        if (tryUrl !== url) {
          console.log(`[AssetManager] Used fallback format: ${tryUrl} (original: ${url})`);
        }
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[AssetManager] Failed to load video: ${tryUrl}`, error);
        // Continue to next fallback
      }
    }

    throw lastError || new Error(`Failed to load video: ${url}`);
  }

  private async loadAudio(url: string): Promise<{ buffer: AudioBuffer; size: number }> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const response = await this.fetchWithTimeout(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

    return { buffer, size: arrayBuffer.byteLength };
  }

  private async loadFont(url: string, filename: string): Promise<{ font: FontFace; size: number }> {
    const response = await this.fetchWithTimeout(url);
    const arrayBuffer = await response.arrayBuffer();
    
    // Extract font family name from filename
    const fontFamily = filename.replace(/\.(ttf|otf|woff|woff2)$/i, '');
    
    const font = new FontFace(fontFamily, arrayBuffer);
    await font.load();
    document.fonts.add(font);

    return { font, size: arrayBuffer.byteLength };
  }

  private async loadModel(url: string): Promise<{ data: ArrayBuffer; size: number }> {
    const response = await this.fetchWithTimeout(url);
    const data = await response.arrayBuffer();
    return { data, size: data.byteLength };
  }

  private async loadBlob(url: string): Promise<{ blob: Blob; size: number }> {
    const response = await this.fetchWithTimeout(url);
    const blob = await response.blob();
    return { blob, size: blob.size };
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private notifyProgress(): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.progress });
      } catch (e) {
        console.error('[AssetManager] Progress listener error:', e);
      }
    }
  }
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export const AssetManager = new AssetManagerClass();

// Legacy export for backward compatibility
export const assetManager = AssetManager;

// Also export class for custom instances
export { AssetManagerClass };

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick load helper
 */
export async function loadAsset(assetId: string): Promise<LoadedAsset> {
  return AssetManager.load(assetId);
}

/**
 * Quick preload helper
 */
export async function preloadAssets(assetIds: string[]): Promise<Map<string, LoadedAsset>> {
  return AssetManager.loadMultiple(assetIds);
}

/**
 * Check if video format is supported
 */
export function isVideoFormatSupported(format: 'webm' | 'mp4' | 'mov'): boolean {
  return browserSupport[format];
}

/**
 * Get best video format for current browser
 */
export function getBestVideoFormat(): 'webm' | 'mp4' {
  return browserSupport.webm ? 'webm' : 'mp4';
}
