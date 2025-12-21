/**
 * useWebSpeechSTT - Hook pour le Speech-to-Text natif du navigateur
 * Utilise Web Speech API (gratuit, fonctionne offline)
 * Support pour français uniquement
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface WebSpeechSTTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface UseWebSpeechSTTReturn {
  // Méthodes d'écoute continue
  startListening: () => void;
  stopListening: () => void;
  
  // Méthode pour transcrire un blob audio (record puis transcrit)
  transcribeFromMicrophone: () => Promise<string>;
  
  // États
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  
  // Reset
  resetTranscript: () => void;
}

export const useWebSpeechSTT = (): UseWebSpeechSTTReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((value: string) => void) | null>(null);

  useEffect(() => {
    // Vérifier le support du Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    setIsSupported(supported);

    if (supported) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true; // Mode continu pour meilleure détection
      recognition.interimResults = true;
      recognition.maxAlternatives = 3; // Plus d'alternatives pour meilleure précision

      recognition.onstart = () => {
        console.log('[useWebSpeechSTT] Recognition started - parlez maintenant...');
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        console.log('[useWebSpeechSTT] Recognition ended, transcript:', transcript);
        setIsListening(false);
        setIsProcessing(false);
        
        // Résoudre la promesse si en attente
        if (resolveRef.current) {
          resolveRef.current(transcript);
          resolveRef.current = null;
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[useWebSpeechSTT] Recognition error:', event.error);
        
        let errorMessage = '';
        switch (event.error) {
          case 'no-speech':
            // Ne pas traiter comme erreur fatale, juste un avertissement
            console.warn('[useWebSpeechSTT] No speech detected - continuez à parler ou rapprochez-vous du micro');
            errorMessage = 'Aucune parole détectée. Parlez plus fort et plus longtemps.';
            break;
          case 'aborted':
            errorMessage = 'Reconnaissance annulée';
            break;
          case 'audio-capture':
            errorMessage = 'Impossible d\'accéder au microphone. Vérifiez les permissions.';
            break;
          case 'network':
            errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
            break;
          case 'not-allowed':
            errorMessage = 'Accès au microphone refusé. Autorisez l\'accès dans les paramètres.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Service de reconnaissance vocale non autorisé.';
            break;
          default:
            errorMessage = `Erreur de reconnaissance: ${event.error}`;
        }
        
        // Pour no-speech, ne pas arrêter complètement
        if (event.error !== 'no-speech') {
          setError(errorMessage);
          setIsListening(false);
          setIsProcessing(false);
        }
        
        // Résoudre avec ce qu'on a seulement si erreur fatale
        if (resolveRef.current && event.error !== 'no-speech') {
          resolveRef.current(transcript || '');
          resolveRef.current = null;
        }
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          
          if (result.isFinal) {
            finalText += text;
            console.log('[useWebSpeechSTT] Final result:', text, 'confidence:', result[0].confidence);
          } else {
            interimText += text;
          }
        }

        if (finalText) {
          setTranscript(prev => prev + finalText);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interimText);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorer les erreurs de stop
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur. Utilisez Chrome, Edge ou Safari.');
      return;
    }

    setTranscript('');
    setInterimTranscript('');
    setError(null);

    try {
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Mode continu pour startListening
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('[useWebSpeechSTT] Error starting recognition:', err);
      setError('Impossible de démarrer la reconnaissance vocale');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('[useWebSpeechSTT] Error stopping recognition:', err);
      }
    }
  }, [isListening]);

  const transcribeFromMicrophone = useCallback(async (): Promise<string> => {
    if (!isSupported) {
      throw new Error('Web Speech API non supporté');
    }

    return new Promise((resolve) => {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      setIsProcessing(true);
      
      resolveRef.current = resolve;

      try {
        if (recognitionRef.current) {
          recognitionRef.current.continuous = true; // Mode continu pour capturer plus de paroles
          recognitionRef.current.start();
          
          // Timeout après 15 secondes (augmenté de 10 à 15)
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                // Ignorer si déjà arrêté
              }
            }
          }, 15000);
        }
      } catch (err) {
        console.error('[useWebSpeechSTT] Error in transcribeFromMicrophone:', err);
        setIsProcessing(false);
        resolve('');
      }
    });
  }, [isSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    startListening,
    stopListening,
    transcribeFromMicrophone,
    isListening,
    isProcessing,
    transcript,
    interimTranscript,
    error,
    isSupported,
    resetTranscript,
  };
};
