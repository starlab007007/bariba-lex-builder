// src/components/tamtam/creator/MusicDrawer.tsx
// Complete music library with preview, auto-adjust, and custom upload

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  Music2,
  Upload,
  Volume2,
  Check,
  Search,
  Clock,
  Scissors,
  Loader2,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { AIMusicGenerationService, MusicGenerationProgress, GeneratedMusicTrack } from "@/services/AIMusicGenerationService";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import MusicTrimmer from "./MusicTrimmer";
import { 
  MUSIC_LIBRARY, 
  MUSIC_CATEGORIES, 
  MusicTrack, 
  getMusicByCategory,
  getMusicByMood 
} from "@/data/musicLibrary";

export interface SelectedMusic {
  track: MusicTrack | null;
  customUrl?: string;
  customName?: string;
  volume: number;
  fadeIn: boolean;
  fadeOut: boolean;
  startOffset: number;
  trimmedDuration: number;
}

interface MusicDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMusic: SelectedMusic | null;
  onSelectMusic: (music: SelectedMusic | null) => void;
  videoDuration: number;
}

const MOODS = [
  { id: "all", label: "Tous", emoji: "🎵" },
  { id: "energetic", label: "Énergique", emoji: "⚡" },
  { id: "calm", label: "Calme", emoji: "🧘" },
  { id: "joyful", label: "Joyeux", emoji: "😊" },
  { id: "reflective", label: "Réflexif", emoji: "🤔" },
  { id: "motivating", label: "Motivant", emoji: "💪" },
];

const AI_STYLES = [
  { id: "traditional", label: "Traditionnel", emoji: "🥁", description: "Rythmes Bariba ancestraux" },
  { id: "modern", label: "Moderne", emoji: "🎧", description: "Fusion afro-contemporaine" },
  { id: "ambient", label: "Ambiance", emoji: "🌿", description: "Sons naturels apaisants" },
  { id: "energetic", label: "Énergique", emoji: "⚡", description: "Beats dynamiques" },
  { id: "calm", label: "Calme", emoji: "🕊️", description: "Mélodie méditative" },
];

