/**
 * Service de gestion IndexedDB pour le stockage offline
 * Gère les bases de données pour les traductions et l'audio
 */

const DB_NAME = 'tamtam-offline-db';
const DB_VERSION = 1;

export interface CachedTranslation {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  usageCount: number;
}

export interface CachedAudio {
  id: string;
  text: string;
  language: string;
  audioBlob: Blob;
  timestamp: number;
  usageCount: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Erreur ouverture:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Base de données ouverte');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour les traductions
        if (!db.objectStoreNames.contains('translations')) {
          const translationStore = db.createObjectStore('translations', { keyPath: 'id' });
          translationStore.createIndex('sourceText', 'sourceText', { unique: false });
          translationStore.createIndex('sourceLang', 'sourceLang', { unique: false });
          translationStore.createIndex('usageCount', 'usageCount', { unique: false });
        }

        // Store pour le dictionnaire complet
        if (!db.objectStoreNames.contains('dictionary')) {
          const dictStore = db.createObjectStore('dictionary', { keyPath: 'id' });
          dictStore.createIndex('french', 'french', { unique: false });
          dictStore.createIndex('bariba', 'bariba', { unique: false });
        }

        // Store pour l'audio caché
        if (!db.objectStoreNames.contains('audio')) {
          const audioStore = db.createObjectStore('audio', { keyPath: 'id' });
          audioStore.createIndex('text', 'text', { unique: false });
          audioStore.createIndex('language', 'language', { unique: false });
        }

        // Store pour les métadonnées
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('[IndexedDB] Schéma créé/mis à jour');
      };
    });

    return this.initPromise;
  }

  async getTransaction(storeNames: string | string[], mode: IDBTransactionMode = 'readonly'): Promise<IDBTransaction> {
    const db = await this.init();
    return db.transaction(storeNames, mode);
  }

  // Méthodes génériques CRUD
  async put<T>(storeName: string, data: T): Promise<void> {
    const tx = await this.getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const tx = await this.getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const tx = await this.getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
    const tx = await this.getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const tx = await this.getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const tx = await this.getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    const tx = await this.getTransaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    const tx = await this.getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = items.length;
      
      if (total === 0) {
        resolve();
        return;
      }

      items.forEach((item) => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });

      tx.onerror = () => reject(tx.error);
    });
  }

  // Métadonnées
  async setMetadata(key: string, value: unknown): Promise<void> {
    await this.put('metadata', { key, value, timestamp: Date.now() });
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    const result = await this.get<{ key: string; value: T }>('metadata', key);
    return result?.value;
  }

  // Estimation de la taille du cache
  async estimateStorageSize(): Promise<{ used: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0
      };
    }
    return { used: 0, quota: 0, percentage: 0 };
  }
}

export const indexedDBService = new IndexedDBService();
