import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FrenchSTTResult {
  transcription: string;
  confidence: number;
  isFinal: boolean;
}

export interface UseFrenchSTTReturn {
  startListening: () => void;
  stopListening: () => void;
  transcribeAudioBlob: (blob: Blob) => Promise<string | null>;
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

/**
 * useFrenchSTT - French Speech-to-Text
 * 
 * - Real-time listening: uses Web Speech API (free, browser-based)
 * - Audio blob transcription: uses Mistral Voxtral Mini via transcribe-audio edge function
 * - Auto-restart on silence timeout for continuous listening
 */
export const useFrenchSTT = (): UseFrenchSTTReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        console.log('[useFrenchSTT] Recognition started');
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        console.log('[useFrenchSTT] Recognition ended');
        // Auto-restart if still supposed to be listening (silence timeout)
        if (isListeningRef.current) {
          console.log('[useFrenchSTT] Auto-restarting after silence...');
          try {
            setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                recognitionRef.current.start();
              }
            }, 100);
          } catch (e) {
            console.error('[useFrenchSTT] Auto-restart failed:', e);
            setIsListening(false);
            isListeningRef.current = false;
          }
          return;
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('[useFrenchSTT] Recognition error:', event.error);
        switch (event.error) {
          case 'no-speech':
            // Normal silence timeout - onend will auto-restart
            console.log('[useFrenchSTT] No speech detected, will auto-restart');
            break;
          case 'aborted':
            break;
          case 'audio-capture':
            setError('Microphone non accessible');
            isListeningRef.current = false;
            toast({ title: "Erreur microphone", description: "Impossible d'accéder au microphone", variant: "destructive" });
            break;
          case 'not-allowed':
            setError('Permission refusée');
            isListeningRef.current = false;
            toast({ title: "Permission microphone", description: "Autorisez l'accès au microphone", variant: "destructive" });
            break;
          case 'network':
            setError('Erreur réseau');
            isListeningRef.current = false;
            break;
          default:
            setError(event.error);
            isListeningRef.current = false;
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (final) {
          setTranscript(prev => prev + final);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interim);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
    };
  }, [toast]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("La reconnaissance vocale n'est pas supportée par ce navigateur");
      return;
    }
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    isListeningRef.current = true;

    try {
      try { recognitionRef.current?.stop(); } catch (e) { /* ignore */ }
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (err: any) {
          if (err.name !== 'InvalidStateError') {
            console.error('[FrenchSTT] Start error:', err);
            setError(err.message);
            isListeningRef.current = false;
          }
        }
      }, 100);
    } catch (err: any) {
      console.error('[FrenchSTT] Error starting recognition:', err);
      setError(err.message);
      isListeningRef.current = false;
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  /**
   * Transcribe an audio Blob using Mistral Voxtral Mini via the transcribe-audio edge function
   */
  const transcribeAudioBlob = useCallback(async (blob: Blob): Promise<string | null> => {
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      const file = new File([blob], 'audio.webm', { type: blob.type || 'audio/webm' });
      formData.append('file', file);

      console.log('[useFrenchSTT] Sending audio to Mistral Voxtral Mini...', blob.size, 'bytes');

      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (fnError) throw fnError;

      if (data?.success && data?.text) {
        console.log(`[useFrenchSTT] Mistral transcription success (${data.method}): ${data.text.substring(0, 60)}`);
        return data.text;
      }

      if (data?.error) {
        console.warn('[useFrenchSTT] Transcription failed:', data.error);
        throw new Error(data.error);
      }

      return null;
    } catch (err: any) {
      console.error('[useFrenchSTT] Transcription error:', err);
      setError(err.message || 'Erreur de transcription');
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  return {
    startListening,
    stopListening,
    transcribeAudioBlob,
    isListening,
    isTranscribing,
    transcript,
    interimTranscript,
    error,
    isSupported: true, // We have Mistral fallback for blob transcription
  };
};