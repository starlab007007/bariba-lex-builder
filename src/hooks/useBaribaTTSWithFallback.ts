import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFrenchTTS } from './useFrenchTTS';

export interface BaribaTTSOptions {
  speakingRate?: number;
  noiseScale?: number;
  noiseScaleW?: number;
}

export interface UseBaribaTTSWithFallbackReturn {
  speak: (text: string, options?: BaribaTTSOptions) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  usedFallback: boolean;
  serviceAvailable: boolean;
}

export const useBaribaTTSWithFallback = (): UseBaribaTTSWithFallbackReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const frenchTTS = useFrenchTTS();

  const speak = useCallback(async (text: string, options?: BaribaTTSOptions) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setUsedFallback(false);

    try {
      // Try Bariba TTS first
      const { data, error: fnError } = await supabase.functions.invoke('bariba-tts', {
        body: {
          text,
          speakingRate: options?.speakingRate ?? 1.0,
          noiseScale: options?.noiseScale ?? 0.667,
          noiseScaleW: options?.noiseScaleW ?? 0.8
        }
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || 'Service indisponible');
      }

      if (data?.audio) {
        setServiceAvailable(true);
        
        // Stop any existing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Handle base64 audio
        let audioSrc = data.audio;
        if (!audioSrc.startsWith('data:')) {
          audioSrc = `data:audio/wav;base64,${audioSrc}`;
        }

        const audio = new Audio(audioSrc);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setError('Erreur de lecture audio');
          audioRef.current = null;
        };

        await audio.play();
        
        toast({
          title: "🔊 Lecture Bariba",
          description: `Audio généré en ${data.duration}ms`
        });

        return;
      }

      throw new Error('Pas de données audio reçues');

    } catch (err: any) {
      console.warn('Bariba TTS failed, trying fallback:', err.message);
      setServiceAvailable(false);
      
      // Fallback: Use French TTS with a message
      try {
        setUsedFallback(true);
        
        toast({
          title: "⚠️ TTS Bariba indisponible",
          description: "Utilisation du TTS français comme alternative",
          variant: "destructive"
        });

        // Read the text using French TTS as fallback
        frenchTTS.speak(text, { rate: options?.speakingRate ?? 0.9 });
        setIsSpeaking(true);
        
        // Monitor French TTS speaking state
        const checkSpeaking = setInterval(() => {
          if (!frenchTTS.isSpeaking) {
            setIsSpeaking(false);
            clearInterval(checkSpeaking);
          }
        }, 100);

      } catch (fallbackErr: any) {
        setError('Les deux services TTS sont indisponibles');
        toast({
          title: "Erreur TTS",
          description: "Impossible de lire le texte",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, frenchTTS]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    frenchTTS.stop();
    setIsSpeaking(false);
  }, [frenchTTS]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    error,
    usedFallback,
    serviceAvailable
  };
};
