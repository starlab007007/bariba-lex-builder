import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChoiceTimer } from '../hooks/useChoiceTimer';
import type { StoryChoice } from '../types/story.types';

interface ChoiceOverlayProps {
  choices: StoryChoice[];
  visible: boolean;
  onChoose: (choiceId: string) => void;
  timerDuration?: number;
}

const CHOICE_ICONS: Record<string, string> = {
  sword: '⚔️', shield: '🛡️', run: '🏃', talk: '💬',
  magic: '✨', heart: '❤️', fire: '🔥', star: '⭐',
  tree: '🌳', moon: '🌙', sun: '☀️', water: '💧',
  default: '👉',
};

export default function ChoiceOverlay({ choices, visible, onChoose, timerDuration = 5 }: ChoiceOverlayProps) {
  const defaultChoice = choices.find(c => c.is_default) ?? choices[0];

  const { progress, timeLeft } = useChoiceTimer({
    duration: timerDuration,
    enabled: visible && choices.length > 0,
    onTimeout: () => {
      if (defaultChoice) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        onChoose(defaultChoice.id);
      }
    },
  });

  return (
    <AnimatePresence>
      {visible && choices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 z-50 p-4 pb-8"
        >
          {/* Timer bar */}
          <div className="w-full h-1.5 rounded-full bg-white/20 mb-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          <div className="text-center mb-3">
            <span className="text-white/70 text-xs font-medium">
              ⏱️ {Math.ceil(timeLeft)}s — Choisis ton chemin !
            </span>
          </div>

          {/* Choice buttons */}
          <div className="flex gap-3 justify-center">
            {choices.map((choice, idx) => (
              <motion.button
                key={choice.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring', damping: 15 }}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(30);
                  onChoose(choice.id);
                }}
                className={`
                  flex-1 max-w-[180px] px-4 py-4 rounded-2xl
                  bg-white/15 backdrop-blur-xl border border-white/30
                  flex flex-col items-center gap-2
                  hover:bg-white/25 transition-colors
                  ${choice.is_default ? 'ring-2 ring-amber-400/60' : ''}
                `}
              >
                <span className="text-3xl">
                  {CHOICE_ICONS[choice.icon] ?? choice.icon ?? CHOICE_ICONS.default}
                </span>
                <span className="text-white text-sm font-semibold text-center leading-tight">
                  {choice.label}
                </span>
                {choice.is_default && (
                  <span className="text-amber-300 text-[10px]">défaut</span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
