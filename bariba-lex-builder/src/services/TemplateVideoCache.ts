/**
 * TemplateVideoCache - IndexedDB cache for generated template videos
 * Stores video blobs to avoid regenerating videos on every view
 * Supports cache key generation based on audio/photos/style inputs
 */

const DB_NAME = 'tamtam-template-videos';
const STORE_NAME = 'videos';
const DB_VERSION = 2;
const MAX_CACHE_SIZE_MB = 200;
const MAX_CACHE_AGE_DAYS = 7;

interface CachedVideo {
  cacheKey: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  metadata: Record<string, any>;
  createdAt: number;
  accessedAt: number;
  size: number;
  version: string;
}

interface CacheStats {
  count: number;
  totalSize: number;
  totalSizeMB: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Delete old store if exists (schema change)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
      store.createIndex('createdAt', 'createdAt', { unique: false });
      store.createIndex('accessedAt', 'accessedAt', { unique: false });
      store.createIndex('size', 'size', { unique: false });
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('✅ TemplateVideoCache initialized');
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Generate a fast hash from a Blob (size + first KB sample)
 */
async function hashBlob(blob: Blob): Promise<string> {
  const size = blob.size;
  const sampleSize = Math.min(1024, size);
  const sample = await blob.slice(0, sampleSize).arrayBuffer();
  const sampleArray = new Uint8Array(sample);
  
  let hash = size;
  for (let i = 0; i < sampleArray.length; i++) {
    hash = ((hash << 5) - hash + sampleArray[i]) | 0;
  }
  
  return `${size}_${Math.abs(hash).toString(36)}`;
}

export const templateVideoCache = {
  /**
   * Generate a unique cache key based on template inputs
   */
  async generateCacheKey(params: {
    templateId: string;
    audioBlob: Blob;
    style: string;
    photos?: (string | null)[];
    language?: string;
    duration?: number;
  }): Promise<string> {
    const { templateId, audioBlob, style, photos = [], language = 'fr', duration = 0 } = params;
    
    // Hash audio content
    const audioHash = await hashBlob(audioBlob);
    
    // Photo signature (presence only, not content - for performance)
    const photoSig = photos.map(p => p ? '1' : '0').join('');
    
    // Combine into unique key
    const keyParts = [
      templateId,
      audioHash,
      style,
      photoSig,
      language,
      Math.round(duration).toString()
    ];
    
    return keyParts.join('_');
  },

  /**
   * Get cached video blob for a cache key
   */
  async get(cacheKey: string): Promise<{ blob: Blob; metadata: Record<string, any> } | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(cacheKey);

        request.onsuccess = () => {
          const result = request.result as CachedVideo | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }
          
          // Check age
          const ageMs = Date.now() - result.createdAt;
          const maxAgeMs = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
          
          if (ageMs > maxAgeMs) {
            console.log('🗑️ Cache expired, removing:', cacheKey);
            store.delete(cacheKey);
            resolve(null);
            return;
          }
          
          // Update accessedAt (LRU tracking)
          result.accessedAt = Date.now();
          store.put(result);
          
          console.log(`✅ Cache hit: ${cacheKey} (${(result.size / 1024 / 1024).toFixed(2)}MB)`);
          resolve({
            blob: result.blob,
            metadata: result.metadata
          });
        };

        request.onerror = () => {
          console.warn('[TemplateVideoCache] Get failed:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.warn('[TemplateVideoCache] Get error:', error);
      return null;
    }
  },

