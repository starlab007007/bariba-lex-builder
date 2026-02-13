/**
 * StoryPreviewPlayer v1.0
 * Canvas-based preview player with synchronized audio
 * Voice-first design with minimal text
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { concatenateSceneAudios } from '@/utils/concatenateSceneAudios';
import { GriotAnimationEngine, ANIMATION_STYLES, AnimationStyle } from '@/engines/GriotAnimationEngine';
import type { StoryScene } from './hooks/useAnimeStoryGenerator';

interface StoryPreviewPlayerProps {
  scenes: StoryScene[];
  audioUrl?: string;
  narrationAudioUrl?: string;
  narratorAvatarUrl?: string | null;
  style: string;
  duration: number;
  onReplay?: () => void;
  className?: string;
}

export function StoryPreviewPlayer({
  scenes,
  audioUrl,
  narrationAudioUrl,
  narratorAvatarUrl,
  style,
  duration,
  onReplay,
  className
}: StoryPreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GriotAnimationEngine | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = (currentTime / duration) * 100;

  // Initialize engine and load scenes
  useEffect(() => {
    const initEngine = async () => {
      if (!canvasRef.current || scenes.length === 0) return;
      
      setIsLoading(true);
      
      try {
        // Create engine
        engineRef.current = new GriotAnimationEngine(canvasRef.current);
        
        // Prepare scenes data
        let currentTime = 0;
        const scenesWithTiming = scenes.map((scene) => {
          const sceneData = {
            imageUrl: scene.imageUrl || '',
            videoUrl: scene.videoUrl,
            startTime: currentTime,
            endTime: currentTime + scene.durationSeconds,
            emotion: scene.emotion
          };
          currentTime += scene.durationSeconds;
          return sceneData;
        }).filter(s => s.imageUrl || s.videoUrl);
        
        // Load scenes
        await engineRef.current.loadScenes(scenesWithTiming);
        
        // Load narrator avatar
        if (narratorAvatarUrl) {
          await engineRef.current.loadNarratorAvatar(narratorAvatarUrl);
        }
        
        // Load audio — per-scene generated voices take priority over original narration
        let effectiveAudioUrl: string | undefined = undefined;
        
        // First: concatenate per-scene audios if they exist (generated voices)
        if (scenes.some(s => s.audioBase64)) {
          try {
            const concatenated = await concatenateSceneAudios(scenes);
            if (concatenated) {
              effectiveAudioUrl = concatenated.url;
              console.log('[StoryPreviewPlayer] Using concatenated per-scene audios');
            }
          } catch (e) {
            console.warn('[StoryPreviewPlayer] Scene audio concat failed:', e);
          }
        }
        
        // Fallback: use original narration or global audio if no per-scene audios
        if (!effectiveAudioUrl) {
          effectiveAudioUrl = narrationAudioUrl || audioUrl;
        }
        
        if (effectiveAudioUrl) {
          audioRef.current = new Audio(effectiveAudioUrl);
          audioRef.current.preload = 'auto';
          
          audioRef.current.ontimeupdate = () => {
            setCurrentTime(audioRef.current?.currentTime || 0);
            
            // Update current scene index
            const time = audioRef.current?.currentTime || 0;
            let accumulated = 0;
            for (let i = 0; i < scenes.length; i++) {
              accumulated += scenes[i].durationSeconds;
              if (time < accumulated) {
                setCurrentSceneIndex(i);
                break;
              }
            }
          };
          
          audioRef.current.onended = () => {
            setIsPlaying(false);
            engineRef.current?.stopPreview();
          };
        }
        
        // Preload flares
        const animStyle = ANIMATION_STYLES[style] || ANIMATION_STYLES.fantasy;
        await engineRef.current.preloadFlares(animStyle);
        
        setIsLoading(false);
        
      } catch (error) {
        console.error('[StoryPreviewPlayer] Init error:', error);
        setIsLoading(false);
      }
    };
    
    initEngine();
    
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [scenes, audioUrl, narrationAudioUrl, narratorAvatarUrl, style]);

  // Play/Pause
  const handlePlayPause = useCallback(() => {
    if (!engineRef.current) return;
    
    if (isPlaying) {
      // Pause
      engineRef.current.stopPreview();
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      // Play
      const animStyle = ANIMATION_STYLES[style] || ANIMATION_STYLES.fantasy;
      engineRef.current.startSlideshowPreview(duration, animStyle, (progress) => {
        if (!audioRef.current) {
          setCurrentTime(progress * duration);
        }
      });
      
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
      }
      setIsPlaying(true);
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [isPlaying, style, duration]);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const seekTime = percent * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
    setCurrentTime(seekTime);
  }, [duration]);

  // Scene thumbnail click
  const handleSceneClick = useCallback((sceneIndex: number) => {
    let seekTime = 0;
    for (let i = 0; i < sceneIndex; i++) {
      seekTime += scenes[i].durationSeconds;
    }
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
    setCurrentTime(seekTime);
    setCurrentSceneIndex(sceneIndex);
  }, [scenes]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Canvas Preview */}
      <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl shadow-amber-500/20">
        <canvas
          ref={canvasRef}
          width={540}
          height={960}
          className="w-full h-full object-cover"
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <motion.div
              className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
        
        {/* Play/Pause overlay */}
        {!isLoading && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors group"
          >
            <motion.div
              className={cn(
                "w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center",
                "group-hover:bg-white/30 transition-colors",
                isPlaying && "opacity-0 group-hover:opacity-100"
              )}
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </motion.div>
          </button>
        )}
        
        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress bar */}
          <div 
            className="h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer mb-3"
            onClick={handleSeek}
          >
            <motion.div 
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
              style={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
          
          {/* Time and controls */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <div className="flex items-center gap-2">
              {/* Mute button */}
              <button
                onClick={handleToggleMute}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              
              {/* Replay button */}
              {onReplay && (
                <button
                  onClick={onReplay}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scene Timeline */}
      {scenes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-amber-200/60 text-center">
            📖 {scenes.length} scènes
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 px-2">
            {scenes.map((scene, i) => (
              <button
                key={i}
                onClick={() => handleSceneClick(i)}
                className={cn(
                  "flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden border-2 transition-all",
                  currentSceneIndex === i
                    ? "border-amber-400 ring-2 ring-amber-400/50 scale-105"
                    : "border-amber-500/30 hover:border-amber-500/50"
                )}
              >
                {scene.videoUrl ? (
                  <video
                    src={scene.videoUrl}
                    poster={scene.imageUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : scene.imageUrl ? (
                  <img 
                    src={scene.imageUrl} 
                    alt={`Scène ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-amber-950/50 text-amber-200/40 text-xs font-bold">
                    {i + 1}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StoryPreviewPlayer;
