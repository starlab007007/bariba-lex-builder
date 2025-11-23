/**
 * Intelligent LRU Translation Cache with SMT Optimization
 * Caches up to 50k translations with smart eviction and pre-warming
 */

interface CacheEntry {
  translation: string;
  confidence: number;
  method: string;
  timestamp: number;
  usageCount: number;
  lastUsed: number;
  avgDuration?: number; // Track translation speed
}

export class TranslationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize = 50000; // OPTIMIZED: 50k entries for better SMT performance
  private hits = 0;
  private misses = 0;

  /**
   * Get cached translation
   */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key.toLowerCase());
    
    if (entry) {
      // Update usage stats
      entry.usageCount++;
      entry.lastUsed = Date.now();
      this.hits++;
      return entry;
    }
    
    this.misses++;
    return null;
  }

  /**
   * Set cached translation with duration tracking
   */
  set(key: string, translation: string, confidence: number, method: string, duration?: number): void {
    const normalizedKey = key.toLowerCase();
    
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(normalizedKey)) {
      this.evict();
    }

    const existing = this.cache.get(normalizedKey);
    const avgDuration = existing?.avgDuration 
      ? (existing.avgDuration + (duration || 0)) / 2 
      : duration;

    this.cache.set(normalizedKey, {
      translation,
      confidence,
      method,
      timestamp: Date.now(),
      usageCount: existing ? existing.usageCount + 1 : 1,
      lastUsed: Date.now(),
      avgDuration
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
   * Calculate real-time cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Pre-warm cache with frequent translations
   */
  preWarm(translations: Array<{ source: string; target: string; method: string }>): void {
    console.log(`🔥 Pre-warming cache with ${translations.length} translations...`);
    translations.forEach(t => {
      this.set(t.source, t.target, 95, t.method);
    });
    console.log(`✅ Cache pre-warmed: ${this.cache.size} entries`);
  }

  /**
   * Get comprehensive cache stats
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalUsage = entries.reduce((sum, e) => sum + e.usageCount, 0);
    const avgDuration = entries
      .filter(e => e.avgDuration)
      .reduce((sum, e) => sum + (e.avgDuration || 0), 0) / entries.length;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalUsage,
      avgUsage: entries.length > 0 ? totalUsage / entries.length : 0,
      hitRate: this.getHitRate(),
      hits: this.hits,
      misses: this.misses,
      avgDuration: avgDuration || 0,
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(e => e.timestamp))
        : null,
      utilizationRate: (this.cache.size / this.maxSize) * 100
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
