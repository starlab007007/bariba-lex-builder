import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';

export interface FrenchSTTBase64Result {
  transcription: string;
  confidence: number;
  duration: number;
  method: 'lovable-ai' | 'web-speech-api' | 'fallback';
}

export interface UseFrenchSTTBase64Return {
  transcribe: (audioBase64: string) => Promise<FrenchSTTBase64Result | null>;
  isTranscribing: boolean;
  error: string | null;
  lastResult: FrenchSTTBase64Result | null;
  serviceAvailable: boolean;
}

export const useFrenchSTTBase64 = (): UseFrenchSTTBase64Return => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FrenchSTTBase64Result | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const { toast } = useToast();
  const webSpeechSTT = useFrenchSTT();

  const transcribe = useCallback(async (audioBase64: string): Promise<FrenchSTTBase64Result | null> => {
    if (!audioBase64 || audioBase64.length < 1000) {
      setError('Audio trop court');
      return null;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const startTime = Date.now();
      
      // Try Lovable AI via Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('french-stt', {
        body: { audio: audioBase64 }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        // Edge function returned error, check for fallback
        if (data.fallback === 'web-speech-api') {
          console.log('🎤 French STT: Fallback to Web Speech API recommended');
          setServiceAvailable(false);
          
          // Return a result indicating fallback is needed
          const fallbackResult: FrenchSTTBase64Result = {
            transcription: '',
            confidence: 0,
            duration: Date.now() - startTime,
            method: 'fallback'
          };
          return fallbackResult;
        }
        throw new Error(data.error);
      }

      const result: FrenchSTTBase64Result = {
        transcription: data.transcription || '',
        confidence: data.confidence || 90,
        duration: Date.now() - startTime,
        method: 'lovable-ai'
      };

      setLastResult(result);
      setServiceAvailable(true);

      if (result.transcription) {
        toast({
          title: "🇫🇷 Transcription française",
          description: `"${result.transcription.substring(0, 50)}${result.transcription.length > 50 ? '...' : ''}"`,
        });
      }

      console.log(`✅ French STT Base64 Success: "${result.transcription}" (${result.duration}ms)`);
      return result;

    } catch (err: any) {
      console.error('French STT Base64 error:', err);
      setError(err.message);
      setServiceAvailable(false);
      
      toast({
        title: "Erreur transcription française",
        description: "Utilisez le microphone web pour le français",
        variant: "destructive"
      });

      // Return fallback indicator
      return {
        transcription: '',
        confidence: 0,
        duration: 0,
        method: 'fallback'
      };
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
