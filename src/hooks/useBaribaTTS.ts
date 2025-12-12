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

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('bariba-tts', {
        body: {
          text,
          speakingRate: options?.speakingRate ?? 1.0,
          noiseScale: options?.noiseScale ?? 0.5,
          noiseScaleW: options?.noiseScaleW ?? 0.6
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.audio) {
        throw new Error('No audio data received');
      }

      // Convert base64 to audio and play
      const audioBlob = base64ToBlob(data.audio, 'audio/wav');
      const audioUrl = URL.createObjectURL(audioBlob);

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
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setError('Erreur de lecture audio');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

      toast({
        title: "🔊 Lecture Bariba",
        description: `"${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Erreur TTS Bariba';
      setError(errorMessage);
      
      // Provide helpful message for HuggingFace Space issues
      const isSpaceIssue = errorMessage.includes('unavailable') || errorMessage.includes('503');
      
      toast({
        title: isSpaceIssue ? "🔧 Service TTS Bariba temporairement indisponible" : "Erreur de synthèse vocale",
        description: isSpaceIssue 
          ? "Le service HuggingFace est en veille. Réessayez dans 30 secondes ou visitez le Space directement pour le réveiller."
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
