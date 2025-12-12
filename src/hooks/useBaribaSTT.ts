import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SpeakerType = 'Auto' | 'Enfant' | 'Femme' | 'Homme' | 'PersonneAgee';

export interface BaribaSTTResult {
  transcription: string;
  confidence: number;
  duration: number;
  speakerType: SpeakerType;
}

export interface UseBaribaSTTReturn {
  transcribe: (audioBase64: string, options?: { robustMode?: boolean; speakerType?: SpeakerType }) => Promise<BaribaSTTResult | null>;
  isTranscribing: boolean;
  error: string | null;
  lastResult: BaribaSTTResult | null;
}

export const useBaribaSTT = (): UseBaribaSTTReturn => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BaribaSTTResult | null>(null);
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

      if (data.error) {
        throw new Error(data.error);
      }

      const result: BaribaSTTResult = {
        transcription: data.transcription,
        confidence: data.confidence || 90,
        duration: data.duration || 0,
        speakerType: options?.speakerType || 'Auto'
      };

      setLastResult(result);
      
      toast({
        title: "🎤 Transcription Bariba",
        description: `Transcrit en ${result.duration}ms avec ${result.confidence}% de confiance`
      });

      return result;

    } catch (err: any) {
      const errorMessage = err.message || 'Erreur de transcription Bariba';
      setError(errorMessage);
      
      toast({
        title: "Erreur de transcription",
        description: errorMessage,
        variant: "destructive"
      });

      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [toast]);

  return {
    transcribe,
    isTranscribing,
    error,
    lastResult
  };
};
