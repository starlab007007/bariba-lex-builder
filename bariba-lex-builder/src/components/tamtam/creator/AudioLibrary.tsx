// AudioLibrary - TAM-TAM Music Selector Component
// Kuaishou-style design with categories, search, and preview
// Fully responsive and dynamic

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Play, 
  Pause, 
  Check, 
  Music2,
  Loader2,
  Volume2,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioLibrary, useTrackPlayer } from '@/hooks/useAudioLibrary';
import MusicTrimmer from './MusicTrimmer';
import type { AudioTrack, AudioCategory } from '@/types/audio';

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export interface TrimInfo {
  startOffset: number;
  trimmedDuration: number;
}

interface AudioLibraryProps {
  isOpen?: boolean;
  onSelectTrack: (track: AudioTrack, trimInfo?: TrimInfo) => void;
  onClose: () => void;
  selectedTrackId?: string;
  videoDuration?: number;
}

const AudioLibrary: React.FC<AudioLibraryProps> = ({
  isOpen = true,
  onSelectTrack,
  onClose,
  selectedTrackId,
  videoDuration = 90,
}) => {
  const { library, isLoading, error, allTracks, allCategories } = useAudioLibrary();
  const { currentTrack, isPlaying, isLoading: trackLoading, progress, togglePlay, stop } = useTrackPlayer();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Trimmer state
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null);
  const [trimOffset, setTrimOffset] = useState(0);
  const [trimDuration, setTrimDuration] = useState(videoDuration);

  // Stop playback on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Get all tracks with filtering
  const filteredTracks = useMemo(() => {
    if (!library) return [];
    
    let tracks = allTracks;
    
    // Filter by category
    if (activeCategory) {
      const cat = allCategories.find(c => c.id === activeCategory);
      if (cat) {
        const catTrackIds = new Set(cat.tracks.map(t => t.id));
        tracks = tracks.filter(t => catTrackIds.has(t.id) || (t as any)._dbCategory === activeCategory);
      } else {
        tracks = [];
      }
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
  }, [library, allTracks, allCategories, activeCategory, searchQuery]);

  // Open trimmer when selecting a track
  const handleSelect = (track: AudioTrack) => {
    stop();
    const audioUrl = track.source?.url || track.source?.path;
    if (audioUrl) {
      setTrimOffset(0);
      setTrimDuration(Math.min(track.duration, videoDuration));
      setEditingTrack(track);
    } else {
      // No audio URL, select directly
      onSelectTrack(track);
    }
  };

  // Confirm trim and pass trimInfo
  const confirmTrim = () => {
    if (!editingTrack) return;
    onSelectTrack(editingTrack, { startOffset: trimOffset, trimmedDuration: trimDuration });
    setEditingTrack(null);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="fixed inset-0 z-[9999] bg-gradient-to-b from-gray-900 to-black flex flex-col"
    >
      {/* Header with glassmorphism */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Music2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg">Bibliothèque</span>
            <p className="text-white/50 text-xs">{allTracks.length || 0} musiques</p>
          </div>
        </motion.div>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </motion.button>
      </div>

      {/* Search with animation */}
      <div className="px-4 py-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, artiste, tag..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all text-base"
          />
        </motion.div>
      </div>

      {/* Category Pills with horizontal scroll */}
      {library && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="px-4 pb-3"
        >
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(null)}
              className={cn(
                "shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg",
                !activeCategory
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/30"
                  : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
              )}
            >
              🎵 Tout
            </motion.button>
            {allCategories.map((cat, idx) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap shadow-lg",
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/30"
                    : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                )}
              >
                {cat.emoji} {cat.name.fr}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Track List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 animate-pulse" />
              <Loader2 className="h-8 w-8 text-orange-400 animate-spin absolute inset-0 m-auto" />
            </div>
            <span className="text-white/60 text-sm">Chargement de la bibliothèque...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-white/60">Erreur de chargement</p>
            <p className="text-white/40 text-sm mt-1">Vérifiez votre connexion</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-white/30" />
            </div>
            <p className="text-white/60">Aucune musique trouvée</p>
            <p className="text-white/40 text-sm mt-1">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTracks.map((track, idx) => (
                <TrackItem
                  key={track.id}
                  track={track}
                  index={idx}
                  isSelected={selectedTrackId === track.id}
                  isPlaying={currentTrack?.id === track.id && isPlaying}
                  isLoading={currentTrack?.id === track.id && trackLoading}
                  progress={currentTrack?.id === track.id ? progress : 0}
                  onPlay={() => togglePlay(track)}
                  onSelect={() => handleSelect(track)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Now Playing Bar (when track is playing) */}
      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-6 px-4 safe-area-inset-bottom"
          >
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-xl rounded-2xl p-4 border border-orange-500/30">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => togglePlay(currentTrack)}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                >
                  {trackLoading ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5 text-white" />
                  ) : (
                    <Play className="h-5 w-5 text-white ml-0.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate">{currentTrack.title}</h4>
                  <p className="text-white/50 text-sm truncate">{currentTrack.artist}</p>
                </div>
                <button
                  onClick={() => handleSelect(currentTrack)}
                  className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-sm shadow-lg"
                >
                  Utiliser
                </button>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music Trimmer Overlay */}
      <AnimatePresence>
        {editingTrack && (
          <MusicTrimmer
            audioUrl={editingTrack.source?.url || editingTrack.source?.path || ''}
            trackName={editingTrack.title}
            totalDuration={editingTrack.duration}
            clipDuration={videoDuration}
            startOffset={trimOffset}
            onTrimChange={(offset, dur) => {
              setTrimOffset(offset);
              setTrimDuration(dur);
            }}
            onConfirm={confirmTrim}
            onBack={() => setEditingTrack(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Track Item Component with enhanced visuals
interface TrackItemProps {
  track: AudioTrack;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  onPlay: () => void;
  onSelect: () => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  track,
  index,
  isSelected,
  isPlaying,
  isLoading,
  progress,
  onPlay,
  onSelect,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        "relative p-4 rounded-2xl transition-all overflow-hidden",
        isSelected
          ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500 shadow-lg shadow-orange-500/20"
          : isPlaying
          ? "bg-white/10 border border-orange-500/50"
          : "bg-white/5 border border-white/10 hover:bg-white/10"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Play button with wave animation */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onPlay}
          className={cn(
            "shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all relative overflow-hidden",
            isPlaying
              ? "bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/40"
              : "bg-white/10 hover:bg-white/20"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : isPlaying ? (
            <>
              {/* Sound wave animation */}
              <div className="flex items-end gap-0.5 h-6">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white rounded-full"
                    animate={{
                      height: ['40%', '100%', '60%', '80%', '40%'],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <Play className="h-6 w-6 text-white ml-1" />
          )}
        </motion.button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-base truncate">
            {track.title}
          </h4>
          <p className="text-white/50 text-sm truncate flex items-center gap-2">
            <span>{track.artist}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>{formatDuration(track.duration)}</span>
            {track.bpm && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>{track.bpm} BPM</span>
              </>
            )}
          </p>
          
          {/* Mood tags */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {track.mood.slice(0, 3).map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-xs border border-white/10"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Select button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSelect}
          className={cn(
            "shrink-0 px-5 py-3 rounded-xl font-semibold transition-all text-sm",
            isSelected
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {isSelected ? (
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              OK
            </span>
          ) : (
            "Choisir"
          )}
        </motion.button>
      </div>

      {/* Playing progress bar */}
      {isPlaying && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 origin-left"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
            style={{ width: `${progress * 100}%` }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default AudioLibrary;