export default function MusicDrawer({
  isOpen,
  onClose,
  selectedMusic,
  onSelectMusic,
  videoDuration,
}: MusicDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeMood, setActiveMood] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"library" | "generate">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [volume, setVolume] = useState(selectedMusic?.volume || 70);
  const [fadeIn, setFadeIn] = useState(selectedMusic?.fadeIn ?? true);
  const [fadeOut, setFadeOut] = useState(selectedMusic?.fadeOut ?? true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Trim editor state
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [trimOffset, setTrimOffset] = useState(0);
  const [trimDuration, setTrimDuration] = useState(videoDuration);
  
  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<MusicGenerationProgress | null>(null);
  const [selectedAIStyle, setSelectedAIStyle] = useState<string>("traditional");
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedMusicTrack[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbTracks, setDbTracks] = useState<MusicTrack[]>([]);

  // Load DB music tracks
  useEffect(() => {
    const loadDbTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('music_library_tracks' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data) return;

        const mapped: MusicTrack[] = (data as any[]).map((row) => ({
          id: `db_${row.id}`,
          name: row.title,
          name_ba: undefined,
          category: row.category as MusicTrack['category'],
          mood: row.mood as MusicTrack['mood'],
          duration: row.duration || 0,
          bpm: row.bpm || undefined,
          description: row.description_fr || '',
          tags: Array.isArray(row.tags) ? row.tags : [],
          url: row.audio_url,
          isGenerated: false,
        }));
        setDbTracks(mapped);
      } catch (e) {
        // Silently fail
      }
    };
    if (isOpen) loadDbTracks();
  }, [isOpen]);

  // Merge static + DB tracks, then filter
  const allTracks = [...MUSIC_LIBRARY, ...dbTracks];
  const filteredTracks = allTracks.filter((track) => {
    if (activeCategory !== "all" && track.category !== activeCategory) return false;
    if (activeMood !== "all" && track.mood !== activeMood) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        track.name.toLowerCase().includes(q) ||
        track.name_ba?.toLowerCase().includes(q) ||
        track.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Play/pause track preview
  const togglePlay = useCallback((track: MusicTrack) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      // For placeholder tracks without real audio, just toggle state
      if (!track.url) {
        setPlayingTrackId(track.id);
        setTimeout(() => setPlayingTrackId(null), 3000); // Auto-stop after 3s
        return;
      }
      
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.volume = volume / 100;
        audioRef.current.play();
        setPlayingTrackId(track.id);
      }
    }
  }, [playingTrackId, volume]);

  // Stop audio on close
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }
  }, [isOpen]);

  // Open trim editor instead of direct select
  const selectTrack = (track: MusicTrack) => {
    // Stop any playing audio
    audioRef.current?.pause();
    setPlayingTrackId(null);
    // Open trimmer
    setTrimOffset(0);
    setTrimDuration(Math.min(track.duration, videoDuration));
    setEditingTrack(track);
  };

  // Confirm trim selection with brief audio feedback
  const confirmTrim = () => {
    if (!editingTrack) return;
    const music: SelectedMusic = {
      track: editingTrack,
      volume,
      fadeIn,
      fadeOut,
      startOffset: trimOffset,
      trimmedDuration: trimDuration,
    };
    onSelectMusic(music);
    
    // Brief audio feedback: play 1s of the trimmed selection
    const url = editingTrack.url;
    if (url) {
      const feedbackAudio = new Audio(url);
      feedbackAudio.currentTime = trimOffset;
      feedbackAudio.volume = volume / 100;
      feedbackAudio.play().catch(() => {});
      setTimeout(() => { feedbackAudio.pause(); feedbackAudio.src = ''; }, 1000);
    }
    
    setEditingTrack(null);
  };

  // Handle custom upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Create object URL for local playback
      const url = URL.createObjectURL(file);
      
      const music: SelectedMusic = {
        track: null,
        customUrl: url,
        customName: file.name,
        volume,
        fadeIn,
        fadeOut,
        startOffset: 0,
        trimmedDuration: videoDuration,
      };
      onSelectMusic(music);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Adjust to video duration
  const adjustToVideo = () => {
    if (!selectedMusic) return;
    onSelectMusic({
      ...selectedMusic,
      trimmedDuration: videoDuration,
    });
  };

  // Remove selected music
  const removeMusic = () => {
    onSelectMusic(null);
  };

  // Generate AI music
  const handleGenerateMusic = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress(null);

    try {
      const track = await AIMusicGenerationService.generateMusic(
        {
          style: selectedAIStyle as any,
          mood: activeMood !== 'all' ? activeMood : undefined,
          duration: videoDuration || 90,
          culturalContext: 'bariba'
        },
        (progress) => setGenerationProgress(progress)
      );

      if (track) {
        setGeneratedTracks(prev => [track, ...prev]);
        
        // Auto-select the generated track
        if (track.audioUrl) {
          const music: SelectedMusic = {
            track: null,
            customUrl: track.audioUrl,
            customName: track.name,
            volume,
            fadeIn,
            fadeOut,
            startOffset: 0,
            trimmedDuration: Math.min(track.duration, videoDuration),
          };
          onSelectMusic(music);
        }
      }
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(null), 2000);
    }
  };

  // Format duration
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="absolute inset-x-0 bottom-0 z-50 bg-black/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 max-h-[80vh] overflow-hidden"
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} />

      {/* Trim Editor Overlay */}
      <AnimatePresence>
        {editingTrack && (
          <MusicTrimmer
            audioUrl={editingTrack.url || ''}
            trackName={editingTrack.name}
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
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5 text-orange-400" />
          <h3 className="text-white font-semibold">Bibliothèque Musicale</h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs: Library vs AI Generate */}
      <div className="flex gap-1 p-2 border-b border-white/5">
        <button
          onClick={() => setActiveTab("library")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all",
            activeTab === "library"
              ? "bg-orange-500/20 text-orange-400"
              : "text-white/60 hover:text-white/80"
          )}
        >
          <Music2 className="h-4 w-4" />
          Bibliothèque
        </button>
        <button
          onClick={() => setActiveTab("generate")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all",
            activeTab === "generate"
              ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400"
              : "text-white/60 hover:text-white/80"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Créer avec IA
        </button>
      </div>

      {/* Selected music banner */}
      {selectedMusic && (
        <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/30 flex items-center justify-center">
                <Music2 className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  {selectedMusic.track?.name || selectedMusic.customName || "Musique personnalisée"}
                </p>
                <p className="text-white/60 text-xs">
                  {formatDuration(selectedMusic.trimmedDuration)} • Vol: {selectedMusic.volume}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={adjustToVideo}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 text-xs flex items-center gap-1 hover:bg-white/20"
              >
                <Scissors className="h-3 w-3" />
                Ajuster
              </button>
              <button
                onClick={removeMusic}
                className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIBRARY TAB CONTENT */}
      {activeTab === "library" && (
        <>
          {/* Search */}
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-orange-500/50"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                activeCategory === "all"
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 text-white/60"
              )}
            >
              🎵 Tous
            </button>
            {MUSIC_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                  activeCategory === cat.id
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-white/60"
                )}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Mood filter */}
          <div className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setActiveMood(mood.id)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-all",
                  activeMood === mood.id
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/40"
                )}
              >
                {mood.emoji} {mood.label}
              </button>
            ))}
          </div>

          {/* Tracks list */}
          <div className="overflow-y-auto max-h-[40vh] px-4 pb-4">
            <div className="space-y-2">
              {filteredTracks.map((track) => (
                <motion.div
                  key={track.id}
                  layout
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all",
                    selectedMusic?.track?.id === track.id
                      ? "bg-orange-500/20 border border-orange-500/30"
                      : "bg-white/5 border border-transparent hover:bg-white/10"
                  )}
                >
                  {/* Play button */}
                  <button
                    onClick={() => togglePlay(track)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                      playingTrackId === track.id
                        ? "bg-orange-500 text-white"
                        : "bg-white/10 text-white/80"
                    )}
                  >
                    {playingTrackId === track.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{track.name}</p>
                    {track.name_ba && (
                      <p className="text-white/40 text-xs truncate">{track.name_ba}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/40 text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(track.duration)}
                      </span>
                      {track.bpm && (
                        <span className="text-white/40 text-xs">{track.bpm} BPM</span>
                      )}
                    </div>
                  </div>

                  {/* Select button */}
                  <button
                    onClick={() => selectTrack(track)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      selectedMusic?.track?.id === track.id
                        ? "bg-orange-500 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    )}
                  >
                    {selectedMusic?.track?.id === track.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-lg">+</span>
                    )}
                  </button>
                </motion.div>
              ))}

              {filteredTracks.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <Music2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Aucune musique trouvée</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* AI GENERATE TAB CONTENT */}
      {activeTab === "generate" && (
        <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-[50vh]">
          {/* AI Generation Card */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Wand2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Créer avec l'IA</h4>
                <p className="text-white/60 text-xs">Génère une musique unique pour ta vidéo</p>
              </div>
            </div>

            {/* Style selection */}
            <div className="mb-4">
              <label className="text-white/60 text-xs mb-2 block">Style musical</label>
              <div className="grid grid-cols-5 gap-2">
                {AI_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedAIStyle(style.id)}
                    className={cn(
                      "py-2 rounded-xl flex flex-col items-center gap-1 transition-all",
                      selectedAIStyle === style.id
                        ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <span className="text-xl">{style.emoji}</span>
                    <span className="text-[10px]">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress indicator */}
            {generationProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm">{generationProgress.message}</span>
                  <span className="text-purple-400 text-sm">{generationProgress.progress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerateMusic}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Générer ({formatDuration(videoDuration)})
                </>
              )}
            </button>
          </div>

          {/* Generated tracks */}
          {generatedTracks.length > 0 && (
            <div>
              <h4 className="text-white/60 text-xs mb-2">Tes créations</h4>
              <div className="space-y-2">
                {generatedTracks.map((track) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{track.name}</p>
                      <p className="text-white/40 text-xs">
                        {formatDuration(track.duration)} • IA Créé
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const music: SelectedMusic = {
                          track: null,
                          customUrl: track.audioUrl,
                          customName: track.name,
                          volume,
                          fadeIn,
                          fadeOut,
                          startOffset: 0,
                          trimmedDuration: Math.min(track.duration, videoDuration),
                        };
                        onSelectMusic(music);
                      }}
                      className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center hover:bg-purple-500/30"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for generated */}
          {generatedTracks.length === 0 && !isGenerating && (
            <div className="text-center py-6 text-white/40">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune création pour le moment</p>
              <p className="text-xs mt-1">Génère ta première piste avec l'IA</p>
            </div>
          )}
        </div>
      )}

      {/* Upload & Controls */}
      <div className="border-t border-white/10 p-4 space-y-4">
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center gap-2 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Ajouter ta propre musique
            </>
          )}
        </button>

        {/* Volume and fade controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Volume2 className="h-4 w-4 text-white/60" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setVolume(v);
                if (selectedMusic) {
                  onSelectMusic({ ...selectedMusic, volume: v });
                }
              }}
              className="flex-1 accent-orange-500"
            />
            <span className="text-white/60 text-xs w-8">{volume}%</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={fadeIn}
              onChange={(e) => {
                setFadeIn(e.target.checked);
                if (selectedMusic) {
                  onSelectMusic({ ...selectedMusic, fadeIn: e.target.checked });
                }
              }}
              className="accent-orange-500"
            />
            <span className="text-white/60 text-xs">Fade-in</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={fadeOut}
              onChange={(e) => {
                setFadeOut(e.target.checked);
                if (selectedMusic) {
                  onSelectMusic({ ...selectedMusic, fadeOut: e.target.checked });
                }
              }}
              className="accent-orange-500"
            />
            <span className="text-white/60 text-xs">Fade-out</span>
          </label>
        </div>
      </div>
    </motion.div>
  );
}
