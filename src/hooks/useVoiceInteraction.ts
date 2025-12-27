import { useState, useCallback } from 'react';
import { useBaribaSTT } from './useBaribaSTT';
import { useBaribaTTS } from './useBaribaTTS';
import { useFrenchSTT } from './useFrenchSTT';
import { useFrenchTTS } from './useFrenchTTS';
import { useAudioRecorder } from './useAudioRecorder';
import { byT5TranslationService } from '@/services/ByT5TranslationService';
import { supabase } from '@/integrations/supabase/client';

export type VoiceLang = 'ba' | 'fr';

export interface TranscriptionResult {
  original: string;
  translated: string;
  sourceLang: VoiceLang;
  audioBase64?: string;
}

export interface VoiceConversationResult {
  userTranscript: { fr: string; ba: string };
  aiResponse: { fr: string; ba: string };
}

export interface UseVoiceInteractionReturn {
  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  isRecording: boolean;
  recordingDuration: number;
  
  // Transcription
  transcribe: (audioBase64: string, lang: VoiceLang) => Promise<string | null>;
  transcribeAndTranslate: (audioBase64: string, sourceLang: VoiceLang) => Promise<TranscriptionResult | null>;
  isTranscribing: boolean;
  
  // Translation
  translate: (text: string, from: VoiceLang, to: VoiceLang) => Promise<string>;
  isTranslating: boolean;
  
  // Text-to-Speech
  speak: (text: string, lang: VoiceLang) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  
  // Complete Voice Pipeline
  recordTranscribeTranslate: (sourceLang: VoiceLang) => Promise<TranscriptionResult | null>;
  voiceConversation: (audioBase64: string, sourceLang: VoiceLang, serviceContext?: string) => Promise<VoiceConversationResult | null>;
  
  // Error state
  error: string | null;
}

export const useVoiceInteraction = (): UseVoiceInteractionReturn => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio recorder
  const audioRecorder = useAudioRecorder();
  
  // STT hooks
  const baribaSTT = useBaribaSTT();
  const frenchSTT = useFrenchSTT();
  
  // TTS hooks  
  const baribaTTS = useBaribaTTS();
  const frenchTTS = useFrenchTTS();

  // Transcribe audio
  const transcribe = useCallback(async (audioBase64: string, lang: VoiceLang): Promise<string | null> => {
    setError(null);
    try {
      if (lang === 'ba') {
        const result = await baribaSTT.transcribe(audioBase64);
        return result?.transcription || null;
      } else {
        // For French, we use the Lovable AI function or Web Speech API
        // The frenchSTT hook uses Web Speech API in real-time
        // For base64 audio, we'd need a different approach
        // For now, return null and use Web Speech API for real-time
        console.log('[useVoiceInteraction] French STT not implemented for base64 audio');
        return null;
      }
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [baribaSTT]);

  // Translate text
  const translate = useCallback(async (text: string, from: VoiceLang, to: VoiceLang): Promise<string> => {
    if (from === to || !text.trim()) return text;
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const sourceLang = from === 'fr' ? 'french' : 'bariba';
      const targetLang = to === 'fr' ? 'french' : 'bariba';
      
      const result = await byT5TranslationService.translate(text, sourceLang, targetLang);
      return result.translation || text;
    } catch (err: any) {
      console.error('[useVoiceInteraction] Translation error:', err);
      setError(err.message);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Transcribe and translate
  const transcribeAndTranslate = useCallback(async (
    audioBase64: string, 
    sourceLang: VoiceLang
  ): Promise<TranscriptionResult | null> => {
    const original = await transcribe(audioBase64, sourceLang);
    if (!original) return null;
    
    const targetLang = sourceLang === 'ba' ? 'fr' : 'ba';
    const translated = await translate(original, sourceLang, targetLang);
    
    return {
      original,
      translated,
      sourceLang,
      audioBase64
    };
  }, [transcribe, translate]);

  // Speak text
  const speak = useCallback(async (text: string, lang: VoiceLang): Promise<void> => {
    setError(null);
    try {
      if (lang === 'ba') {
        await baribaTTS.speak(text);
      } else {
        await frenchTTS.speak(text);
      }
    } catch (err: any) {
      console.error('[useVoiceInteraction] TTS error:', err);
      setError(err.message);
    }
  }, [baribaTTS, frenchTTS]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    baribaTTS.stop();
    frenchTTS.stop();
  }, [baribaTTS, frenchTTS]);

  // Complete pipeline: Record → Transcribe → Translate
  const recordTranscribeTranslate = useCallback(async (
    sourceLang: VoiceLang
  ): Promise<TranscriptionResult | null> => {
    try {
      // Wait for recording to complete (caller should have stopped recording)
      const audioBase64 = await audioRecorder.getAudioBase64();
      if (!audioBase64) {
        setError('No audio recorded');
        return null;
      }
      
      return await transcribeAndTranslate(audioBase64, sourceLang);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [audioRecorder, transcribeAndTranslate]);

  // Voice conversation with AI
  const voiceConversation = useCallback(async (
    audioBase64: string,
    sourceLang: VoiceLang,
    serviceContext?: string
  ): Promise<VoiceConversationResult | null> => {
    setError(null);
    
    try {
      // 1. Transcribe
      const transcription = await transcribe(audioBase64, sourceLang);
      if (!transcription) return null;
      
      // 2. Translate to French for AI processing (if needed)
      const frenchText = sourceLang === 'ba' 
        ? await translate(transcription, 'ba', 'fr')
        : transcription;
      
      // 3. Get AI response via raconte-moi or another service
      const { data, error: fnError } = await supabase.functions.invoke('raconte-moi', {
        body: { 
          command: frenchText, 
          language: sourceLang,
          context: serviceContext 
        }
      });
      
      if (fnError) throw fnError;
      
      // 4. Build bilingual response
      const userTranscript = {
        fr: sourceLang === 'fr' ? transcription : frenchText,
        ba: sourceLang === 'ba' ? transcription : await translate(transcription, 'fr', 'ba')
      };
      
      const aiResponse = {
        fr: data.response_fr || data.response,
        ba: data.response_ba || await translate(data.response_fr || data.response, 'fr', 'ba')
      };
      
      return { userTranscript, aiResponse };
    } catch (err: any) {
      console.error('[useVoiceInteraction] Conversation error:', err);
      setError(err.message);
      return null;
    }
  }, [transcribe, translate]);

  return {
    // Recording
    startRecording: async () => { await audioRecorder.startRecording(); },
    stopRecording: audioRecorder.stopRecording,
    cancelRecording: audioRecorder.cancelRecording,
    isRecording: audioRecorder.isRecording,
    recordingDuration: audioRecorder.duration,
    
    // Transcription
    transcribe,
    transcribeAndTranslate,
    isTranscribing: baribaSTT.isTranscribing,
    
    // Translation
    translate,
    isTranslating,
    
    // TTS
    speak,
    stopSpeaking,
    isSpeaking: baribaTTS.isSpeaking || frenchTTS.isSpeaking,
    
    // Complete pipelines
    recordTranscribeTranslate,
    voiceConversation,
    
    // Error
    error
  };
};
