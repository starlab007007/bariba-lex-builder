import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FrenchSTTResult {
  transcription: string;
  confidence: number;
  isFinal: boolean;
}

export interface UseFrenchSTTReturn {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export const useFrenchSTT = (): UseFrenchSTTReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for Web Speech API support
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
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('[useFrenchSTT] Recognition error:', event.error);
        
        // Handle different error types
        switch (event.error) {
          case 'no-speech':
            // Normal - no speech detected, don't show error
            console.log('[useFrenchSTT] No speech detected');
            break;
          case 'aborted':
            // User aborted, don't show error
            console.log('[useFrenchSTT] Recognition aborted');
            break;
          case 'audio-capture':
            setError('Microphone non accessible');
            toast({
              title: "Erreur microphone",
              description: "Impossible d'accéder au microphone",
              variant: "destructive"
            });
            break;
          case 'network':
            setError('Erreur réseau');
            console.warn('[useFrenchSTT] Network error - continuing without live transcription');
            break;
          case 'not-allowed':
            setError('Permission refusée');
            toast({
              title: "Permission microphone",
              description: "Autorisez l'accès au microphone pour la transcription",
              variant: "destructive"
            });
            break;
          default:
            setError(event.error);
        }
        setIsListening(false);
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur');
      console.warn('[FrenchSTT] Web Speech API not supported');
      return;
    }

    // Reset state
    setTranscript('');
    setInterimTranscript('');
    setError(null);

    try {
      // Stop any existing recognition first
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // Ignore errors from stopping non-running recognition
      }
      
      // Start fresh
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
          console.log('[FrenchSTT] Started listening');
        } catch (err: any) {
          if (err.name === 'InvalidStateError') {
            console.warn('[FrenchSTT] Already listening');
          } else {
            console.error('[FrenchSTT] Start error:', err);
            setError(err.message);
          }
        }
      }, 100);
    } catch (err: any) {
      console.error('[FrenchSTT] Error starting recognition:', err);
      setError(err.message);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported
  };
};
