/**
 * Translation Cache Service
 * LRU cache to avoid redundant translations of common phrases
 */

interface CacheEntry {
  translation: string;
  timestamp: number;
  hits: number;
}

interface CacheData {
  [key: string]: CacheEntry;
}

const CACHE_KEY = 'tamtam_translation_cache';
const MAX_ENTRIES = 500;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class TranslationCacheService {
  private cache: CacheData = {};
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (this.initialized) return;
    
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        this.cleanup();
      }
      this.initialized = true;
    } catch (err) {
      console.warn('[TranslationCache] Failed to load cache:', err);
      this.cache = {};
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (err) {
      console.warn('[TranslationCache] Failed to save cache:', err);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Object.entries(this.cache);
    
    // Remove expired entries
    const validEntries = entries.filter(([_, entry]) => 
      now - entry.timestamp < TTL_MS
    );
    
    // If still over limit, remove least used
    if (validEntries.length > MAX_ENTRIES) {
      validEntries.sort((a, b) => b[1].hits - a[1].hits);
      validEntries.splice(MAX_ENTRIES);
    }
    
    this.cache = Object.fromEntries(validEntries);
    this.saveToStorage();
  }

  private generateKey(text: string, from: string, to: string): string {
    return `${from}:${to}:${text.toLowerCase().trim()}`;
  }

  get(text: string, from: string, to: string): string | null {
    const key = this.generateKey(text, from, to);
    const entry = this.cache[key];
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > TTL_MS) {
      delete this.cache[key];
      this.saveToStorage();
      return null;
    }
    
    // Update hit count
    entry.hits++;
    this.saveToStorage();
    
    return entry.translation;
  }

  set(text: string, from: string, to: string, translation: string): void {
    const key = this.generateKey(text, from, to);
    
    this.cache[key] = {
      translation,
      timestamp: Date.now(),
      hits: 1
    };
    
    // Cleanup if over limit
    if (Object.keys(this.cache).length > MAX_ENTRIES) {
      this.cleanup();
    } else {
      this.saveToStorage();
    }
  }

  getStats(): { entries: number; totalHits: number; oldestEntry: Date | null } {
    const entries = Object.values(this.cache);
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const oldest = entries.length > 0 
      ? new Date(Math.min(...entries.map(e => e.timestamp)))
      : null;
    
    return { entries: entries.length, totalHits, oldestEntry: oldest };
  }

  clear(): void {
    this.cache = {};
    localStorage.removeItem(CACHE_KEY);
  }
}

export const translationCache = new TranslationCacheService();
