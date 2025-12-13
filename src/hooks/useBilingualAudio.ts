import { useState, useCallback } from 'react';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
import { useTamTamLanguage, TamTamLang } from '@/contexts/TamTamLanguageContext';

interface TranscriptionResult {
  fr: string;
  ba: string;
}

export const useBilingualAudio = () => {
  const { currentLang, translateText } = useTamTamLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // TTS Hooks
  const { speak: speakBaribaRaw, isLoading: isBaribaLoading } = useBaribaTTS();
  const { speak: speakFrenchRaw, isLoading: isFrenchLoading } = useFrenchTTS();

  // STT Hooks
  const { transcribe: transcribeBaribaRaw, isTranscribing: isBaribaTranscribing } = useBaribaSTT();
  const { startListening: startFrenchListening, stopListening: stopFrenchListening, transcript: frenchTranscript, isListening: isFrenchListening } = useFrenchSTT();

  // Translation Hook
  const { translateFrenchToBariba, translateBaribaToFrench } = useHybridTranslation();

  // Speak in Bariba
  const speakBariba = useCallback(async (text: string): Promise<void> => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      await speakBaribaRaw(text);
    } catch (error) {
      console.error('Error speaking Bariba:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [speakBaribaRaw]);

  // Speak in French
  const speakFrench = useCallback(async (text: string): Promise<void> => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      await speakFrenchRaw(text);
    } catch (error) {
      console.error('Error speaking French:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [speakFrenchRaw]);

  // Speak in current language
  const speakCurrentLang = useCallback(async (text: string): Promise<void> => {
    if (currentLang === 'ba') {
      await speakBariba(text);
    } else {
      await speakFrench(text);
    }
  }, [currentLang, speakBariba, speakFrench]);

  // Speak in specific language
  const speak = useCallback(async (text: string, lang: TamTamLang): Promise<void> => {
    if (lang === 'ba') {
      await speakBariba(text);
    } else {
      await speakFrench(text);
    }
  }, [speakBariba, speakFrench]);

  // Transcribe audio and return both languages
  const transcribeAudio = useCallback(async (audioBlob: Blob, sourceLang: TamTamLang = 'ba'): Promise<TranscriptionResult> => {
    setIsTranscribing(true);
    try {
      let originalText = '';
      
      if (sourceLang === 'ba') {
        // Transcribe Bariba audio
        const result = await transcribeBaribaRaw(audioBlob);
        originalText = result || '';
        
        // Translate to French
        if (originalText) {
          const frResult = await translateBaribaToFrench(originalText);
          return {
            ba: originalText,
            fr: frResult.translation
          };
        }
      } else {
        // For French, we'd use the French STT
        // This is a simplified version - in practice you'd transcribe the blob
        originalText = frenchTranscript;
        
        if (originalText) {
          const baResult = await translateFrenchToBariba(originalText);
          return {
            fr: originalText,
            ba: baResult.translation
          };
        }
      }
      
      return { fr: '', ba: '' };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return { fr: '', ba: '' };
    } finally {
      setIsTranscribing(false);
    }
  }, [transcribeBaribaRaw, translateBaribaToFrench, translateFrenchToBariba, frenchTranscript]);

  // Translate to Bariba
  const translateToBariba = useCallback(async (frenchText: string): Promise<string> => {
    if (!frenchText) return '';
    setIsTranslating(true);
    try {
      const result = await translateFrenchToBariba(frenchText);
      return result.translation;
    } catch (error) {
      console.error('Error translating to Bariba:', error);
      return frenchText;
    } finally {
      setIsTranslating(false);
    }
  }, [translateFrenchToBariba]);

  // Translate to French
  const translateToFrench = useCallback(async (baribaText: string): Promise<string> => {
    if (!baribaText) return '';
    setIsTranslating(true);
    try {
      const result = await translateBaribaToFrench(baribaText);
      return result.translation;
    } catch (error) {
      console.error('Error translating to French:', error);
      return baribaText;
    } finally {
      setIsTranslating(false);
    }
  }, [translateBaribaToFrench]);

  // Translate between languages dynamically
  const translateBetween = useCallback(async (text: string, from: TamTamLang, to: TamTamLang): Promise<string> => {
    if (from === to) return text;
    return await translateText(text, from, to);
  }, [translateText]);

  return {
    // TTS functions
    speakBariba,
    speakFrench,
    speakCurrentLang,
    speak,
    
    // STT functions
    transcribeAudio,
    startFrenchListening,
    stopFrenchListening,
    
    // Translation functions
    translateToBariba,
    translateToFrench,
    translateBetween,
    
    // States
    isSpeaking: isSpeaking || isBaribaLoading || isFrenchLoading,
    isTranscribing: isTranscribing || isBaribaTranscribing || isFrenchListening,
    isTranslating,
    currentLang,
    
    // French STT transcript
    frenchTranscript
  };
};
