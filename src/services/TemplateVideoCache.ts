/**
 * TemplateVideoCache - IndexedDB cache for generated template videos
 * Stores WebM blobs to avoid regenerating videos on every view
 */

const DB_NAME = 'tamtam-template-videos';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

interface CachedVideo {
  templateId: string;
  blob: Blob;
  durationMs: number;
  frameCount: number;
  createdAt: number;
  version: string;
}

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'templateId' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const templateVideoCache = {
  /**
   * Get cached video blob for a template
   * @param cacheKey - The cache key (can be templateId or a composite key like "templateId:duration:frameCount:hash")
   */
  async get(cacheKey: string): Promise<CachedVideo | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(cacheKey);

        request.onsuccess = () => {
          const result = request.result as CachedVideo | undefined;
          if (result) {
            console.log(`[TemplateVideoCache] Cache hit for: ${cacheKey}`);
          }
          resolve(result || null);
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
   * @param cacheKey - The cache key (can be templateId or a composite key)
   */
  async set(
    cacheKey: string,
    blob: Blob,
    durationMs: number,
    frameCount: number,
    version: string = '1.0'
  ): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const data: CachedVideo = {
          templateId: cacheKey, // Use cacheKey as templateId for storage
          blob,
          durationMs,
          frameCount,
          createdAt: Date.now(),
          version
        };

        const request = store.put(data);

        request.onsuccess = () => {
          console.log(`[TemplateVideoCache] Cached video: ${cacheKey} (${(blob.size / 1024).toFixed(1)}KB)`);
          resolve();
        };

        request.onerror = () => {
          console.warn('[TemplateVideoCache] Set failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[TemplateVideoCache] Set error:', error);
    }
  },

  /**
   * Delete a cached video
   */
  async delete(templateId: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(templateId);

        request.onsuccess = () => resolve();
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
          console.log('[TemplateVideoCache] Cache cleared');
          resolve();
        };
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('[TemplateVideoCache] Clear error:', error);
    }
  },

  /**
   * Get cache stats
   */
  async getStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result as CachedVideo[];
          const totalSize = items.reduce((sum, item) => sum + (item.blob?.size || 0), 0);
          resolve({ count: items.length, totalSize });
        };

        request.onerror = () => {
          resolve({ count: 0, totalSize: 0 });
        };
      });
    } catch (error) {
      return { count: 0, totalSize: 0 };
    }
  }
};

export default templateVideoCache;
