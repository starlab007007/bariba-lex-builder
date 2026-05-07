// Audio Library Types for TAM-TAM

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  bpm?: number;
  mood: string[];
  tags: string[];
  language: string;
  description?: {
    fr: string;
    bariba: string;
  };
  source: {
    type: 'url' | 'local';
    url?: string;
    path?: string;
    preload?: boolean;
  };
  // Runtime properties
  isPlaying?: boolean;
  isLoading?: boolean;
  audioBlob?: Blob;
}

export interface AudioCategory {
  id: string;
  name: {
    fr: string;
    bariba: string;
  };
  emoji: string;
  description: {
    fr: string;
    bariba: string;
  };
  tracks: AudioTrack[];
}

export interface AudioLibrary {
  version: string;
  lastUpdated: string;
  categories: AudioCategory[];
  featured: string[];
  metadata: {
    totalTracks: number;
    totalDuration: number;
    languages: string[];
    avgBpm: number;
  };
}

export interface AudioSearchOptions {
  query?: string;
  category?: string;
  mood?: string[];
  bpmRange?: [number, number];
  language?: string;
  maxResults?: number;
}

export interface AudioCacheEntry {
  trackId: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

export interface AudioCacheStats {
  itemsCount: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}
