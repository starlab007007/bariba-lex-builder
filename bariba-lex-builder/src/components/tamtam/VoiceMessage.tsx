import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Languages, Pause, Loader2 } from 'lucide-react';
import { useTamTamLanguage, TamTamLang } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface VoiceMessageProps {
  audioUrl?: string;
  transcriptFr?: string;
  transcriptBa?: string;
  duration?: number;
  isOwn?: boolean;
  showTranscription?: boolean;
  autoTranslate?: boolean;
  className?: string;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUrl,
  transcriptFr = '',
  transcriptBa = '',
  duration = 0,
  isOwn = false,
  showTranscription = true,
  autoTranslate = true,
  className = ''
}) => {
  const { currentLang } = useTamTamLanguage();
  const { translateToBariba, translateToFrench, isTranslating } = useBilingualAudio();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayLang, setDisplayLang] = useState<TamTamLang>(currentLang);
  const [translatedFr, setTranslatedFr] = useState(transcriptFr);
  const [translatedBa, setTranslatedBa] = useState(transcriptBa);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-translate missing transcription
  useEffect(() => {
    if (autoTranslate) {
      if (transcriptFr && !transcriptBa) {
        translateToBariba(transcriptFr).then(setTranslatedBa);
      }
      if (transcriptBa && !transcriptFr) {
        translateToFrench(transcriptBa).then(setTranslatedFr);
      }
    }
  }, [transcriptFr, transcriptBa, autoTranslate, translateToBariba, translateToFrench]);

  const currentTranscript = displayLang === 'fr' ? (translatedFr || transcriptFr) : (translatedBa || transcriptBa);

  const handlePlayPause = useCallback(() => {
    if (!audioUrl) return;
    
    tamtamFeedback.play('click');
    
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    } else {
      audioRef.current.play();
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      }, 100);
    }
    
    setIsPlaying(!isPlaying);
  }, [audioUrl, isPlaying]);

  const toggleLanguage = useCallback(() => {
    tamtamFeedback.play('click');
    setDisplayLang(prev => prev === 'fr' ? 'ba' : 'fr');
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  return (
    <div className={`${className}`}>
      {/* Audio player */}
      <div 
        className={`rounded-3xl p-4 ${
          isOwn 
            ? 'bg-tamtam-primary text-white' 
            : 'bg-tamtam-surface shadow-tamtam-soft'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            disabled={!audioUrl}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isOwn ? 'bg-white/20' : 'bg-tamtam-primary/10'
            }`}
          >
            {isPlaying ? (
              <Pause className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-tamtam-primary'}`} />
            ) : (
              <Volume2 className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-tamtam-primary'}`} />
            )}
          </button>

          {/* Waveform visualization */}
          <div className="flex-1 flex items-center gap-0.5 h-8">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className={`w-1 rounded-full ${
                  isOwn ? 'bg-white/60' : 'bg-tamtam-primary/40'
                }`}
                style={{ 
                  height: 8 + Math.sin(i * 0.5) * 12 + Math.random() * 8,
                  opacity: progress > (i / 20) * 100 ? 1 : 0.4
                }}
                animate={isPlaying ? {
                  height: [8, 16 + Math.random() * 8, 8],
                } : {}}
                transition={{
                  duration: 0.5,
                  repeat: isPlaying ? Infinity : 0,
                  delay: i * 0.05
                }}
              />
            ))}
          </div>

          {/* Duration */}
          <span className={`text-sm ${isOwn ? 'text-white/80' : 'text-tamtam-text-muted'}`}>
            {formatDuration(duration)}
          </span>
        </div>

        {/* Progress bar */}
        {isPlaying && (
          <div className="mt-2 h-1 rounded-full bg-white/20">
            <motion.div
              className="h-full bg-white rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Transcription with language toggle */}
      {showTranscription && currentTranscript && (
        <div className="mt-2 flex items-start gap-2">
          <div className={`flex-1 p-3 rounded-2xl text-sm ${
            isOwn ? 'bg-tamtam-primary/5' : 'bg-tamtam-surface/50'
          }`}>
            {isTranslating ? (
              <div className="flex items-center gap-2 text-tamtam-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>...</span>
              </div>
            ) : (
              <p className="text-tamtam-text">{currentTranscript}</p>
            )}
          </div>

          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="w-8 h-8 rounded-full bg-tamtam-secondary/10 flex items-center justify-center transition-all hover:bg-tamtam-secondary/20 active:scale-95"
          >
            <span className="text-xs font-bold text-tamtam-secondary">
              {displayLang === 'fr' ? 'BA' : 'FR'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
