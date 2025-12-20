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
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
        
        if (event.error !== 'no-speech') {
          toast({
            title: "Erreur de reconnaissance vocale",
            description: event.error,
            variant: "destructive"
          });
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
