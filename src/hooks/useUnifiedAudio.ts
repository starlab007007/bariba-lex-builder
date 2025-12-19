/**
 * useUnifiedAudio - Hook React pour UnifiedAudioService
 * Fournit TTS, STT et Traduction avec état réactif
 * 
 * Architecture audio gratuite:
 * - Français TTS: Web Speech API (navigateur)
 * - Français STT: Web Speech API (navigateur)
 * - Bariba TTS: HuggingFace Space (zimesongbian)
 * - Bariba STT: HuggingFace Space (zimesongbian)
 * - Traduction: ByT5 + Lovable AI fallback
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { UnifiedAudioService, AudioServicesHealth, FullTranscriptionResult, TranslationResult } from '@/services/UnifiedAudioService';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

interface UseUnifiedAudioReturn {
  // TTS
  speak: (text: string, lang?: 'fr' | 'ba') => Promise<void>;
  speakCurrentLang: (text: string) => Promise<void>;
  speakFrench: (text: string) => Promise<void>;
  speakBariba: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;

  // STT - Transcription depuis audio base64
  transcribe: (audioBase64: string, lang?: 'fr' | 'ba') => Promise<string>;
  transcribeWithTranslation: (audioBase64: string, lang?: 'fr' | 'ba') => Promise<FullTranscriptionResult>;
  isTranscribing: boolean;

  // STT - Enregistrement live avec Web Speech API (français uniquement)
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  liveTranscript: string;
  interimTranscript: string;
  
  // Translation
  translate: (text: string, from: 'fr' | 'ba', to: 'fr' | 'ba') => Promise<TranslationResult>;
  translateToOtherLang: (text: string) => Promise<string>;
  translateToFrench: (text: string) => Promise<string>;
  translateToBariba: (text: string) => Promise<string>;
  isTranslating: boolean;

  // Health
  health: AudioServicesHealth | null;
  checkHealth: () => Promise<void>;
  isCheckingHealth: boolean;

  // Current language
  currentLang: 'fr' | 'ba';
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
}

export const useUnifiedAudio = (): UseUnifiedAudioReturn => {
  const { currentLang } = useTamTamLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [health, setHealth] = useState<AudioServicesHealth | null>(UnifiedAudioService.getCachedHealth());
  const [lastError, setLastError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Initialiser Web Speech Recognition pour le français
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[useUnifiedAudio] Web Speech started');
        setIsListening(true);
        setLastError(null);
      };

      recognition.onend = () => {
        console.log('[useUnifiedAudio] Web Speech ended');
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('[useUnifiedAudio] Web Speech error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setLastError(`Erreur reconnaissance vocale: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          setLiveTranscript(prev => prev + final);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interim);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

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

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // === TTS ===
  const speak = useCallback(async (text: string, lang?: 'fr' | 'ba') => {
    if (!text) return;
    setIsSpeaking(true);
    setLastError(null);
    try {
      await UnifiedAudioService.speak(text, lang || currentLang);
    } catch (e: any) {
      setLastError(e.message || 'Erreur TTS');
    } finally {
      setIsSpeaking(false);
    }
  }, [currentLang]);

  const speakCurrentLang = useCallback(async (text: string) => {
    await speak(text, currentLang);
  }, [speak, currentLang]);

  const speakFrench = useCallback(async (text: string) => {
    await speak(text, 'fr');
  }, [speak]);

  const speakBariba = useCallback(async (text: string) => {
    await speak(text, 'ba');
  }, [speak]);

  const stop = useCallback(() => {
    UnifiedAudioService.stop();
    setIsSpeaking(false);
  }, []);

  // === STT - Transcription depuis audio base64 ===
  const transcribe = useCallback(async (audioBase64: string, lang?: 'fr' | 'ba'): Promise<string> => {
    setIsTranscribing(true);
    setLastError(null);
    try {
      const result = await UnifiedAudioService.transcribe(audioBase64, lang || currentLang);
      
      // Si erreur spéciale indiquant d'utiliser Web Speech API
      if (result.error === 'USE_WEB_SPEECH_API') {
        console.log('[useUnifiedAudio] Edge function suggests using Web Speech API');
        // Retourner une chaîne vide et laisser le composant gérer
        return '';
      }
      
      if (result.error) {
        setLastError(result.error);
      }
      return result.text;
    } catch (e: any) {
      setLastError(e.message || 'Erreur transcription');
      return '';
    } finally {
      setIsTranscribing(false);
    }
  }, [currentLang]);

  const transcribeWithTranslation = useCallback(async (audioBase64: string, lang?: 'fr' | 'ba'): Promise<FullTranscriptionResult> => {
    setIsTranscribing(true);
    setLastError(null);
    try {
      return await UnifiedAudioService.transcribeAndTranslate(audioBase64, lang || currentLang);
    } catch (e: any) {
      setLastError(e.message || 'Erreur transcription');
      return {
        transcription: '',
        transcription_fr: '',
        transcription_ba: '',
        source_lang: lang || currentLang,
        translation_method: 'error',
        confidence: 0,
        error: e.message,
      };
    } finally {
      setIsTranscribing(false);
    }
  }, [currentLang]);

  // === STT - Live listening avec Web Speech API ===
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setLastError('Web Speech API non supporté dans ce navigateur');
      return;
    }
    
    setLiveTranscript('');
    setInterimTranscript('');
    setLastError(null);
    
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      console.error('[useUnifiedAudio] Error starting listening:', e);
      setLastError('Impossible de démarrer l\'écoute');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [isListening]);

  // === Translation ===
  const translate = useCallback(async (text: string, from: 'fr' | 'ba', to: 'fr' | 'ba'): Promise<TranslationResult> => {
    setIsTranslating(true);
    setLastError(null);
    try {
      return await UnifiedAudioService.translate(text, from, to);
    } catch (e: any) {
      setLastError(e.message || 'Erreur traduction');
      return {
        translation: text,
        source: from,
        target: to,
        method: 'error',
        confidence: 0,
        error: e.message,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const translateToOtherLang = useCallback(async (text: string): Promise<string> => {
    const targetLang = currentLang === 'fr' ? 'ba' : 'fr';
    const result = await translate(text, currentLang, targetLang);
    return result.translation;
  }, [currentLang, translate]);

  const translateToFrench = useCallback(async (text: string): Promise<string> => {
    const result = await translate(text, 'ba', 'fr');
    return result.translation;
  }, [translate]);

  const translateToBariba = useCallback(async (text: string): Promise<string> => {
    const result = await translate(text, 'fr', 'ba');
    return result.translation;
  }, [translate]);

  return {
    // TTS
    speak,
    speakCurrentLang,
    speakFrench,
    speakBariba,
    stop,
    isSpeaking,

    // STT - Base64
    transcribe,
    transcribeWithTranslation,
    isTranscribing,

    // STT - Live
    startListening,
    stopListening,
    isListening,
    liveTranscript,
    interimTranscript,

    // Translation
    translate,
    translateToOtherLang,
    translateToFrench,
    translateToBariba,
    isTranslating,

    // Health
    health,
    checkHealth,
    isCheckingHealth,

    // Current language
    currentLang,
    
    // Error handling
    lastError,
    clearError,
  };
};

