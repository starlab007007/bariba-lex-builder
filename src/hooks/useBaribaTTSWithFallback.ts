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

    // Guard: skip TTS for very short text (< 2 chars) — avoids edge function 400
    if (Array.from(text.trim()).length < 2) {
      console.log('[bariba-tts] Skipping: text too short');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsedFallback(false);

    try {
      // Try Bariba TTS with auto-retry on 503 (Space waking up)
      let data: any = null;
      let lastError = '';
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: d, error: fnError } = await supabase.functions.invoke('bariba-tts', {
          body: {
            text,
            speakingRate: options?.speakingRate ?? 1.0,
            noiseScale: options?.noiseScale ?? 0.667,
            noiseScaleW: options?.noiseScaleW ?? 0.8
          }
        });

        if (fnError) {
          // Check if 503 (sleeping) - retry after delay
          const is503 = fnError.message?.includes('503') || fnError.message?.includes('veille');
          if (is503 && attempt < 2) {
            console.log(`[TTS] Space sleeping, retry ${attempt + 1}/3 in 10s...`);
            toast({
              title: "⏳ Service TTS en démarrage",
              description: `Tentative ${attempt + 2}/3 dans 10 secondes...`
            });
            await new Promise(r => setTimeout(r, 10_000));
            continue;
          }
          lastError = fnError.message || 'Service indisponible';
          break;
        }

        if (d?.error) {
          const is503 = d.error === 'Service en veille';
          if (is503 && attempt < 2) {
            console.log(`[TTS] Space sleeping, retry ${attempt + 1}/3 in 10s...`);
            toast({
              title: "⏳ Service TTS en démarrage",
              description: `Tentative ${attempt + 2}/3 dans 10 secondes...`
            });
            await new Promise(r => setTimeout(r, 10_000));
            continue;
          }
          lastError = d.error;
          break;
        }

        data = d;
        break;
      }

      if (!data) {
        throw new Error(lastError || 'Service indisponible');
      }

      if (data?.audio || data?.audio_url) {
        setServiceAvailable(true);
        
        // Stop any existing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        let audioSrc = data.audio || data.audio_url;
        
        // Handle different audio formats
        if (audioSrc.startsWith('data:')) {
          // Already a Data URL
        } else if (audioSrc.startsWith('http')) {
          // Direct URL from HF Space - use as-is
        } else {
          // Pure base64
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
          description: `Audio généré en ${data.duration || '?'}ms`
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
