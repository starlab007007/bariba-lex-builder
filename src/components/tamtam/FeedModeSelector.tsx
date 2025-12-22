import React from 'react';
import { motion } from 'framer-motion';
import { Radio, Sparkles, MapPin, GraduationCap } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

export type FeedMode = 'radio' | 'discovery' | 'village' | 'learning';

interface FeedModeSelectorProps {
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

const FEED_MODES: { id: FeedMode; icon: typeof Radio; labelFr: string; labelBa: string; color: string }[] = [
  { id: 'radio', icon: Radio, labelFr: 'Radio', labelBa: 'Rédíò', color: 'from-orange-500 to-red-500' },
  { id: 'discovery', icon: Sparkles, labelFr: 'Découvrir', labelBa: 'Ṣàwárí', color: 'from-purple-500 to-pink-500' },
  { id: 'village', icon: MapPin, labelFr: 'Village', labelBa: 'Ìlú', color: 'from-green-500 to-emerald-500' },
  { id: 'learning', icon: GraduationCap, labelFr: 'Apprendre', labelBa: 'Kọ́', color: 'from-blue-500 to-cyan-500' },
];

export const FeedModeSelector: React.FC<FeedModeSelectorProps> = ({
  currentMode,
  onModeChange
}) => {
  const { currentLang } = useTamTamLanguage();

  return (
    <div className="flex gap-2 p-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm">
      {FEED_MODES.map(({ id, icon: Icon, labelFr, labelBa, color }) => {
        const isActive = currentMode === id;
        const label = currentLang === 'ba' ? labelBa : labelFr;
        
        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onModeChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
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
