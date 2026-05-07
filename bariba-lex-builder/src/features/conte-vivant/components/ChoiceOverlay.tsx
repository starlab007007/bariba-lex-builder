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
      className="absolute inset-x-0 bottom-0 z-50 flex flex-col items-center"
      style={{ paddingBottom: 60, paddingLeft: 16, paddingRight: 16 }}
    >
      {/* Circular timer */}
      <div className="mb-6">
        <CircularTimer duration={timerDuration} onComplete={onTimeout} isActive={true} />
      </div>

      {/* Choice buttons */}
      <div className="flex gap-4 w-full justify-center">
        {choices.map((c, i) => {
          const color = c.color || '#F5A623';
          return (
            <motion.button
              key={c.id}
              onClick={(e) => { e.stopPropagation(); onChoice(c.id); }}
              className="flex flex-col items-center justify-center rounded-2xl py-6 min-h-[100px]"
              style={{
                flex: choices.length === 2 ? '0 0 48%' : choices.length === 3 ? '0 0 31%' : '1 1 0%',
                backgroundColor: color + '20',
                border: `2px solid ${color}`,
              }}
              initial={{ y: 60, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                boxShadow: [
                  `0 0 12px ${color}30`,
                  `0 0 28px ${color}60`,
                  `0 0 12px ${color}30`,
                ],
              }}
              transition={{
                y: { delay: i * 0.15, type: 'spring', stiffness: 300, damping: 18 },
                opacity: { delay: i * 0.15, duration: 0.3 },
                boxShadow: { duration: 2, repeat: Infinity },
              }}
              whileTap={{ scale: 0.92 }}
            >
              <span className="text-5xl mb-1">{c.icon || '👉'}</span>
              {c.label && <span className="text-white/80 text-xs mt-1">{c.label}</span>}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
