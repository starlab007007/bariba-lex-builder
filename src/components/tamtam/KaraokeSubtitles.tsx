import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

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
    <div className={`text-center px-4 py-3 ${className}`}>
      <p className="text-lg leading-relaxed">
        {wordTimings.map((item, index) => {
          const isPast = index < currentWordIndex;
          const isCurrent = index === currentWordIndex;
          const isFuture = index > currentWordIndex;
          
          return (
            <motion.span
              key={index}
              className={`inline-block mx-0.5 transition-all duration-150 ${
                isCurrent
                  ? 'text-primary font-bold scale-110'
                  : isPast
                    ? 'text-gray-600'
                    : 'text-gray-400'
              }`}
              animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {item.word}
            </motion.span>
          );
        })}
      </p>
    </div>
  );
};
