import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KaraokeSubtitlesProps {
  text: string;
  currentTime: number; // in seconds
  duration: number; // total audio duration in seconds
  isPlaying: boolean;
  className?: string;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

export const KaraokeSubtitles: React.FC<KaraokeSubtitlesProps> = ({
  text,
  currentTime,
  duration,
  isPlaying,
  className = ''
}) => {
  // Calculate word timings based on text length and duration
  const wordTimings: WordTiming[] = useMemo(() => {
    if (!text || !duration) return [];
    
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];
    
    const timePerWord = duration / words.length;
    
    return words.map((word, index) => ({
      word,
      startTime: index * timePerWord,
      endTime: (index + 1) * timePerWord
    }));
  }, [text, duration]);

  // Find current word index
  const currentWordIndex = useMemo(() => {
    if (!isPlaying) return -1;
    
    for (let i = 0; i < wordTimings.length; i++) {
      if (currentTime >= wordTimings[i].startTime && currentTime < wordTimings[i].endTime) {
        return i;
      }
    }
    return wordTimings.length - 1;
  }, [currentTime, wordTimings, isPlaying]);

  if (!text || wordTimings.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "absolute bottom-0 left-0 right-0 px-3 sm:px-4 md:px-6",
        className
      )}
      style={{ 
        paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))' 
      }}
    >
      {/* Glass container for subtitles */}
      <div className="karaoke-container">
        <p className="text-fluid-lg text-center leading-relaxed">
          {wordTimings.map((item, index) => {
            const isPast = index < currentWordIndex;
            const isCurrent = index === currentWordIndex;
            const isFuture = index > currentWordIndex;
            
            return (
              <motion.span
                key={index}
                className={cn(
                  'karaoke-word text-readable-light',
                  isPast && 'past',
                  isCurrent && 'current',
                  isFuture && 'future'
                )}
                animate={isCurrent ? { 
                  scale: [1, 1.12, 1.08],
                  textShadow: [
                    '0 0 10px hsl(var(--primary) / 0.4)',
                    '0 0 25px hsl(var(--primary) / 0.7)',
                    '0 0 20px hsl(var(--primary) / 0.6)'
                  ]
                } : {}}
                transition={{ 
                  duration: 0.3,
                  ease: 'easeOut'
                }}
              >
                {item.word}
              </motion.span>
            );
          })}
        </p>
        
        {/* Progress indicator */}
        <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(currentTime / duration) * 100}%` 
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>
    </div>
  );
};
