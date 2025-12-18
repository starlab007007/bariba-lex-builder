import { useState, useCallback, useRef, useEffect } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaTTSWithFallback } from '@/hooks/useBaribaTTSWithFallback';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export interface VoiceMenuLabels {
  // Navigation tabs
  feed: { fr: string; ba: string };
  messages: { fr: string; ba: string };
  communities: { fr: string; ba: string };
  live: { fr: string; ba: string };
  search: { fr: string; ba: string };
  // Content types
  audio: { fr: string; ba: string };
  photo: { fr: string; ba: string };
  video: { fr: string; ba: string };
  poll: { fr: string; ba: string };
  // Actions
  newPost: { fr: string; ba: string };
  vocalPoll: { fr: string; ba: string };
  skipAudio: { fr: string; ba: string };
  publish: { fr: string; ba: string };
  cancel: { fr: string; ba: string };
  // Announcements
  feedAnnounce: { fr: string; ba: string };
  messagesAnnounce: { fr: string; ba: string };
  communitiesAnnounce: { fr: string; ba: string };
  liveAnnounce: { fr: string; ba: string };
}

// Labels for voice menu with bilingual support
export const voiceMenuLabels: VoiceMenuLabels = {
  // Navigation tabs
  feed: { fr: "Fil d'actualité", ba: "Sɔ́ɔ̀rù gbɛ̀" },
  messages: { fr: "Messages", ba: "Bàátɔ́kɔ̀" },
  communities: { fr: "Communautés", ba: "Gbɛ̀kú" },
  live: { fr: "En direct", ba: "Dìn" },
  search: { fr: "Rechercher un utilisateur", ba: "Wá ènìyàn" },
  // Content types
  audio: { fr: "Audio vocal", ba: "Kɔ̀rì ohùn" },
  photo: { fr: "Photo", ba: "Fɔ́tò" },
  video: { fr: "Vidéo", ba: "Vídéò" },
  poll: { fr: "Sondage vocal", ba: "Bìɔ̀ ohùn" },
  // Actions
  newPost: { fr: "Nouvelle publication", ba: "Sɔ́ɔ̀rù yɔ́yɔ́" },
  vocalPoll: { fr: "Sondage vocal", ba: "Bìɔ̀ ohùn" },
  skipAudio: { fr: "Publier sans audio", ba: "Sọ láìsí ohùn" },
  publish: { fr: "Publier", ba: "Sọ" },
  cancel: { fr: "Annuler", ba: "Gbɛ́" },
  // Announcements with context
  feedAnnounce: { fr: "Fil d'actualité ouvert", ba: "Sɔ́ɔ̀rù gbɛ̀ ti ṣí" },
  messagesAnnounce: { fr: "Messages ouverts", ba: "Bàátɔ́kɔ̀ ti ṣí" },
  communitiesAnnounce: { fr: "Communautés ouvertes", ba: "Gbɛ̀kú ti ṣí" },
  liveAnnounce: { fr: "Salles en direct", ba: "Ilé dìn" },
};

interface UseVoiceMenuOptions {
  haptic?: boolean;
  autoSpeak?: boolean;
  longPressDelay?: number;
}

interface UseVoiceMenuReturn {
  speakLabel: (labelKey: keyof VoiceMenuLabels | string, customText?: string) => Promise<void>;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  currentLang: 'fr' | 'ba';
  getLabel: (labelKey: keyof VoiceMenuLabels | string) => string;
  handleLongPress: (labelKey: keyof VoiceMenuLabels | string, onComplete?: () => void) => {
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
}

export function useVoiceMenu(options: UseVoiceMenuOptions = {}): UseVoiceMenuReturn {
  const { haptic = true, longPressDelay = 500 } = options;
  const { currentLang } = useTamTamLanguage();
  const frenchTTS = useFrenchTTS();
  const baribaTTS = useBaribaTTSWithFallback();
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const getLabel = useCallback((labelKey: keyof VoiceMenuLabels | string): string => {
    const label = voiceMenuLabels[labelKey as keyof VoiceMenuLabels];
    if (label) {
      return label[currentLang];
    }
    return labelKey;
  }, [currentLang]);

  const speakLabel = useCallback(async (
    labelKey: keyof VoiceMenuLabels | string,
    customText?: string
  ): Promise<void> => {
    // Get the text to speak
    const textToSpeak = customText || getLabel(labelKey);
    
    if (haptic) {
      triggerFeedback('notification', { haptic: true, sound: true });
    }

    setIsSpeaking(true);

    try {
      if (currentLang === 'ba') {
        await baribaTTS.speak(textToSpeak);
      } else {
        await frenchTTS.speak(textToSpeak);
      }
    } catch (error) {
      console.warn('Voice menu TTS error:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [currentLang, getLabel, haptic, frenchTTS, baribaTTS]);

  const stopSpeaking = useCallback(() => {
    frenchTTS.stop();
    baribaTTS.stop();
    setIsSpeaking(false);
  }, [frenchTTS, baribaTTS]);

  const handleLongPress = useCallback((
    labelKey: keyof VoiceMenuLabels | string,
    onComplete?: () => void
  ) => {
    const startLongPress = () => {
      isLongPressActiveRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        isLongPressActiveRef.current = true;
        speakLabel(labelKey).then(() => {
          onComplete?.();
        });
      }, longPressDelay);
    };

    const cancelLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    return {
      onTouchStart: startLongPress,
      onTouchEnd: cancelLongPress,
      onMouseDown: startLongPress,
      onMouseUp: cancelLongPress,
      onMouseLeave: cancelLongPress,
    };
  }, [longPressDelay, speakLabel]);

  return {
    speakLabel,
    isSpeaking,
    stopSpeaking,
    currentLang,
    getLabel,
    handleLongPress,
  };
}
