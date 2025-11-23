/**
 * Intelligent LRU Translation Cache
 * Caches up to 20k translations with smart eviction
 */

interface CacheEntry {
  translation: string;
  confidence: number;
  method: string;
  timestamp: number;
  usageCount: number;
  lastUsed: number;
}

export class TranslationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize = 20000; // BALANCE: 20k entries

  /**
   * Get cached translation
   */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key.toLowerCase());
    
    if (entry) {
      // Update usage stats
      entry.usageCount++;
      entry.lastUsed = Date.now();
      return entry;
    }
    
    return null;
  }

  /**
   * Set cached translation
   */
  set(key: string, translation: string, confidence: number, method: string): void {
    const normalizedKey = key.toLowerCase();
    
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(normalizedKey)) {
      this.evict();
    }

    this.cache.set(normalizedKey, {
      translation,
      confidence,
      method,
      timestamp: Date.now(),
      usageCount: 1,
      lastUsed: Date.now()
    });
  }

  /**
   * Smart eviction: Remove 20% least valuable entries
   */
  private evict(): void {
    const entries = Array.from(this.cache.entries());
    
    // Calculate value score: 70% usage, 30% recency
    const scored = entries.map(([key, entry]) => {
      const ageHours = (Date.now() - entry.lastUsed) / (1000 * 60 * 60);
      const usageScore = Math.min(entry.usageCount / 10, 1); // Normalize to 0-1
      const recencyScore = Math.max(0, 1 - ageHours / 168); // 0-1 over 1 week
      const totalScore = 0.7 * usageScore + 0.3 * recencyScore;
      
      return { key, score: totalScore };
    });

    // Sort by score and remove bottom 20%
    scored.sort((a, b) => a.score - b.score);
    const toRemove = Math.floor(scored.length * 0.2);
    
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(scored[i].key);
    }

    console.log(`🗑️ Cache evicted ${toRemove} entries, size now: ${this.cache.size}`);
  }

  /**
   * Calculate cache hit rate
   */
  getHitRate(): number {
    const entries = Array.from(this.cache.values());
    const totalUsage = entries.reduce((sum, e) => sum + e.usageCount, 0);
    const uniqueEntries = entries.length;
    
    return uniqueEntries > 0 ? (totalUsage - uniqueEntries) / totalUsage : 0;
  }

  /**
   * Get cache stats
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalUsage: entries.reduce((sum, e) => sum + e.usageCount, 0),
      avgUsage: entries.length > 0 
        ? entries.reduce((sum, e) => sum + e.usageCount, 0) / entries.length 
        : 0,
      hitRate: this.getHitRate(),
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(e => e.timestamp))
        : null
    };
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}

export const translationCache = new TranslationCache();
