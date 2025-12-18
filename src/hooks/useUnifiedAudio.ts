/**
 * useUnifiedAudio - Hook React pour UnifiedAudioService
 * Fournit TTS, STT et Traduction avec état réactif
 */

import { useState, useCallback, useEffect } from 'react';
import { UnifiedAudioService, AudioServicesHealth, FullTranscriptionResult, TranslationResult } from '@/services/UnifiedAudioService';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

interface UseUnifiedAudioReturn {
  // TTS
  speak: (text: string, lang?: 'fr' | 'ba') => Promise<void>;
  speakCurrentLang: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;

  // STT
  transcribe: (audioBase64: string, lang?: 'fr' | 'ba') => Promise<string>;
  transcribeWithTranslation: (audioBase64: string, lang?: 'fr' | 'ba') => Promise<FullTranscriptionResult>;
  isTranscribing: boolean;

  // Translation
  translate: (text: string, from: 'fr' | 'ba', to: 'fr' | 'ba') => Promise<TranslationResult>;
  translateToOtherLang: (text: string) => Promise<string>;
  isTranslating: boolean;

  // Health
  health: AudioServicesHealth | null;
  checkHealth: () => Promise<void>;
  isCheckingHealth: boolean;

  // Current language
  currentLang: 'fr' | 'ba';
}

export const useUnifiedAudio = (): UseUnifiedAudioReturn => {
  const { currentLang } = useTamTamLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [health, setHealth] = useState<AudioServicesHealth | null>(UnifiedAudioService.getCachedHealth());

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const result = await UnifiedAudioService.checkHealth();
      setHealth(result);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  const speak = useCallback(async (text: string, lang?: 'fr' | 'ba') => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      await UnifiedAudioService.speak(text, lang || currentLang);
    } finally {
      setIsSpeaking(false);
    }
  }, [currentLang]);

  const speakCurrentLang = useCallback(async (text: string) => {
    await speak(text, currentLang);
  }, [speak, currentLang]);

  const stop = useCallback(() => {
    UnifiedAudioService.stop();
    setIsSpeaking(false);
  }, []);

  const transcribe = useCallback(async (audioBase64: string, lang?: 'fr' | 'ba'): Promise<string> => {
    setIsTranscribing(true);
    try {
      const result = await UnifiedAudioService.transcribe(audioBase64, lang || currentLang);
      return result.text;
    } finally {
      setIsTranscribing(false);
    }
  }, [currentLang]);

  const transcribeWithTranslation = useCallback(async (audioBase64: string, lang?: 'fr' | 'ba'): Promise<FullTranscriptionResult> => {
    setIsTranscribing(true);
    try {
      return await UnifiedAudioService.transcribeAndTranslate(audioBase64, lang || currentLang);
    } finally {
      setIsTranscribing(false);
    }
  }, [currentLang]);

  const translate = useCallback(async (text: string, from: 'fr' | 'ba', to: 'fr' | 'ba'): Promise<TranslationResult> => {
    setIsTranslating(true);
    try {
      return await UnifiedAudioService.translate(text, from, to);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const translateToOtherLang = useCallback(async (text: string): Promise<string> => {
    const targetLang = currentLang === 'fr' ? 'ba' : 'fr';
    const result = await translate(text, currentLang, targetLang);
    return result.translation;
  }, [currentLang, translate]);

  return {
    speak,
    speakCurrentLang,
    stop,
    isSpeaking,

    transcribe,
    transcribeWithTranslation,
    isTranscribing,

    translate,
    translateToOtherLang,
    isTranslating,

    health,
    checkHealth,
    isCheckingHealth,

    currentLang,
  };
};
