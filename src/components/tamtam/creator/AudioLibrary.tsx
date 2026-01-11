// AudioLibrary - TAM-TAM Music Selector Component
// Kuaishou-style design with categories, search, and preview

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Play, 
  Pause, 
  Check, 
  Music2,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioLibrary, useTrackPlayer } from '@/hooks/useAudioLibrary';
import type { AudioTrack, AudioCategory } from '@/types/audio';

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface AudioLibraryProps {
  isOpen?: boolean;
  onSelectTrack: (track: AudioTrack) => void;
  onClose: () => void;
  selectedTrackId?: string;
}

const AudioLibrary: React.FC<AudioLibraryProps> = ({
  isOpen = true,
  onSelectTrack,
  onClose,
  selectedTrackId,
}) => {
  const { library, isLoading, error } = useAudioLibrary();
  const { currentTrack, isPlaying, isLoading: trackLoading, togglePlay } = useTrackPlayer();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Get all tracks with filtering
  const filteredTracks = useMemo(() => {
    if (!library) return [];
    
    let tracks = library.categories.flatMap(cat => cat.tracks);
    
    // Filter by category
    if (activeCategory) {
      const cat = library.categories.find(c => c.id === activeCategory);
      tracks = cat?.tracks || [];
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tracks = tracks.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    
    return tracks;
  }, [library, activeCategory, searchQuery]);

  // Handle track selection
  const handleSelect = (track: AudioTrack) => {
    onSelectTrack(track);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5 text-orange-400" />
          <span className="text-white font-bold">Bibliothèque Audio</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, artiste, tag..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 outline-none focus:border-orange-500/50"
          />
        </div>
      </div>

      {/* Category Pills */}
      {library && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              !activeCategory
                ? "bg-orange-500 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            🎵 Tout
          </button>
          {library.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-orange-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {cat.emoji} {cat.name.fr}
            </button>
          ))}
        </div>
      )}

      {/* Track List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-white/60">
            Erreur de chargement de la bibliothèque
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            Aucune musique trouvée
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTracks.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                isPlaying={currentTrack?.id === track.id && isPlaying}
                isLoading={currentTrack?.id === track.id && trackLoading}
                onPlay={() => togglePlay(track)}
                onSelect={() => handleSelect(track)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Track Item Component
interface TrackItemProps {
  track: AudioTrack;
  isSelected: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onSelect: () => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  track,
  isSelected,
  isPlaying,
  isLoading,
  onPlay,
  onSelect,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-3 rounded-xl transition-all",
        isSelected
          ? "bg-orange-500/20 border-2 border-orange-500"
          : "bg-white/5 border border-white/10 hover:bg-white/10"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Play button */}
        <button
          onClick={onPlay}
          className={cn(
            "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
            isPlaying
              ? "bg-orange-500 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm truncate">
            {track.title}
          </h4>
          <p className="text-white/50 text-xs truncate">
            {track.artist} • {formatDuration(track.duration)}
            {track.bpm && <span> • {track.bpm} BPM</span>}
          </p>
        </div>

        {/* Mood tags */}
        <div className="hidden sm:flex gap-1">
          {track.mood.slice(0, 2).map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-xs"
            >
              {m}
            </span>
          ))}
        </div>

        {/* Select button */}
        <button
          onClick={onSelect}
          className={cn(
            "shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            isSelected
              ? "bg-orange-500 text-white"
              : "bg-white/10 text-white hover:bg-orange-500/20 hover:text-orange-400"
          )}
        >
          {isSelected ? (
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              Sélectionné
            </span>
          ) : (
            "Choisir"
          )}
        </button>
      </div>

      {/* Playing indicator bar */}
      {isPlaying && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 origin-left"
        />
      )}
    </motion.div>
  );
};

export default AudioLibrary;
