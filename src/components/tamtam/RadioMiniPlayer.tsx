import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Radio, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface RadioMiniPlayerProps {
  isVisible: boolean;
  isPlaying: boolean;
  currentPost: {
    id: string;
    transcript?: string;
    profile?: {
      username: string;
      avatar_url?: string;
    };
    duration_seconds?: number;
  } | null;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

export const RadioMiniPlayer: React.FC<RadioMiniPlayerProps> = ({
  isVisible,
  isPlaying,
  currentPost,
  currentTime,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onClose
}) => {
  if (!currentPost) return null;

  const duration = currentPost.duration_seconds || 30;
  const progress = (currentTime / duration) * 100;
  const displayText = currentPost.transcript?.substring(0, 50) || 'Audio en cours...';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-40"
        >
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-2xl p-3 text-white">
            {/* Progress bar at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-t-2xl overflow-hidden">
              <motion.div 
                className="h-full bg-white"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              {/* Radio indicator */}
              <motion.div 
                animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="flex-shrink-0"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
              </motion.div>

              {/* Avatar & Text */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Avatar className="w-8 h-8 border-2 border-white/30">
                  <AvatarImage src={currentPost.profile?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    {currentPost.profile?.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentPost.profile?.username || 'Anonyme'}
                  </p>
                  <p className="text-xs text-white/70 truncate">
                    {displayText}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onPrevious}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <SkipBack className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={isPlaying ? onPause : onPlay}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-500"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onNext}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <SkipForward className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-1"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
