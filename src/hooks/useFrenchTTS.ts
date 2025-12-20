import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FrenchTTSOptions {
  rate?: number; // 0.5 - 2.0
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
}

export interface UseFrenchTTSReturn {
  speak: (text: string, options?: FrenchTTSOptions) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
}

export const useFrenchTTS = (): UseFrenchTTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);

    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const allVoices = speechSynthesis.getVoices();
        const frenchVoices = allVoices.filter(voice => 
          voice.lang.startsWith('fr') || voice.lang.startsWith('FR')
        );
        setVoices(frenchVoices);

        // Auto-select the best French voice
        if (frenchVoices.length > 0 && !selectedVoice) {
          // Prefer natural/premium voices
          const preferredVoice = frenchVoices.find(v => 
            v.name.includes('Natural') || 
            v.name.includes('Premium') ||
            v.name.includes('Amelie') ||
            v.name.includes('Thomas')
          ) || frenchVoices[0];
          setSelectedVoice(preferredVoice);
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [selectedVoice]);

  const speak = useCallback((text: string, options?: FrenchTTSOptions) => {
    if (!isSupported || !text.trim()) {
      console.warn('[FrenchTTS] Not supported or empty text');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      console.log('[FrenchTTS] Started speaking');
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      console.log('[FrenchTTS] Finished speaking');
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('[FrenchTTS] Error:', event.error);
      setIsSpeaking(false);
      setIsPaused(false);
      
      // Only show toast for real errors, not canceled speech
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        // Safari sometimes throws errors that can be ignored
        if (event.error === 'synthesis-failed' || event.error === 'not-allowed') {
          toast({
            title: "Lecture vocale",
            description: "Impossible de lire le texte. Essayez de réactiver le son.",
            variant: "destructive"
          });
        }
      }
    };

    utteranceRef.current = utterance;
    
    // Safari workaround: use setTimeout to allow speech synthesis to initialize
    setTimeout(() => {
      try {
        speechSynthesis.speak(utterance);
        console.log('[FrenchTTS] Speech request sent');
      } catch (e) {
        console.error('[FrenchTTS] Failed to speak:', e);
        setIsSpeaking(false);
      }
    }, 50);

  }, [isSupported, selectedVoice, toast]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice
  };
};
