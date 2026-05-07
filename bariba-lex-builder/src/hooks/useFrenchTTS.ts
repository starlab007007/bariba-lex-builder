import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FrenchTTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: 'announcer' | 'narrator' | 'female' | 'alloy';
}

export interface UseFrenchTTSReturn {
  speak: (text: string, options?: FrenchTTSOptions) => Promise<void>;
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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Load browser voices as fallback info
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const allVoices = speechSynthesis.getVoices();
        const frenchVoices = allVoices.filter(v => v.lang.startsWith('fr'));
        setVoices(frenchVoices);
        if (frenchVoices.length > 0 && !selectedVoice) {
          const preferred = frenchVoices.find(v =>
            v.name.includes('Natural') || v.name.includes('Premium') ||
            v.name.includes('Amelie') || v.name.includes('Thomas')
          ) || frenchVoices[0];
          setSelectedVoice(preferred);
        }
      };
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
      return () => { speechSynthesis.onvoiceschanged = null; };
    }
  }, [selectedVoice]);

  const speak = useCallback(async (text: string, options?: FrenchTTSOptions) => {
    if (!text.trim()) return;

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    speechSynthesis.cancel();

    setIsSpeaking(true);
    setIsPaused(false);

    try {
      // Try Inworld TTS-1.5 Mini via edge function
      const { data, error: fnError } = await supabase.functions.invoke('french-tts', {
        body: {
          text,
          voice: options?.voice || 'announcer',
          speed: options?.rate ?? 1.0,
          returnAudio: true,
        }
      });

      if (fnError) throw fnError;

      if (data?.audioBase64) {
        // Play audio from Inworld/ElevenLabs
        const format = data.audioFormat || 'audio/mpeg';
        const byteChars = atob(data.audioBase64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: format });
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          URL.revokeObjectURL(url);
        };

        await audio.play();
        console.log(`[FrenchTTS] Playing Inworld audio (${data.method})`);
        return;
      }

      // Fallback: use Web Speech API with optimized text from edge function
      const optimizedText = data?.text || text;
      const utterance = new SpeechSynthesisUtterance(optimizedText);
      utterance.lang = 'fr-FR';
      utterance.rate = data?.speechSettings?.rate ?? options?.rate ?? 1.0;
      utterance.pitch = data?.speechSettings?.pitch ?? options?.pitch ?? 1.0;
      utterance.volume = data?.speechSettings?.volume ?? options?.volume ?? 1.0;

      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.error('[FrenchTTS] Web Speech error:', e.error);
        }
        setIsSpeaking(false);
        setIsPaused(false);
      };

      setTimeout(() => {
        try { speechSynthesis.speak(utterance); } catch (e) {
          console.error('[FrenchTTS] Failed:', e);
          setIsSpeaking(false);
        }
      }, 50);

    } catch (err: any) {
      console.error('[FrenchTTS] Edge function failed, falling back to Web Speech:', err);

      // Direct Web Speech API fallback
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
      utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };

      setTimeout(() => {
        try { speechSynthesis.speak(utterance); } catch (e) {
          setIsSpeaking(false);
          toast({
            title: "Erreur de lecture vocale",
            description: "Impossible de lire le texte",
            variant: "destructive"
          });
        }
      }, 50);
    }
  }, [selectedVoice, toast]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
    } else {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
    } else {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported: true, // Always supported - we have edge function + Web Speech fallback
    voices,
    selectedVoice,
    setSelectedVoice
  };
};