  /**
   * Store a generated video blob
   */
  async set(
    cacheKey: string,
    blob: Blob,
    metadata: Record<string, any> = {},
    version: string = '1.0'
  ): Promise<boolean> {
    try {
      // ✅ FIX: Skip empty blobs
      if (blob.size === 0) {
        console.warn('⚠️ Refusing to cache empty blob');
        return false;
      }
      
      // ✅ FIX: Skip invalid duration
      const duration = metadata.duration;
      if (duration !== undefined && (!isFinite(duration) || duration <= 0)) {
        console.warn('⚠️ Refusing to cache blob with invalid duration:', duration);
        return false;
      }
      
      // Skip if too large
      const sizeMB = blob.size / 1024 / 1024;
      if (sizeMB > 50) {
        console.warn('⚠️ Video too large to cache:', sizeMB.toFixed(2), 'MB');
        return false;
      }
      
      // Ensure cache space
      await this.ensureCacheSpace(blob.size);
      
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const data: CachedVideo = {
          cacheKey,
          blob,
          mimeType: blob.type,
          durationMs: metadata.duration || 0,
          metadata,
          createdAt: Date.now(),
          accessedAt: Date.now(),
          size: blob.size,
          version
        };

        const request = store.put(data);

        request.onsuccess = () => {
          console.log(`💾 Cached video: ${cacheKey} (${sizeMB.toFixed(2)}MB)`);
          resolve(true);
        };

        request.onerror = () => {
          console.warn('[TemplateVideoCache] Set failed:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.warn('[TemplateVideoCache] Set error:', error);
      return false;
    }
  },

  /**
   * Ensure enough space for a new entry (LRU eviction)
   */
  async ensureCacheSpace(neededBytes: number): Promise<void> {
    try {
      const stats = await this.getStats();
      const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
      
      if (stats.totalSize + neededBytes <= maxBytes) {
        return; // Enough space
      }
      
      console.log('🧹 Cache full, cleaning old entries...');
      
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('accessedAt');
        const request = index.openCursor();
        
        let freedBytes = 0;
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor && freedBytes < neededBytes) {
            const entry = cursor.value as CachedVideo;
            freedBytes += entry.size;
            console.log('🗑️ Evicting:', entry.cacheKey);
            cursor.delete();
            cursor.continue();
          } else {
            console.log('✅ Freed', (freedBytes / 1024 / 1024).toFixed(2), 'MB');
            resolve();
          }
        };
        
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('[TemplateVideoCache] Eviction error:', error);
    }
  },

  /**
   * Delete a cached video
   */
  async delete(cacheKey: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(cacheKey);

        request.onsuccess = () => {
          console.log('🗑️ Deleted:', cacheKey);
          resolve();
        };
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('[TemplateVideoCache] Delete error:', error);
    }
  },

  /**
   * Clear all cached videos
   */
  async clear(): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('🧹 Cache cleared');
          resolve();
        };
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('[TemplateVideoCache] Clear error:', error);
    }
  },

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    try {
      const maxAgeMs = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - maxAgeMs;
      
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('createdAt');
        const range = IDBKeyRange.upperBound(cutoff);
        const request = index.openCursor(range);
        
        let deleted = 0;
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (cursor) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            console.log('🧹 Cleaned', deleted, 'expired entries');
            resolve(deleted);
          }
        };
        
        request.onerror = () => resolve(deleted);
      });
    } catch (error) {
      return 0;
    }
  },

  /**
   * Get cache stats
   */
  async getStats(): Promise<CacheStats> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result as CachedVideo[];
          
          if (items.length === 0) {
            resolve({ count: 0, totalSize: 0, totalSizeMB: 0, oldestEntry: null, newestEntry: null });
            return;
          }
          
          const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
          const times = items.map(e => e.createdAt);
          
          resolve({
            count: items.length,
            totalSize,
            totalSizeMB: totalSize / 1024 / 1024,
            oldestEntry: Math.min(...times),
            newestEntry: Math.max(...times)
          });
        };

        request.onerror = () => {
          resolve({ count: 0, totalSize: 0, totalSizeMB: 0, oldestEntry: null, newestEntry: null });
        };
      });
    } catch (error) {
      return { count: 0, totalSize: 0, totalSizeMB: 0, oldestEntry: null, newestEntry: null };
    }
  },

  /**
   * List all cache keys
   */
  async listKeys(): Promise<string[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          resolve([]);
        };
      });
    } catch (error) {
      return [];
    }
  }
};

export type { CachedVideo, CacheStats };
export default templateVideoCache;
