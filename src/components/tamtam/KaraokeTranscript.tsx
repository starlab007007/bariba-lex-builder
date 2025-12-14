import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { generateWordTimings, getWordStatus, WordStatus } from '@/services/KaraokeSync';

interface KaraokeTranscriptProps {
  transcript: string;
  durationMs: number;
  currentTimeMs: number;
  isPlaying: boolean;
  className?: string;
}

const KaraokeTranscript: React.FC<KaraokeTranscriptProps> = ({
  transcript,
  durationMs,
  currentTimeMs,
  isPlaying,
  className = ''
}) => {
  const { words } = useMemo(
    () => generateWordTimings(transcript, durationMs),
    [transcript, durationMs]
  );

  if (words.length === 0) {
    return null;
  }

  const getWordStyles = (status: WordStatus) => {
    switch (status) {
      case 'active':
        return {
          scale: 1.15,
          color: 'hsl(var(--primary))',
          textShadow: '0 0 20px hsl(var(--primary) / 0.5)',
          fontWeight: 700
        };
      case 'past':
        return {
          scale: 1,
          color: 'hsl(var(--foreground))',
          textShadow: 'none',
          fontWeight: 500
        };
      case 'future':
        return {
          scale: 1,
          color: 'hsl(var(--muted-foreground))',
          textShadow: 'none',
          fontWeight: 400
        };
    }
  };

  // Calculate progress percentage
  const progress = Math.min((currentTimeMs / durationMs) * 100, 100);

  return (
    <div className={`relative ${className}`}>
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Words container */}
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 px-4 py-3 bg-background/80 backdrop-blur-sm rounded-2xl">
        {words.map((word) => {
          const status = getWordStatus(word, currentTimeMs);
          const styles = getWordStyles(status);

          return (
            <motion.span
              key={word.index}
              animate={{
                scale: styles.scale,
                color: styles.color,
                fontWeight: styles.fontWeight
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25
              }}
              className="inline-block text-lg leading-relaxed"
              style={{
                textShadow: styles.textShadow
              }}
            >
              {word.word}
              {status === 'active' && (
                <motion.span
                  layoutId="underline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.span>
          );
        })}
      </div>

      {/* Karaoke indicator */}
      {isPlaying && (
        <motion.div
          className="absolute -top-2 -right-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-medium"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="animate-pulse">🎤</span>
          Karaoké
        </motion.div>
      )}
    </div>
  );
};

export default KaraokeTranscript;
