import { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface VoiceButtonProps {
  textFr: string;
  textBa?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'full';
  className?: string;
  showLabel?: boolean;
}

export function VoiceButton({ 
  textFr, 
  textBa, 
  size = 'md', 
  variant = 'icon',
  className = '',
  showLabel = false
}: VoiceButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { speakCurrentLang } = useBilingualAudio();
  const { currentLang } = useTamTamLanguage();

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  const handleSpeak = async () => {
    if (isSpeaking) return;
    
    tamtamFeedback.play('click');
    setIsLoading(true);
    setIsSpeaking(true);
    
    try {
      const text = currentLang === 'ba' && textBa ? textBa : textFr;
      await speakCurrentLang(text);
    } catch (err) {
      console.error('[VoiceButton] Speech error:', err);
    } finally {
      setIsLoading(false);
      setIsSpeaking(false);
    }
  };

  if (variant === 'full') {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSpeak}
        disabled={isSpeaking}
        className={`flex items-center gap-2 px-4 py-2 bg-tamtam-primary/10 text-tamtam-primary rounded-xl hover:bg-tamtam-primary/20 transition-all ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSpeaking ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
        {showLabel && (
          <span className="text-sm font-medium">
            {currentLang === 'ba' ? 'Gbọ́' : 'Écouter'}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleSpeak}
      disabled={isSpeaking}
      className={`${sizeClasses[size]} rounded-full bg-tamtam-primary/10 flex items-center justify-center hover:bg-tamtam-primary/20 transition-all ${className}`}
      aria-label={currentLang === 'ba' ? 'Gbọ́' : 'Écouter'}
    >
      {isLoading ? (
        <Loader2 className="animate-spin text-tamtam-primary" style={{ width: iconSizes[size], height: iconSizes[size] }} />
      ) : isSpeaking ? (
        <VolumeX className="text-tamtam-primary" style={{ width: iconSizes[size], height: iconSizes[size] }} />
      ) : (
        <Volume2 className="text-tamtam-primary" style={{ width: iconSizes[size], height: iconSizes[size] }} />
      )}
    </motion.button>
  );
}
