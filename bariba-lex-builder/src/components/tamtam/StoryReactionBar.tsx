import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoryReactions, StoryReactionType } from '@/hooks/useStoryReactions';

interface StoryReactionBarProps {
  storyId: string;
}

interface ReactionButton {
  type: StoryReactionType;
  emoji: string;
  label: string;
}

const reactions: ReactionButton[] = [
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'applause', emoji: '👏', label: 'Applause' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'pray', emoji: '🙏', label: 'Pray' }
];

export const StoryReactionBar: React.FC<StoryReactionBarProps> = ({ storyId }) => {
  const { reactionCounts, userReaction, addReaction, loading } = useStoryReactions(storyId);
  
  return (
    <div className="flex justify-center gap-3 p-4">
      {reactions.map((reaction) => {
        const count = reactionCounts[reaction.type];
        const isSelected = userReaction === reaction.type;
        
        return (
          <motion.button
            key={reaction.type}
            whileTap={{ scale: 0.85 }}
            onClick={() => !loading && addReaction(reaction.type)}
            disabled={loading}
            className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
              isSelected 
                ? 'bg-white/30 ring-2 ring-white/50' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {/* Emoji with animation */}
            <motion.span
              animate={isSelected ? { 
                scale: [1, 1.4, 1],
                rotate: [0, -10, 10, 0]
              } : {}}
              transition={{ duration: 0.4 }}
              className="text-3xl"
            >
              {reaction.emoji}
            </motion.span>
            
            {/* Counter */}
            <AnimatePresence mode="wait">
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-xs font-bold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
            
            {/* Particle burst on tap */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 rounded-full bg-white/20"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
