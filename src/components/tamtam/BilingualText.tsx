import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Languages, Loader2 } from 'lucide-react';
import { useTamTamLanguage, TamTamLang } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface BilingualTextProps {
  textFr: string;
  textBa: string;
  size?: 'sm' | 'md' | 'lg';
  showToggle?: boolean;
  showAudio?: boolean;
  className?: string;
}

export const BilingualText: React.FC<BilingualTextProps> = ({
  textFr,
  textBa,
  size = 'md',
  showToggle = true,
  showAudio = true,
  className = ''
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speak, isSpeaking } = useBilingualAudio();
  const [displayLang, setDisplayLang] = useState<TamTamLang>(currentLang);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentText = displayLang === 'fr' ? textFr : textBa;

  const toggleLanguage = useCallback(() => {
    tamtamFeedback.play('click');
    setDisplayLang(prev => prev === 'fr' ? 'ba' : 'fr');
  }, []);

  const handleSpeak = useCallback(async () => {
    if (isPlaying || isSpeaking) return;
    setIsPlaying(true);
    tamtamFeedback.play('click');
    
    try {
      await speak(currentText, displayLang);
    } finally {
      setIsPlaying(false);
    }
  }, [currentText, displayLang, speak, isPlaying, isSpeaking]);

  const textSizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }[size];

  const buttonSizeClass = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={displayLang}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className={`${textSizeClass} text-tamtam-text flex-1`}
        >
          {currentText}
        </motion.span>
      </AnimatePresence>

      <div className="flex items-center gap-1">
        {showAudio && (
          <button
            onClick={handleSpeak}
            disabled={isPlaying || isSpeaking}
            className={`${buttonSizeClass} rounded-full bg-tamtam-primary/10 flex items-center justify-center transition-all hover:bg-tamtam-primary/20 active:scale-95`}
          >
            {isPlaying || isSpeaking ? (
              <Loader2 className="w-4 h-4 text-tamtam-primary animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4 text-tamtam-primary" />
            )}
          </button>
        )}

        {showToggle && (
          <button
            onClick={toggleLanguage}
            className={`${buttonSizeClass} rounded-full bg-tamtam-secondary/10 flex items-center justify-center transition-all hover:bg-tamtam-secondary/20 active:scale-95`}
          >
            <span className="text-xs font-bold text-tamtam-secondary">
              {displayLang === 'fr' ? 'BA' : 'FR'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

// Version compacte avec seulement l'icône de langue
export const BilingualLabel: React.FC<{
  labelKey: string;
  showAudio?: boolean;
  className?: string;
}> = ({ labelKey, showAudio = false, className = '' }) => {
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang, isSpeaking } = useBilingualAudio();
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = useCallback(async () => {
    if (isPlaying || isSpeaking) return;
    setIsPlaying(true);
    try {
      await speakCurrentLang(t(labelKey));
    } finally {
      setIsPlaying(false);
    }
  }, [t, labelKey, speakCurrentLang, isPlaying, isSpeaking]);

  return (
    <span className={`flex items-center gap-1 ${className}`}>
      <span>{t(labelKey)}</span>
      {showAudio && (
        <button
          onClick={handleSpeak}
          disabled={isPlaying}
          className="w-5 h-5 rounded-full bg-tamtam-primary/10 flex items-center justify-center"
        >
          {isPlaying ? (
            <Loader2 className="w-3 h-3 text-tamtam-primary animate-spin" />
          ) : (
            <Volume2 className="w-3 h-3 text-tamtam-primary" />
          )}
        </button>
      )}
    </span>
  );
};
