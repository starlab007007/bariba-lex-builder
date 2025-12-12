import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SpeakerType = 'Auto' | 'Enfant' | 'Femme' | 'Homme' | 'PersonneAgee';

export interface BaribaSTTResult {
  transcription: string;
  confidence: number;
  duration: number;
  speakerType: SpeakerType;
  usedFallback: boolean;
}

export interface UseBaribaSTTWithFallbackReturn {
  transcribe: (audioBase64: string, options?: { robustMode?: boolean; speakerType?: SpeakerType }) => Promise<BaribaSTTResult | null>;
  isTranscribing: boolean;
  error: string | null;
  lastResult: BaribaSTTResult | null;
  serviceAvailable: boolean;
}

export const useBaribaSTTWithFallback = (): UseBaribaSTTWithFallbackReturn => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BaribaSTTResult | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const { toast } = useToast();

  const transcribe = useCallback(async (
    audioBase64: string,
    options?: { robustMode?: boolean; speakerType?: SpeakerType }
  ): Promise<BaribaSTTResult | null> => {
    setIsTranscribing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('bariba-stt', {
        body: {
          audio: audioBase64,
          robustMode: options?.robustMode ?? true,
          speakerType: options?.speakerType ?? 'Auto'
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.transcription) {
        setServiceAvailable(true);
        
        const result: BaribaSTTResult = {
          transcription: data.transcription,
          confidence: data.confidence || 90,
          duration: data.duration || 0,
          speakerType: options?.speakerType || 'Auto',
          usedFallback: false
        };

        setLastResult(result);
        
        toast({
          title: "🎤 Transcription Bariba",
          description: `Transcrit en ${result.duration}ms avec ${result.confidence}% de confiance`
        });

        return result;
      }

      throw new Error('Pas de transcription reçue');

    } catch (err: any) {
      console.warn('Bariba STT failed:', err.message);
      setServiceAvailable(false);
      
      const errorMessage = err.message || 'Erreur de transcription Bariba';
      setError(errorMessage);

      // Categorize error type for appropriate message
      const isSpaceUnavailable = errorMessage.includes('503') || 
                                  errorMessage.includes('indisponible') || 
                                  errorMessage.includes('sleeping') ||
                                  errorMessage.includes('unavailable');
      const isAudioError = errorMessage.includes('audio') || 
                           errorMessage.includes('format') ||
                           errorMessage.includes('Invalid');
      const isHuggingFaceError = errorMessage.includes('HuggingFace');

      // Show appropriate error message
      if (isSpaceUnavailable) {
        toast({
          title: "⚠️ STT Bariba indisponible",
          description: "Le service HuggingFace est en veille. Réessayez dans 30 secondes ou utilisez le français.",
          variant: "destructive"
        });
      } else if (isAudioError) {
        toast({
          title: "⚠️ Problème audio",
          description: "Format audio non supporté. Essayez d'enregistrer à nouveau.",
          variant: "destructive"
        });
      } else if (isHuggingFaceError) {
        toast({
          title: "⚠️ Erreur du modèle",
          description: "Le modèle Bariba a retourné une erreur. Réessayez dans quelques secondes.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur de transcription",
          description: errorMessage,
          variant: "destructive"
        });
      }

      // Return a fallback result with empty transcription
      const fallbackResult: BaribaSTTResult = {
        transcription: '',
        confidence: 0,
        duration: 0,
        speakerType: options?.speakerType || 'Auto',
        usedFallback: true
      };
      
      setLastResult(fallbackResult);
      return fallbackResult;

    } finally {
      setIsTranscribing(false);
    }
  }, [toast]);

  return {
    transcribe,
    isTranscribing,
    error,
    lastResult,
    serviceAvailable
  };
};
