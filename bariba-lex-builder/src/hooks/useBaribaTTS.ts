import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BaribaTTSOptions {
  speakingRate?: number; // 0.8 - 1.5
  noiseScale?: number; // 0.3 - 0.8
  noiseScaleW?: number; // 0.3 - 0.9
}

export interface UseBaribaTTSReturn {
  speak: (text: string, options?: BaribaTTSOptions) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useBaribaTTS = (): UseBaribaTTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const speak = useCallback(async (text: string, options?: BaribaTTSOptions) => {
    if (!text.trim()) return;

    // Guard: skip TTS for very short text (< 2 chars) — avoids edge function 400
    if (Array.from(text.trim()).length < 2) {
      console.log('[bariba-tts] Skipping: text too short');
      return;
    }

    setIsLoading(true);
    setError(null);

    const MAX_RETRIES = 2;
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('bariba-tts', {
          body: {
            text,
            speakingRate: options?.speakingRate ?? 1.0,
            noiseScale: options?.noiseScale ?? 0.5,
            noiseScaleW: options?.noiseScaleW ?? 0.6
          }
        });

        // Skipped (text too short / invalid UI) — silent no-op
        if (data?.skipped) {
          setIsLoading(false);
          return;
        }

        // Check for sleeping/503 errors - retry automatically
        if (fnError || data?.error) {
          const errMsg = fnError?.message || data?.error || '';
          const isSleeping = errMsg.includes('veille') || errMsg.includes('503') || data?.details?.includes('veille');
          
          if (isSleeping && attempt < MAX_RETRIES) {
            console.log(`[bariba-tts] Service sleeping, auto-retry ${attempt + 1}/${MAX_RETRIES} in 5s...`);
            lastError = errMsg;
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }
          throw new Error(errMsg);
        }

        if (!data.audio_url && !data.audio) {
          throw new Error('No audio data received');
        }

        // Get audio URL - support both audio_url (direct URL) and audio (base64)
        let audioUrl: string;
        if (data.audio_url) {
          audioUrl = data.audio_url;
        } else {
          const audioBlob = base64ToBlob(data.audio, 'audio/wav');
          audioUrl = URL.createObjectURL(audioBlob);
        }

        // Stop any current playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          if (!data.audio_url) URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setError('Erreur de lecture audio');
          if (!data.audio_url) URL.revokeObjectURL(audioUrl);
        };

        await audio.play();

        toast({
          title: "🔊 Lecture Bariba",
          description: `"${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
        });

        // Success - break out of retry loop
        return;
      } catch (err: any) {
        lastError = err.message || 'Erreur TTS Bariba';
        if (attempt < MAX_RETRIES) continue;
      }
    }

    // All retries failed
    if (lastError) {
      setError(lastError);
      const isSpaceIssue = lastError.includes('veille') || lastError.includes('503') || lastError.includes('unavailable');
      toast({
        title: isSpaceIssue ? "🔧 Service TTS en cours de réveil" : "Erreur de synthèse vocale",
        description: isSpaceIssue 
          ? "Le service est en train de démarrer. Réessayez dans quelques secondes."
          : lastError,
        variant: "destructive"
      });
    }
    setIsLoading(false);
  }, [toast]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    error
  };
};

// Helper function to convert base64 to Blob - handles Data URLs properly
function base64ToBlob(base64: string, mimeType: string): Blob {
  // Remove Data URL prefix if present (e.g., "data:audio/wav;base64,XXXXX")
  let base64Data = base64;
  if (base64.includes(',')) {
    base64Data = base64.split(',')[1];
  }
  // Also handle if it starts with "data:" but no comma (malformed)
  if (base64Data.startsWith('data:')) {
    base64Data = base64Data.replace(/^data:[^;]+;base64,?/, '');
  }
  
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
