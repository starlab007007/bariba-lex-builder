// useAudioLibrary - React hook for TAM-TAM audio library

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AudioLibraryService } from '@/services/AudioLibraryService';
import type { AudioTrack, AudioLibrary, AudioCategory, AudioSearchOptions } from '@/types/audio';

export function useAudioLibrary() {
  const [library, setLibrary] = useState<AudioLibrary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    AudioLibraryService.initialize()
      .then((lib) => {
        if (mounted) {
          setLibrary(lib);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => { mounted = false; };
  }, []);

  // Expose all tracks (JSON + DB) and all categories merged
  const allTracks = useMemo(() => {
    if (!library) return [];
    return AudioLibraryService.getAllTracks();
  }, [library]);

  const allCategories = useMemo(() => {
    if (!library) return [];
    return AudioLibraryService.getAllCategories();
  }, [library]);

  return { library, isLoading, error, allTracks, allCategories };
}

export function useTrackPlayer() {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const play = useCallback(async (track: AudioTrack) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    setIsLoading(true);
    setCurrentTrack(track);

    try {
      const blob = await AudioLibraryService.getTrackBlob(track);
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);

      // Update progress
      progressInterval.current = setInterval(() => {
        if (audio.currentTime && audio.duration) {
          setProgress(audio.currentTime / audio.duration);
        }
      }, 100);

    } catch (error) {
      console.error('[useTrackPlayer] Play error:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  }, []);

  const seek = useCallback((position: number) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = position * audioRef.current.duration;
      setProgress(position);
    }
  }, []);

  const togglePlay = useCallback((track: AudioTrack) => {
    if (currentTrack?.id === track.id && isPlaying) {
      pause();
    } else if (currentTrack?.id === track.id && !isPlaying) {
      resume();
    } else {
      play(track);
    }
  }, [currentTrack, isPlaying, pause, resume, play]);

  return {
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    play,
    pause,
    resume,
    stop,
    seek,
    togglePlay,
  };
}

export function useTrackSearch(options: AudioSearchOptions = {}) {
  const [results, setResults] = useState<AudioTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { library, isLoading: libraryLoading } = useAudioLibrary();

  useEffect(() => {
    if (!library || libraryLoading) return;
    
    setIsSearching(true);
    
    // Small delay for debouncing
    const timeout = setTimeout(() => {
      const tracks = AudioLibraryService.searchTracks(options);
      setResults(tracks);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timeout);
  }, [library, libraryLoading, JSON.stringify(options)]);

  return { 
    results, 
    isSearching, 
    isLoading: libraryLoading 
  };
}

export default useAudioLibrary;
