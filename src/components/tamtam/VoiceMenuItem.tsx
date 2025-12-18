import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useVoiceMenu, VoiceMenuLabels } from '@/hooks/useVoiceMenu';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface VoiceMenuItemProps {
  labelKey: keyof VoiceMenuLabels | string;
  customLabel?: string;
  children: React.ReactNode;
  onPress?: () => void;
  autoSpeak?: boolean;
  showSpeakerButton?: boolean;
  speakerPosition?: 'left' | 'right';
  disabled?: boolean;
  className?: string;
  speakerClassName?: string;
  haptic?: boolean;
}

export const VoiceMenuItem: React.FC<VoiceMenuItemProps> = ({
  labelKey,
  customLabel,
  children,
  onPress,
  autoSpeak = false,
  showSpeakerButton = true,
  speakerPosition = 'right',
  disabled = false,
  className = '',
  speakerClassName = '',
  haptic = true,
}) => {
  const { speakLabel, isSpeaking, stopSpeaking, handleLongPress, getLabel } = useVoiceMenu({ haptic });
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const hasAutoSpoken = useRef(false);
  const longPressHandlers = handleLongPress(labelKey);

  // Auto-speak on mount if enabled
  useEffect(() => {
    if (autoSpeak && !hasAutoSpoken.current) {
      hasAutoSpoken.current = true;
      const timer = setTimeout(() => {
        speakLabel(labelKey, customLabel);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoSpeak, labelKey, customLabel, speakLabel]);

  const handleSpeakerClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLocalSpeaking || isSpeaking) {
      stopSpeaking();
      setIsLocalSpeaking(false);
      return;
    }

    setIsLocalSpeaking(true);
    triggerFeedback('notification', { haptic: true, sound: true });
    
    try {
      await speakLabel(labelKey, customLabel);
    } finally {
      setIsLocalSpeaking(false);
    }
  };

  const handleItemPress = () => {
    if (disabled) return;
    triggerFeedback('click', { haptic: true, sound: false });
    onPress?.();
  };

  const speakerButton = showSpeakerButton && (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleSpeakerClick}
      className={`p-1.5 rounded-full transition-all ${
        isLocalSpeaking || isSpeaking
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      } ${speakerClassName}`}
      aria-label={`Écouter: ${getLabel(labelKey)}`}
    >
      {isLocalSpeaking || isSpeaking ? (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          <Volume2 className="w-4 h-4" />
        </motion.div>
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </motion.button>
  );

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      {...longPressHandlers}
    >
      {speakerPosition === 'left' && speakerButton}
      
      <div
        onClick={handleItemPress}
        className={`flex-1 ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      >
        {children}
      </div>
      
      {speakerPosition === 'right' && speakerButton}
    </div>
  );
};

// Compact speaker button for inline use
interface SpeakerButtonProps {
  labelKey: keyof VoiceMenuLabels | string;
  customLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SpeakerButton: React.FC<SpeakerButtonProps> = ({
  labelKey,
  customLabel,
  size = 'md',
  className = '',
}) => {
  const { speakLabel, isSpeaking, stopSpeaking, getLabel } = useVoiceMenu();
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLocalSpeaking || isSpeaking) {
      stopSpeaking();
      setIsLocalSpeaking(false);
      return;
    }

    setIsLocalSpeaking(true);
    triggerFeedback('notification', { haptic: true, sound: true });
    
    try {
      await speakLabel(labelKey, customLabel);
    } finally {
      setIsLocalSpeaking(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className={`rounded-full transition-all ${sizeClasses[size]} ${
        isLocalSpeaking || isSpeaking
          ? 'bg-blue-500 text-white'
          : 'bg-white/80 text-gray-600 hover:bg-white'
      } ${className}`}
      aria-label={`Écouter: ${getLabel(labelKey)}`}
    >
      {isLocalSpeaking || isSpeaking ? (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          <Volume2 className={iconSizes[size]} />
        </motion.div>
      ) : (
        <Volume2 className={iconSizes[size]} />
      )}
    </motion.button>
  );
};

export default VoiceMenuItem;
