/**
 * Template Asset Loader - Système de téléchargement et cache des assets
 * IndexedDB avec 7 jours de rétention
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DownloadProgress {
  templateId: string;
  totalAssets: number;
  downloadedAssets: number;
  currentAsset: string;
  progress: number; // 0-100
  status: 'idle' | 'downloading' | 'ready' | 'error';
  error?: string;
}

export interface CachedAsset {
  id: string;
  templateId: string;
  category: string;
  filename: string;
  blob: Blob;
  mimeType: string;
  size: number;
  cachedAt: number;
  expiresAt: number;
}

export interface TemplateAssetManifest {
  models?: string[];
  particles?: string[];
  lightLeaks?: string[];
  lensFlares?: string[];
  textures?: string[];
  transitions?: string[];
  audio?: string[];
  fonts?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DB_NAME = 'tamtam-template-assets';
const DB_VERSION = 1;
const STORE_NAME = 'assets';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ASSET_BASE_URL = '/assets/envato';

const CATEGORY_PATHS: Record<string, string> = {
  models: '3d-models',
  particles: 'particles',
  lightLeaks: 'light-leak',
  lensFlares: 'lens-flare',
  textures: 'textures',
  transitions: 'transitions',
  audio: 'audio',
  fonts: 'fonts',
};

// ============================================================================
// TEMPLATE ASSET LOADER CLASS
// ============================================================================

class TemplateAssetLoaderService {
  private db: IDBDatabase | null = null;
  private downloadQueue: Map<string, AbortController> = new Map();
  private progressListeners: Map<string, (progress: DownloadProgress) => void> = new Map();
  private templateProgress: Map<string, DownloadProgress> = new Map();

  // Initialize IndexedDB
  async init(): Promise<void> {
    if (this.db) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('[TemplateAssetLoader] Failed to open database');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[TemplateAssetLoader] Initialized');
        this.cleanExpiredAssets().then(resolve);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('templateId', 'templateId');
          store.createIndex('expiresAt', 'expiresAt');
        }
      };
    });
  }

  // Clean expired assets from cache
  private async cleanExpiredAssets(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('expiresAt');
    const now = Date.now();
    
    const request = index.openCursor(IDBKeyRange.upperBound(now));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  // Get asset from cache
  async getCachedAsset(templateId: string, category: string, filename: string): Promise<Blob | null> {
    await this.init();
    if (!this.db) return null;
    
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const id = `${templateId}:${category}:${filename}`;
      const request = store.get(id);
      
      request.onsuccess = () => {
        const asset = request.result;
        if (asset && asset.expiresAt > Date.now()) {
          resolve(asset.blob);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => resolve(null);
    });
  }

  // Cache an asset
  async cacheAsset(
    templateId: string, 
    category: string, 
    filename: string, 
    blob: Blob
  ): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    const now = Date.now();
    const asset: CachedAsset = {
      id: `${templateId}:${category}:${filename}`,
      templateId,
      category,
      filename,
      blob,
      mimeType: blob.type,
      size: blob.size,
      cachedAt: now,
      expiresAt: now + CACHE_DURATION_MS,
    };
    
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(asset);
  }

  // Check if template is fully cached
  async isTemplateReady(templateId: string, manifest: TemplateAssetManifest): Promise<boolean> {
    await this.init();
    if (!this.db) return false;
    
    const allAssets = this.flattenManifest(manifest);
    
    for (const { category, filename } of allAssets) {
      const cached = await this.getCachedAsset(templateId, category, filename);
      if (!cached) return false;
    }
    
    return true;
  }

  // Flatten manifest into asset list
  private flattenManifest(manifest: TemplateAssetManifest): Array<{ category: string; filename: string }> {
    const assets: Array<{ category: string; filename: string }> = [];
    
    for (const [category, files] of Object.entries(manifest)) {
      if (files && Array.isArray(files)) {
        for (const filename of files) {
          assets.push({ category, filename });
        }
      }
    }
    
    return assets;
  }

  // Preload all assets for a template
  async preloadTemplateAssets(
    templateId: string, 
    manifest: TemplateAssetManifest,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    await this.init();
    
    const assets = this.flattenManifest(manifest);
    const totalAssets = assets.length;
    
    if (totalAssets === 0) {
      if (onProgress) {
        onProgress({
          templateId,
          totalAssets: 0,
          downloadedAssets: 0,
          currentAsset: '',
          progress: 100,
          status: 'ready',
        });
      }
      return;
    }

    const controller = new AbortController();
    this.downloadQueue.set(templateId, controller);
    
    if (onProgress) {
      this.progressListeners.set(templateId, onProgress);
    }

    let downloadedAssets = 0;
    
    const updateProgress = (currentAsset: string, status: DownloadProgress['status'] = 'downloading') => {
      const progress: DownloadProgress = {
        templateId,
        totalAssets,
        downloadedAssets,
        currentAsset,
        progress: Math.round((downloadedAssets / totalAssets) * 100),
        status,
      };
      
      this.templateProgress.set(templateId, progress);
      
      const listener = this.progressListeners.get(templateId);
      if (listener) {
        listener(progress);
      }
    };

    try {
      for (const { category, filename } of assets) {
        if (controller.signal.aborted) break;
        
        // Check cache first
        const cached = await this.getCachedAsset(templateId, category, filename);
        if (cached) {
          downloadedAssets++;
          updateProgress(filename);
          continue;
        }

        // Download asset
        updateProgress(filename);
        
        const categoryPath = CATEGORY_PATHS[category] || category;
        const url = `${ASSET_BASE_URL}/${categoryPath}/${filename}`;
        
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (response.ok) {
            const blob = await response.blob();
            await this.cacheAsset(templateId, category, filename, blob);
          }
        } catch (fetchError) {
          // Log but continue - asset may not exist or be optional
          console.warn(`[TemplateAssetLoader] Failed to fetch ${url}:`, fetchError);
        }
        
        downloadedAssets++;
        updateProgress(filename);
      }

      updateProgress('', 'ready');
      
    } catch (error) {
      console.error('[TemplateAssetLoader] Preload failed:', error);
      updateProgress('', 'error');
      
      const progress = this.templateProgress.get(templateId);
      if (progress) {
        progress.error = error instanceof Error ? error.message : 'Unknown error';
        this.templateProgress.set(templateId, progress);
      }
    } finally {
      this.downloadQueue.delete(templateId);
      this.progressListeners.delete(templateId);
    }
  }

  // Cancel download
  cancelDownload(templateId: string): void {
    const controller = this.downloadQueue.get(templateId);
    if (controller) {
      controller.abort();
      this.downloadQueue.delete(templateId);
      this.progressListeners.delete(templateId);
    }
  }

  // Get current download progress
  getDownloadProgress(templateId: string): DownloadProgress {
    return this.templateProgress.get(templateId) || {
      templateId,
      totalAssets: 0,
      downloadedAssets: 0,
      currentAsset: '',
      progress: 0,
      status: 'idle',
    };
  }

  // Get all cached assets for a template
  async getCachedAssets(templateId: string): Promise<CachedAsset[]> {
    await this.init();
    if (!this.db) return [];
    
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('templateId');
      const request = index.getAll(templateId);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  // Clear all cached assets for a template
  async clearTemplateCache(templateId: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('templateId');
    const request = index.openCursor(IDBKeyRange.only(templateId));
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    this.templateProgress.delete(templateId);
  }

  // Get cache statistics
  async getCacheStats(): Promise<{ 
    totalSize: number; 
    assetCount: number; 
    templateCount: number 
  }> {
    await this.init();
    if (!this.db) return { totalSize: 0, assetCount: 0, templateCount: 0 };
    
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const allAssets = request.result || [];
        const templates = new Set<string>();
        let totalSize = 0;
        
        for (const asset of allAssets) {
          totalSize += asset.size;
          templates.add(asset.templateId);
        }
        
        resolve({
          totalSize,
          assetCount: allAssets.length,
          templateCount: templates.size,
        });
      };
      
      request.onerror = () => resolve({ totalSize: 0, assetCount: 0, templateCount: 0 });
    });
  }

  // Create object URL for cached asset
  async getAssetUrl(templateId: string, category: string, filename: string): Promise<string | null> {
    const blob = await this.getCachedAsset(templateId, category, filename);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }

  // Load asset as specific type
  async loadAsImage(templateId: string, category: string, filename: string): Promise<HTMLImageElement | null> {
    const url = await this.getAssetUrl(templateId, category, filename);
    if (!url) return null;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  async loadAsVideo(templateId: string, category: string, filename: string): Promise<HTMLVideoElement | null> {
    const url = await this.getAssetUrl(templateId, category, filename);
    if (!url) return null;
    
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.onloadeddata = () => resolve(video);
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      video.src = url;
      video.load();
    });
  }

  async loadAsAudio(templateId: string, category: string, filename: string): Promise<HTMLAudioElement | null> {
    const url = await this.getAssetUrl(templateId, category, filename);
    if (!url) return null;
    
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadeddata = () => resolve(audio);
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      audio.src = url;
      audio.load();
    });
  }
}

// Export singleton instance
export const templateAssetLoader = new TemplateAssetLoaderService();
export default templateAssetLoader;
