// Audio Library Service - Singleton for managing TAM-TAM audio tracks
// Includes caching, search, preloading, and DB track loading

import type { 
  AudioTrack, 
  AudioLibrary, 
  AudioSearchOptions, 
  AudioCacheStats 
} from '@/types/audio';
import { supabase } from '@/integrations/supabase/client';

const DEBUG = false;
const CACHE_NAME = 'tamtam-audio-cache-v1';
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200 MB
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class AudioLibraryServiceClass {
  private static instance: AudioLibraryServiceClass;
  private library: AudioLibrary | null = null;
  private memoryCache: Map<string, Blob> = new Map();
  private loadingPromises: Map<string, Promise<Blob>> = new Map();
  private isInitialized = false;
  private dbTracks: AudioTrack[] = [];

  private constructor() {}

  static getInstance(): AudioLibraryServiceClass {
    if (!AudioLibraryServiceClass.instance) {
      AudioLibraryServiceClass.instance = new AudioLibraryServiceClass();
    }
    return AudioLibraryServiceClass.instance;
  }

  // Initialize and load library
  async initialize(): Promise<AudioLibrary> {
    if (this.library && this.isInitialized) {
      return this.library;
    }

    try {
      const response = await fetch('/templates/packs/audio/music_library.json');
      if (!response.ok) throw new Error('Failed to load music library');
      
      this.library = await response.json();
      this.isInitialized = true;
      
      if (DEBUG) console.log('[AudioLibrary] Loaded:', this.library?.metadata);
      
      // Load DB tracks in parallel
      await this.loadDbTracks();
      
      // Preload featured tracks
      this.preloadFeatured();
      
      return this.library!;
    } catch (error) {
      console.error('[AudioLibrary] Init error:', error);
      throw error;
    }
  }

  // Load tracks from music_library_tracks DB table
  private async loadDbTracks(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('music_library_tracks' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (DEBUG) console.warn('[AudioLibrary] DB tracks load error:', error);
        return;
      }

      this.dbTracks = (data || []).map((row: any) => ({
        id: `db_${row.id}`,
        title: row.title,
        artist: row.artist || 'TAM-TAM',
        duration: row.duration || 0,
        bpm: row.bpm || undefined,
        mood: [row.mood],
        tags: Array.isArray(row.tags) ? row.tags : [],
        language: 'fr',
        description: { fr: row.description_fr || '', bariba: '' },
        source: {
          type: 'url' as const,
          url: row.audio_url,
        },
      }));

      if (DEBUG) console.log('[AudioLibrary] DB tracks loaded:', this.dbTracks.length);
    } catch (error) {
      if (DEBUG) console.warn('[AudioLibrary] DB tracks error:', error);
    }
  }

  // Get all tracks flat (JSON library + DB tracks)
  getAllTracks(): AudioTrack[] {
    const jsonTracks = this.library ? this.library.categories.flatMap(cat => cat.tracks) : [];
    return [...jsonTracks, ...this.dbTracks];
  }

  // Get track by ID
  getTrack(trackId: string): AudioTrack | null {
    return this.getAllTracks().find(t => t.id === trackId) || null;
  }

  // Get tracks by category
  getTracksByCategory(categoryId: string): AudioTrack[] {
    if (!this.library) return [];
    const category = this.library.categories.find(c => c.id === categoryId);
    return category?.tracks || [];
  }

  // Search tracks
  searchTracks(options: AudioSearchOptions): AudioTrack[] {
    let results = this.getAllTracks();
    
    // Filter by query
    if (options.query) {
      const q = options.query.toLowerCase();
      results = results.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (options.category) {
      results = results.filter(t => {
        const cat = this.library?.categories.find(c => 
          c.tracks.some(ct => ct.id === t.id)
        );
        return cat?.id === options.category;
      });
    }

    // Filter by mood
    if (options.mood && options.mood.length > 0) {
      results = results.filter(t =>
        options.mood!.some(m => t.mood.includes(m))
      );
    }

    // Filter by BPM range
    if (options.bpmRange) {
      const [min, max] = options.bpmRange;
      results = results.filter(t => 
        t.bpm && t.bpm >= min && t.bpm <= max
      );
    }

    // Filter by language
    if (options.language) {
      results = results.filter(t => t.language === options.language);
    }

    // Limit results
    if (options.maxResults) {
      results = results.slice(0, options.maxResults);
    }

    return results;
  }

  // Get similar tracks
  getSimilarTracks(trackId: string, limit = 5): AudioTrack[] {
    const track = this.getTrack(trackId);
    if (!track) return [];

    const allTracks = this.getAllTracks().filter(t => t.id !== trackId);
    
    // Score based on mood and tags overlap
    const scored = allTracks.map(t => {
      let score = 0;
      
      // Mood overlap
      const moodOverlap = t.mood.filter(m => track.mood.includes(m)).length;
      score += moodOverlap * 3;
      
      // Tag overlap
      const tagOverlap = t.tags.filter(tag => track.tags.includes(tag)).length;
      score += tagOverlap * 2;
      
      // BPM proximity
      if (t.bpm && track.bpm) {
        const bpmDiff = Math.abs(t.bpm - track.bpm);
        score += Math.max(0, 10 - bpmDiff / 5);
      }
      
      // Same language bonus
      if (t.language === track.language) score += 2;
      
      return { track: t, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.track);
  }

  // Get track audio blob (with caching)
  async getTrackBlob(track: AudioTrack): Promise<Blob> {
    const trackId = track.id;
    
    // Check memory cache first
    if (this.memoryCache.has(trackId)) {
      if (DEBUG) console.log('[AudioLibrary] Memory cache hit:', trackId);
      return this.memoryCache.get(trackId)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(trackId)) {
      return this.loadingPromises.get(trackId)!;
    }

    // Check browser cache
    const cachedBlob = await this.getFromCache(trackId);
    if (cachedBlob) {
      this.memoryCache.set(trackId, cachedBlob);
      if (DEBUG) console.log('[AudioLibrary] Browser cache hit:', trackId);
      return cachedBlob;
    }

    // Download and cache
    const loadPromise = this.downloadAndCache(track);
    this.loadingPromises.set(trackId, loadPromise);

    try {
      const blob = await loadPromise;
      this.memoryCache.set(trackId, blob);
      return blob;
    } finally {
      this.loadingPromises.delete(trackId);
    }
  }

  // Download track and save to cache
  private async downloadAndCache(track: AudioTrack): Promise<Blob> {
    const url = track.source.type === 'url' 
      ? track.source.url! 
      : track.source.path!;
    
    if (DEBUG) console.log('[AudioLibrary] Downloading:', track.id, url);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    
    const blob = await response.blob();
    
    // Save to browser cache
    await this.saveToCache(track.id, blob);
    
    return blob;
  }

  // Browser Cache API operations
  private async getFromCache(trackId: string): Promise<Blob | null> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(trackId);
      if (response) {
        return await response.blob();
      }
    } catch (error) {
      if (DEBUG) console.warn('[AudioLibrary] Cache read error:', error);
    }
    return null;
  }

  private async saveToCache(trackId: string, blob: Blob): Promise<void> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(blob, {
        headers: {
          'Content-Type': blob.type,
          'X-Cached-At': Date.now().toString(),
        }
      });
      await cache.put(trackId, response);
      if (DEBUG) console.log('[AudioLibrary] Cached:', trackId);
    } catch (error) {
      if (DEBUG) console.warn('[AudioLibrary] Cache write error:', error);
    }
  }

  // Preload featured tracks
  private async preloadFeatured(): Promise<void> {
    if (!this.library?.featured) return;
    
    for (const trackId of this.library.featured) {
      const track = this.getTrack(trackId);
      if (track?.source.preload) {
        this.getTrackBlob(track).catch(() => {
          // Silently fail preload
        });
      }
    }
  }

  // Get cache stats
  getCacheStats(): AudioCacheStats {
    let totalSize = 0;
    let oldest = Date.now();
    let newest = 0;

    this.memoryCache.forEach((blob) => {
      totalSize += blob.size;
    });

    return {
      itemsCount: this.memoryCache.size,
      totalSize,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  // Clear all caches
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    try {
      await caches.delete(CACHE_NAME);
    } catch (error) {
      console.warn('[AudioLibrary] Failed to clear browser cache:', error);
    }
  }

  // Get library metadata
  getLibrary(): AudioLibrary | null {
    return this.library;
  }

  // Format duration
  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const AudioLibraryService = AudioLibraryServiceClass.getInstance();
export default AudioLibraryService;
