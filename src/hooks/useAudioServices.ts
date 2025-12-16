import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { byT5TranslationService } from '@/services/ByT5TranslationService';
import { useToast } from '@/hooks/use-toast';

const AUDIO_SERVICES_HEALTH_TTL_MS = 60_000;

const audioServicesHealthCache: {
  health: AudioServiceHealth | null;
  checkedAt: number;
  inFlight: Promise<AudioServiceHealth> | null;
} = {
  health: null,
  checkedAt: 0,
  inFlight: null,
};

async function getAudioServicesHealth(): Promise<AudioServiceHealth> {
  const now = Date.now();

  if (audioServicesHealthCache.health && now - audioServicesHealthCache.checkedAt < AUDIO_SERVICES_HEALTH_TTL_MS) {
    return audioServicesHealthCache.health;
  }

  if (audioServicesHealthCache.inFlight) {
    return audioServicesHealthCache.inFlight;
  }

  audioServicesHealthCache.inFlight = (async () => {
    const base: AudioServiceHealth = {
      baribaSTT: 'checking',
      baribaTTS: 'checking',
      frenchSTT: 'available',
      frenchTTS: 'available',
      byT5: 'checking',
    };

    const [sttRes, ttsRes, byt5Res] = await Promise.allSettled([
      supabase.functions.invoke('bariba-stt', { body: { audio: 'health-check' } }),
      supabase.functions.invoke('bariba-tts', { body: { text: 'test' } }),
      byT5TranslationService.checkHealth(),
    ]);

    const baribaSTT: ServiceStatus =
      sttRes.status === 'fulfilled' ? (sttRes.value.error ? 'error' : 'available') : 'unavailable';

    const baribaTTS: ServiceStatus =
      ttsRes.status === 'fulfilled' ? (ttsRes.value.error ? 'error' : 'available') : 'unavailable';

    const byT5: ServiceStatus =
      byt5Res.status === 'fulfilled' ? (byt5Res.value ? 'available' : 'unavailable') : 'unavailable';

    const result: AudioServiceHealth = {
      ...base,
      baribaSTT,
      baribaTTS,
      byT5,
    };

    audioServicesHealthCache.health = result;
    audioServicesHealthCache.checkedAt = Date.now();
    return result;
  })().finally(() => {
    audioServicesHealthCache.inFlight = null;
  });

  return audioServicesHealthCache.inFlight;
}

export type ServiceStatus = 'checking' | 'available' | 'unavailable' | 'error';

interface AudioServiceHealth {
  baribaSTT: ServiceStatus;
  baribaTTS: ServiceStatus;
  frenchSTT: ServiceStatus;
  frenchTTS: ServiceStatus;
  byT5: ServiceStatus;
}

interface UseAudioServicesReturn {
  // Health status
  health: AudioServiceHealth;
  isChecking: boolean;
  lastError: string | null;
  
  // STT functions
  transcribeBariba: (audioBase64: string) => Promise<string | null>;
  transcribeFrench: (audioBase64: string) => Promise<string | null>;
  
  // TTS functions
  speakBariba: (text: string) => Promise<void>;
  speakFrench: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  
  // Translation
  translate: (text: string, from: 'fr' | 'ba', to: 'fr' | 'ba') => Promise<string | null>;
  isTranslating: boolean;
  
  // Full pipeline
  transcribeAndTranslate: (audioBase64: string, sourceLang: 'ba' | 'fr') => Promise<{
    transcription: string | null;
    translation: string | null;
  }>;
  
  // Health check
  checkHealth: () => Promise<void>;
}

