import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Loader2, Volume2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { supabase } from '@/integrations/supabase/client';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

interface AssistantResponse {
  type: 'navigate' | 'action' | 'response';
  value: string;
  response_fr: string;
  response_ba: string;
}

interface RaconteMoiAssistantProps {
  onAction?: (action: string) => void;
}

export const RaconteMoiAssistant: React.FC<RaconteMoiAssistantProps> = ({ onAction }) => {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  
  // Speech recognition
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'fr-FR'; // Fallback to French for STT
      
      recognitionInstance.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        setTranscript(result[0].transcript);
        
        if (result.isFinal) {
          processCommand(result[0].transcript);
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, [currentLang]);

  const processCommand = useCallback(async (command: string) => {
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      const { data, error } = await supabase.functions.invoke('raconte-moi', {
        body: { command, language: currentLang }
      });
      
      if (error) throw error;
      
      const result = data as AssistantResponse;
      setResponse(result);
      
      // Speak the response
      const responseText = currentLang === 'ba' ? result.response_ba : result.response_fr;
      await speakCurrentLang(responseText);
      
      // Handle navigation
      if (result.type === 'navigate') {
        tamtamFeedback.play('success');
        setTimeout(() => {
          switch (result.value) {
            case 'home': navigate('/tamtam/home'); break;
            case 'social': navigate('/tamtam/social'); break;
            case 'market': navigate('/tamtam/market'); break;
            case 'sos': navigate('/tamtam/sos'); break;
            case 'profile': navigate('/tamtam/profile'); break;
            case 'services': navigate('/tamtam/services'); break;
          }
          setIsOpen(false);
        }, 1500);
      }
      
      // Handle actions
      if (result.type === 'action') {
        tamtamFeedback.play('success');
        onAction?.(result.value);
      }
      
    } catch (error) {
      console.error('Raconte-Moi error:', error);
      toast({
        title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
        description: currentLang === 'ba' ? 'Má bìnú, gbìyànjú lẹ́ẹ̀kan sí i' : 'Désolé, réessayez',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentLang, navigate, onAction, speakCurrentLang, toast]);

  const startListening = useCallback(() => {
    if (recognition) {
      setTranscript('');
      setResponse(null);
      setIsListening(true);
      tamtamFeedback.play('record');
      recognition.start();
      
      // Welcome message
      speakCurrentLang(currentLang === 'ba' 
        ? 'Mo ń gbọ́ ọ. Sọ ohun tí o fẹ́.'
        : 'Je vous écoute. Dites ce que vous voulez faire.'
      );
    }
  }, [recognition, currentLang, speakCurrentLang]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  const toggleOpen = useCallback(() => {
    tamtamFeedback.play('click');
    if (isOpen) {
      stopListening();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setTimeout(() => startListening(), 500);
    }
  }, [isOpen, startListening, stopListening]);

  return (
    <>
      {/* Floating Assistant Button */}
      <motion.button
        onClick={toggleOpen}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg flex items-center justify-center z-40"
        whileTap={{ scale: 0.9 }}
        animate={isOpen ? { scale: 0 } : { scale: 1 }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Mic className="w-3 h-3 text-white" />
        </span>
      </motion.button>

      {/* Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4"
            onClick={() => toggleOpen()}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-2xl">🎭</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Raconte-Moi</h3>
                    <p className="text-white/70 text-sm">
                      {currentLang === 'ba' ? 'Olùrànlọ́wọ́ ohùn' : 'Assistant vocal'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleOpen}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Visualization */}
              <div className="flex justify-center mb-6">
                <motion.div
                  className={`w-32 h-32 rounded-full flex items-center justify-center ${
                    isListening 
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                      : isProcessing 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                        : 'bg-white/20'
                  }`}
                  animate={isListening ? {
                    scale: [1, 1.1, 1],
                    boxShadow: ['0 0 0 0 rgba(52, 211, 153, 0.4)', '0 0 0 20px rgba(52, 211, 153, 0)', '0 0 0 0 rgba(52, 211, 153, 0)']
                  } : {}}
                  transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
                >
                  {isProcessing ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : isListening ? (
                    <Mic className="w-12 h-12 text-white animate-pulse" />
                  ) : (
                    <Volume2 className="w-12 h-12 text-white/60" />
                  )}
                </motion.div>
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="bg-white/10 rounded-2xl p-4 mb-4">
                  <p className="text-white/70 text-xs mb-1">
                    {currentLang === 'ba' ? 'Mo gbọ́:' : "J'ai entendu:"}
                  </p>
                  <p className="text-white font-medium">{transcript}</p>
                </div>
              )}

              {/* Response */}
              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 rounded-2xl p-4 mb-4"
                >
                  <p className="text-white">
                    {currentLang === 'ba' ? response.response_ba : response.response_fr}
                  </p>
                  {response.type === 'navigate' && (
                    <p className="text-green-300 text-sm mt-2">
                      ✓ {currentLang === 'ba' ? 'Ń lọ sí ibẹ̀...' : 'Navigation en cours...'}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Action Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {isListening 
                  ? (currentLang === 'ba' ? 'Dúró' : 'Arrêter')
                  : (currentLang === 'ba' ? 'Bẹ̀rẹ̀ sísọ' : 'Commencer à parler')
                }
              </button>

              {/* Quick Commands */}
              <div className="mt-4 flex flex-wrap gap-2">
                {['Accueil', 'Social', 'Marché', 'Profil'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => processCommand(cmd)}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
