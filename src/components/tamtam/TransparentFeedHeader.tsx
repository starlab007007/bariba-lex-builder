import React from 'react';
import { motion } from 'framer-motion';
import { Search, Video, Radio, Mic, Clapperboard } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export type FeedSubMode = 'creation' | 'radio' | 'mavoix';

interface TransparentFeedHeaderProps {
  currentMode: FeedSubMode;
  onModeChange: (mode: FeedSubMode) => void;
  onSearch?: () => void;
}

const feedModes: { id: FeedSubMode; icon: typeof Video; label: string; labelBa: string; activeColor: string }[] = [
  { id: 'creation', icon: Clapperboard, label: 'Création', labelBa: 'Ṣíṣẹ̀dá', activeColor: '#8B5CF6' },
  { id: 'radio', icon: Radio, label: 'Radio', labelBa: 'Rédíò', activeColor: '#F59E0B' },
  { id: 'mavoix', icon: Mic, label: 'Ma Voix', labelBa: 'Ohùn mi', activeColor: '#10B981' },
];

export const TransparentFeedHeader: React.FC<TransparentFeedHeaderProps> = ({
  currentMode,
  onModeChange,
  onSearch
}) => {
  const { currentLang } = useTamTamLanguage();

  const handleModeChange = (mode: FeedSubMode) => {
    triggerFeedback('notification', { haptic: true, sound: false });
    onModeChange(mode);
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-0 left-0 right-0 z-30 safe-area-top"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
        paddingTop: 'env(safe-area-inset-top, 12px)',
      }}
    >
      <div className="px-4 py-3 flex items-center justify-center gap-2">
        {/* Feed Mode Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/20 backdrop-blur-md">
          {feedModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            
            return (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleModeChange(mode.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive ? 'text-white' : 'text-white/60'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeHeaderTab"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${mode.activeColor}60, ${mode.activeColor}40)`,
                      border: `1px solid ${mode.activeColor}50`,
                    }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                
                <Icon className={`relative z-10 w-4 h-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
                <span className={`relative z-10 text-sm font-semibold ${isActive ? 'text-white' : 'text-white/60'}`}>
                  {currentLang === 'ba' ? mode.labelBa : mode.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Search Button */}
        {onSearch && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onSearch}
            className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center"
          >
            <Search className="w-5 h-5 text-white/80" />
          </motion.button>
        )}
      </div>
    </motion.header>
  );
};

export default TransparentFeedHeader;
