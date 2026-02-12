import { motion } from 'framer-motion';
import CircularTimer from './CircularTimer';
import type { StoryChoice } from '../types/story.types';

interface ChoiceOverlayProps {
  choices: StoryChoice[];
  onChoice: (id: string) => void;
  onTimeout: () => void;
  timerDuration: number;
}

export default function ChoiceOverlay({ choices, onChoice, onTimeout, timerDuration }: ChoiceOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-x-0 bottom-0 z-50 p-4 pb-8 flex flex-col items-center gap-6"
    >
      {/* Circular timer */}
      <CircularTimer duration={timerDuration} onComplete={onTimeout} isActive={true} />

      {/* Choice buttons */}
      <div className="flex gap-4 w-full max-w-sm justify-center">
        {choices.map((c, i) => (
          <motion.button
            key={c.id}
            onClick={(e) => { e.stopPropagation(); onChoice(c.id); }}
            className="flex-1 flex flex-col items-center justify-center rounded-2xl py-6 min-h-[100px]"
            style={{
              backgroundColor: (c.color || '#F5A623') + '20',
              border: `2px solid ${c.color || '#F5A623'}`,
            }}
            initial={{ y: 60, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              boxShadow: [
                `0 0 15px ${(c.color || '#F5A623')}30`,
                `0 0 30px ${(c.color || '#F5A623')}60`,
                `0 0 15px ${(c.color || '#F5A623')}30`,
              ],
            }}
            transition={{
              y: { delay: i * 0.15, type: 'spring', stiffness: 300, damping: 20 },
              boxShadow: { duration: 2, repeat: Infinity },
            }}
            whileTap={{ scale: 0.92 }}
          >
            <span className="text-5xl mb-1">{c.icon || '👉'}</span>
            {c.label && <span className="text-white/80 text-xs mt-1">{c.label}</span>}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
