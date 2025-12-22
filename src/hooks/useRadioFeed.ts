import { useState, useRef, useCallback, useEffect } from 'react';
import { EnhancedPost } from '@/components/tamtam/TamTamEnhancedFeedCard';

interface UseRadioFeedOptions {
  autoAdvance?: boolean;
  onPostComplete?: (post: EnhancedPost) => void;
}

interface UseRadioFeedReturn {
  currentPost: EnhancedPost | null;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  queue: EnhancedPost[];
  
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (time: number) => void;
  setQueue: (posts: EnhancedPost[]) => void;
  playPost: (post: EnhancedPost) => void;
}

export const useRadioFeed = (options: UseRadioFeedOptions = {}): UseRadioFeedReturn => {
  const { autoAdvance = true, onPostComplete } = options;
  
  const [queue, setQueue] = useState<EnhancedPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateRef = useRef<number>();

  const currentPost = queue[currentIndex] || null;

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (currentPost) {
        onPostComplete?.(currentPost);
      }
      if (autoAdvance && currentIndex < queue.length - 1) {
        next();
      }
    };

    const handleError = (e: Event) => {
      console.error('[useRadioFeed] Audio error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentIndex, currentPost, queue.length, autoAdvance, onPostComplete]);

  // Load new audio when post changes
  useEffect(() => {
    if (!audioRef.current || !currentPost?.audio_url) return;

    const audio = audioRef.current;
    audio.src = currentPost.audio_url;
    audio.load();
    setCurrentTime(0);

    if (isPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentPost?.id, currentPost?.audio_url]);

  const play = useCallback(() => {
    if (!audioRef.current || !currentPost?.audio_url) return;
    
    audioRef.current.play().catch(console.error);
    setIsPlaying(true);
  }, [currentPost]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [currentIndex, queue.length]);

  const previous = useCallback(() => {
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  }, [currentIndex, currentTime]);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const playPost = useCallback((post: EnhancedPost) => {
    const index = queue.findIndex(p => p.id === post.id);
    if (index >= 0) {
      setCurrentIndex(index);
      setIsPlaying(true);
    } else {
      // Add to queue and play
      setQueue(prev => [...prev, post]);
      setCurrentIndex(queue.length);
      setIsPlaying(true);
    }
  }, [queue]);

  return {
    currentPost,
    currentIndex,
    isPlaying,
    currentTime,
    queue,
    
    play,
    pause,
    next,
    previous,
    seekTo,
    setQueue,
    playPost
  };
};
