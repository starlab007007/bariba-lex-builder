import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface KaraokeTranscriptProps {
  transcript: string;
  audioDuration: number;
  currentTime: number;
  isPlaying: boolean;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

export const KaraokeTranscript: React.FC<KaraokeTranscriptProps> = ({
  transcript,
  audioDuration,
  currentTime,
  isPlaying
}) => {
  // Calculate word timings based on duration and word count
  const wordTimings = useMemo<WordTiming[]>(() => {
    if (!transcript || !audioDuration) return [];
    
    const words = transcript.split(/\s+/).filter(Boolean);
    const timePerWord = audioDuration / words.length;
    
    return words.map((word, idx) => ({
      word,
      startTime: idx * timePerWord,
      endTime: (idx + 1) * timePerWord
    }));
  }, [transcript, audioDuration]);
  
  // Find current active word
  const activeWordIndex = useMemo(() => {
    if (!isPlaying || currentTime === 0) return -1;
    return wordTimings.findIndex(
      wt => currentTime >= wt.startTime && currentTime < wt.endTime
    );
  }, [wordTimings, currentTime, isPlaying]);
  
  if (!transcript) return null;
  
  return (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 p-4">
      {wordTimings.map((wt, idx) => {
        const isPast = idx < activeWordIndex;
        const isActive = idx === activeWordIndex;
        const isFuture = idx > activeWordIndex;
        
        return (
          <motion.span
            key={`${idx}-${wt.word}`}
            animate={{
              scale: isActive ? 1.3 : 1,
              color: isActive 
                ? '#10B981' // emerald-500
                : isPast 
                  ? '#9CA3AF' // gray-400
                  : '#FFFFFF',
              textShadow: isActive 
                ? '0 0 20px rgba(16, 185, 129, 0.8)' 
                : 'none'
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`inline-block text-lg font-medium transition-all ${
              isFuture ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {wt.word}
          </motion.span>
        );
      })}
    </div>
  );
};
