import { supabase } from "@/integrations/supabase/client";
import { DictionaryEntry } from "@/data/fullDictionaryData";

const CACHE_KEY = "dictionary_cache";
const CACHE_VERSION = "v1";
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CacheData {
  version: string;
  timestamp: number;
  entries: DictionaryEntry[];
}

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Open or create IndexedDB database for dictionary cache
 */
async function openCacheDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("DictionaryCache", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("dictionary")) {
        db.createObjectStore("dictionary");
      }
    };
  });
}

/**
 * Get cached dictionary from IndexedDB
 */
async function getCachedDictionary(): Promise<DictionaryEntry[] | null> {
  try {
    const db = await openCacheDB();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["dictionary"], "readonly");
      const store = transaction.objectStore("dictionary");
      const request = store.get(CACHE_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result as CacheData | undefined;
        
        if (!data || data.version !== CACHE_VERSION) {
          resolve(null);
          return;
        }

        // Check if cache is expired
        const now = Date.now();
        if (now - data.timestamp > CACHE_EXPIRY) {
          resolve(null);
          return;
        }

        resolve(data.entries);
      };
    });
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null;
  }
}

/**
 * Save dictionary to IndexedDB cache
 */
async function saveDictionaryToCache(entries: DictionaryEntry[]): Promise<void> {
  try {
    const db = await openCacheDB();
    if (!db) return;

    const cacheData: CacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      entries
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["dictionary"], "readwrite");
      const store = transaction.objectStore("dictionary");
      const request = store.put(cacheData, CACHE_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Error saving to cache:", error);
  }
}

/**
 * Fetch dictionary entries from Supabase
 */
async function fetchDictionaryFromDB(): Promise<DictionaryEntry[]> {
  const { data, error } = await supabase
    .from('dictionary_entries')
    .select('*')
    .order('word');

  if (error) {
    console.error("Error fetching dictionary:", error);
    return [];
  }

  return data.map(entry => ({
    word: entry.word,
    phonetic: entry.phonetic || null,
    part_of_speech: entry.part_of_speech || "",
    definition: entry.definition,
    example_bariba: entry.example_bariba || [],
    example_francais: entry.example_francais || [],
    notes: "",
    source_flags: [],
    incertitude: 0,
    french_keywords: entry.french_keywords || [],
    variants: entry.variants || []
  }));
}

/**
 * Preload dictionary with caching support
 * This function will:
 * 1. Check IndexedDB cache first
 * 2. If cache is valid, return cached data
 * 3. If cache is invalid or missing, fetch from Supabase
 * 4. Save fresh data to cache for next time
 */
export async function preloadDictionary(): Promise<DictionaryEntry[]> {
  try {
    // Try to get from cache first
    const cachedEntries = await getCachedDictionary();
    
    if (cachedEntries && cachedEntries.length > 0) {
      console.log(`Loaded ${cachedEntries.length} entries from cache`);
      return cachedEntries;
    }

    // Cache miss or invalid - fetch from database
    console.log("Cache miss - fetching dictionary from database...");
    const entries = await fetchDictionaryFromDB();

    // Save to cache for next time
    if (entries.length > 0) {
      await saveDictionaryToCache(entries);
      console.log(`Cached ${entries.length} dictionary entries`);
    }

    return entries;
  } catch (error) {
    console.error("Error preloading dictionary:", error);
    return [];
  }
}

/**
 * Clear the dictionary cache
 */
export async function clearDictionaryCache(): Promise<void> {
  try {
    const db = await openCacheDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["dictionary"], "readwrite");
      const store = transaction.objectStore("dictionary");
      const request = store.delete(CACHE_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log("Dictionary cache cleared");
        resolve();
      };
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

/**
 * Get cache status information
 */
export async function getCacheStatus(): Promise<{
  cached: boolean;
  entryCount: number;
  timestamp: number | null;
  age: number | null;
}> {
  try {
    const db = await openCacheDB();
    if (!db) {
      return { cached: false, entryCount: 0, timestamp: null, age: null };
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["dictionary"], "readonly");
      const store = transaction.objectStore("dictionary");
      const request = store.get(CACHE_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result as CacheData | undefined;
        
        if (!data) {
          resolve({ cached: false, entryCount: 0, timestamp: null, age: null });
          return;
        }

        const age = Date.now() - data.timestamp;
        resolve({
          cached: true,
          entryCount: data.entries.length,
          timestamp: data.timestamp,
          age
        });
      };
    });
  } catch (error) {
    console.error("Error getting cache status:", error);
    return { cached: false, entryCount: 0, timestamp: null, age: null };
  }
}
