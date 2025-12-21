/**
 * useWebSpeechSTT - Hook pour le Speech-to-Text natif du navigateur
 * Utilise Web Speech API (gratuit, fonctionne offline)
 * Support pour français uniquement
 * 
 * FIX: Utilise useRef pour éviter le problème de stale closure dans onend
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
  
  // FIX: Utiliser une ref pour tracker le transcript et éviter stale closure
  const transcriptRef = useRef('');
  const collectedFinalRef = useRef(''); // Collecte les résultats finaux pendant une session

  // Sync transcript ref with state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    // Vérifier le support du Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    setIsSupported(supported);

    if (supported) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        console.log('[useWebSpeechSTT] ✅ Recognition started - parlez maintenant...');
        setIsListening(true);
        setError(null);
        collectedFinalRef.current = ''; // Reset collected finals for new session
      };

      recognition.onend = () => {
        // FIX: Utiliser la ref au lieu de state pour capturer la valeur correcte
        const finalTranscript = collectedFinalRef.current || transcriptRef.current;
        console.log('[useWebSpeechSTT] 🛑 Recognition ended, final transcript:', finalTranscript);
        
        setIsListening(false);
        setIsProcessing(false);
        
        // Résoudre la promesse si en attente
        if (resolveRef.current) {
          console.log('[useWebSpeechSTT] 📤 Resolving promise with:', finalTranscript);
          resolveRef.current(finalTranscript);
          resolveRef.current = null;
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[useWebSpeechSTT] ❌ Recognition error:', event.error);
        
        let errorMessage = '';
        switch (event.error) {
          case 'no-speech':
            console.warn('[useWebSpeechSTT] ⚠️ No speech detected - essayez de parler plus fort');
            errorMessage = 'Aucune parole détectée. Parlez plus fort et plus longtemps.';
            // Pour no-speech, résoudre avec ce qu'on a collecté
            if (resolveRef.current) {
              const collected = collectedFinalRef.current || transcriptRef.current;
              console.log('[useWebSpeechSTT] Resolving no-speech with collected:', collected);
              resolveRef.current(collected);
              resolveRef.current = null;
            }
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
        
        // Pour les erreurs fatales (pas no-speech)
        if (event.error !== 'no-speech') {
          setError(errorMessage);
          setIsListening(false);
          setIsProcessing(false);
          
          if (resolveRef.current) {
            resolveRef.current(collectedFinalRef.current || transcriptRef.current || '');
            resolveRef.current = null;
          }
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
            console.log('[useWebSpeechSTT] 📝 Final result:', text, 'confidence:', result[0].confidence?.toFixed(2));
          } else {
            interimText += text;
            console.log('[useWebSpeechSTT] 💬 Interim:', text);
          }
        }

        if (finalText) {
          // FIX: Accumuler dans la ref ET dans le state
          collectedFinalRef.current += finalText;
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

    console.log('[useWebSpeechSTT] 🎙️ Starting listening...');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    transcriptRef.current = '';
    collectedFinalRef.current = '';

    try {
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('[useWebSpeechSTT] Error starting recognition:', err);
      setError('Impossible de démarrer la reconnaissance vocale');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    console.log('[useWebSpeechSTT] 🛑 Stopping listening...');
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

    console.log('[useWebSpeechSTT] 🎤 transcribeFromMicrophone called');

    return new Promise((resolve) => {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      setIsProcessing(true);
      transcriptRef.current = '';
      collectedFinalRef.current = '';
      
      resolveRef.current = resolve;

      try {
        if (recognitionRef.current) {
          recognitionRef.current.continuous = true;
          recognitionRef.current.start();
          console.log('[useWebSpeechSTT] Recognition started for transcribeFromMicrophone');
          
          // Timeout après 15 secondes
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              console.log('[useWebSpeechSTT] ⏱️ Timeout reached, stopping...');
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
  }, [isSupported, isListening]);

  const resetTranscript = useCallback(() => {
    console.log('[useWebSpeechSTT] 🗑️ Reset transcript');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    transcriptRef.current = '';
    collectedFinalRef.current = '';
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
