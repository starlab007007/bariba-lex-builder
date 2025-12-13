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

    const startTime = Date.now();
    console.log('[useBaribaSTT] Starting transcription...', {
      audioLength: audioBase64.length,
      robustMode: options?.robustMode ?? true,
      speakerType: options?.speakerType ?? 'Auto'
    });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('bariba-stt', {
        body: {
          audio: audioBase64,
          robustMode: options?.robustMode ?? true,
          speakerType: options?.speakerType ?? 'Auto'
        }
      });

      const elapsed = Date.now() - startTime;
      console.log('[useBaribaSTT] Response received in', elapsed, 'ms:', { 
        hasData: !!data, 
        hasError: !!fnError,
        dataKeys: data ? Object.keys(data) : [],
        fnError 
      });

      if (fnError) {
        console.error('[useBaribaSTT] Function invocation error:', fnError.message, fnError);
        throw new Error(`Edge Function error: ${fnError.message}`);
      }

      if (data?.error) {
        const errorDetails = data.details || data.suggestion || data.error;
        console.error('[useBaribaSTT] API returned error:', data.error, errorDetails);
        throw new Error(errorDetails || data.error);
      }
      
      if (!data?.transcription) {
        console.warn('[useBaribaSTT] No transcription in response:', data);
        throw new Error('Aucune transcription reçue du service');
      }

      const result: BaribaSTTResult = {
        transcription: data.transcription,
        confidence: data.confidence || 90,
        duration: data.duration || elapsed,
        speakerType: options?.speakerType || 'Auto'
      };
      
      console.log('[useBaribaSTT] Success:', result.transcription.substring(0, 50));

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
