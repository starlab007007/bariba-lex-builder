import React from 'react';
import { motion } from 'framer-motion';
import { Radio, Clapperboard, Mic2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

export type FeedMode = 'creation' | 'radio' | 'mavoix';

interface FeedModeSelectorProps {
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

const FEED_MODES: { id: FeedMode; icon: typeof Radio; labelFr: string; labelBa: string; color: string }[] = [
  { id: 'creation', icon: Clapperboard, labelFr: 'Création', labelBa: 'Koru', color: 'from-violet-500 to-fuchsia-500' },
  { id: 'radio', icon: Radio, labelFr: 'Patrimoine', labelBa: 'Sɛmɛ gbãanu', color: 'from-orange-500 to-red-500' },
  { id: 'mavoix', icon: Mic2, labelFr: 'Ma voix', labelBa: 'Nɛn nɔɔ', color: 'from-emerald-500 to-teal-500' },
];

export const FeedModeSelector: React.FC<FeedModeSelectorProps> = ({
  currentMode,
  onModeChange
}) => {
  const { currentLang } = useTamTamLanguage();

  return (
    <div className="flex gap-2 p-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {FEED_MODES.map(({ id, icon: Icon, labelFr, labelBa, color }) => {
        const isActive = currentMode === id;
        const label = currentLang === 'ba' ? labelBa : labelFr;
        
        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onModeChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? `bg-gradient-to-r ${color} text-white shadow-lg`
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