export function useAudioServices(): UseAudioServicesReturn {
  const { toast } = useToast();

  const baribaTTS = useBaribaTTS();
  const baribaSTT = useBaribaSTT();
  const frenchTTS = useFrenchTTS();
  const frenchSTT = useFrenchSTT();

  const [health, setHealth] = useState<AudioServiceHealth>(() =>
    audioServicesHealthCache.health ?? {
      baribaSTT: 'checking',
      baribaTTS: 'checking',
      frenchSTT: 'available', // Web Speech API is usually available
      frenchTTS: 'available', // Lovable AI is usually available
      byT5: 'checking',
    }
  );

  const [isChecking, setIsChecking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Check all services health (shared + de-duped across all hook instances)
  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    setLastError(null);

    try {
      const result = await getAudioServicesHealth();
      setHealth(result);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial health check (safe: shared cache prevents request stampede)
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Transcribe Bariba with fallback info
  const transcribeBariba = useCallback(async (audioBase64: string): Promise<string | null> => {
    if (health.baribaSTT === 'unavailable') {
      toast({
        title: "⚠️ STT Bariba indisponible",
        description: "Le service de transcription Bariba est temporairement indisponible.",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      const result = await baribaSTT.transcribe(audioBase64);
      if (result?.transcription) {
        return result.transcription;
      }
      return null;
    } catch (err: any) {
      console.error('[useAudioServices] Bariba STT error:', err);
      setLastError(`STT Bariba: ${err.message}`);
      toast({
        title: "❌ Erreur transcription Bariba",
        description: err.message || "Impossible de transcrire l'audio",
        variant: "destructive"
      });
      return null;
    }
  }, [health.baribaSTT, baribaSTT, toast]);

  // Transcribe French
  const transcribeFrench = useCallback(async (audioBase64: string): Promise<string | null> => {
    // French STT uses Web Speech API which requires different handling
    // For base64 audio, we need to use the Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('french-stt', {
        body: { audio: audioBase64 }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data?.transcription || null;
    } catch (err: any) {
      console.error('[useAudioServices] French STT error:', err);
      setLastError(`STT Français: ${err.message}`);
      return null;
    }
  }, []);

  // Speak Bariba
  const speakBariba = useCallback(async (text: string): Promise<void> => {
    if (health.baribaTTS === 'unavailable') {
      toast({
        title: "⚠️ TTS Bariba indisponible",
        description: "Utilisation du TTS Français comme alternative.",
      });
      await frenchTTS.speak(text);
      return;
    }
    
    try {
      await baribaTTS.speak(text);
    } catch (err: any) {
      console.error('[useAudioServices] Bariba TTS error:', err);
      // Fallback to French TTS
      await frenchTTS.speak(text);
    }
  }, [health.baribaTTS, baribaTTS, frenchTTS, toast]);

  // Speak French
  const speakFrench = useCallback(async (text: string): Promise<void> => {
    try {
      await frenchTTS.speak(text);
    } catch (err: any) {
      console.error('[useAudioServices] French TTS error:', err);
      setLastError(`TTS Français: ${err.message}`);
    }
  }, [frenchTTS]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    baribaTTS.stop();
    frenchTTS.stop();
  }, [baribaTTS, frenchTTS]);

  // Translate using ByT5
  const translate = useCallback(async (
    text: string, 
    from: 'fr' | 'ba', 
    to: 'fr' | 'ba'
  ): Promise<string | null> => {
    if (!text.trim()) return null;
    
    setIsTranslating(true);
    try {
      const sourceLang = from === 'ba' ? 'bariba' : 'french';
      const targetLang = to === 'ba' ? 'bariba' : 'french';
      
      const result = await byT5TranslationService.translate(text, sourceLang, targetLang);
      return result.translation;
    } catch (err: any) {
      console.error('[useAudioServices] Translation error:', err);
      setLastError(`Traduction: ${err.message}`);
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Full pipeline: transcribe and translate
  const transcribeAndTranslate = useCallback(async (
    audioBase64: string,
    sourceLang: 'ba' | 'fr'
  ): Promise<{ transcription: string | null; translation: string | null }> => {
    // Step 1: Transcribe
    const transcription = sourceLang === 'ba' 
      ? await transcribeBariba(audioBase64)
      : await transcribeFrench(audioBase64);
    
    if (!transcription) {
      return { transcription: null, translation: null };
    }
    
    // Step 2: Translate
    const targetLang = sourceLang === 'ba' ? 'fr' : 'ba';
    const translation = await translate(transcription, sourceLang, targetLang);
    
    return { transcription, translation };
  }, [transcribeBariba, transcribeFrench, translate]);

  return {
    health,
    isChecking,
    lastError,
    transcribeBariba,
    transcribeFrench,
    speakBariba,
    speakFrench,
    stopSpeaking,
    isSpeaking: baribaTTS.isSpeaking || frenchTTS.isSpeaking,
    translate,
    isTranslating,
    transcribeAndTranslate,
    checkHealth,
  };
}
