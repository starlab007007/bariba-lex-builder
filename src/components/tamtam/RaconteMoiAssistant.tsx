import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Loader2, Volume2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AssistantResponse {
  type: 'navigate' | 'action' | 'response';
  value: string;
  response_fr: string;
  response_ba: string;
}

interface RaconteMoiAssistantProps {
  onAction?: (action: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RaconteMoiAssistant: React.FC<RaconteMoiAssistantProps> = ({ onAction, isOpen, onOpenChange }) => {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang, speakBariba, speakFrench } = useBilingualAudio();
  const baribaSTT = useBaribaSTT();
  const audioRecorder = useAudioRecorder();
  const { toast } = useToast();
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<AssistantResponse | null>(null);

  const startListening = useCallback(async () => {
    setTranscript('');
    setResponse(null);
    setIsListening(true);
    tamtamFeedback.play('record');
    
    // Welcome message in current language
    await speakCurrentLang(currentLang === 'ba' 
      ? 'Mo ń gbọ́ ọ. Sọ ohun tí o fẹ́.'
      : 'Je vous écoute. Dites ce que vous voulez faire.'
    );
    
    // Start recording for Bariba STT
    await audioRecorder.startRecording();
  }, [currentLang, speakCurrentLang, audioRecorder]);

  const stopListening = useCallback(async () => {
    setIsListening(false);
    setIsProcessing(true);
    
    try {
      // Stop recording and get audio
      const audioBase64 = await audioRecorder.stopRecording();
      
      if (!audioBase64) {
        setIsProcessing(false);
        return;
      }
      
      // Transcribe using Bariba STT (works for both Bariba and French with accent)
      const sttResult = await baribaSTT.transcribe(audioBase64);
      
      if (!sttResult?.transcription) {
        toast({
          title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
          description: currentLang === 'ba' ? 'Kò lè gbọ́ ohun' : 'Impossible de comprendre',
          variant: 'destructive'
        });
        setIsProcessing(false);
        return;
      }
      
      setTranscript(sttResult.transcription);
      
      // Process the command
      await processCommand(sttResult.transcription);
      
    } catch (err) {
      console.error('[RaconteMoiAssistant] Error:', err);
      setIsProcessing(false);
    }
  }, [audioRecorder, baribaSTT, currentLang, toast]);

  const processCommand = useCallback(async (command: string) => {
    tamtamFeedback.play('send');
    
    try {
      const { data, error } = await supabase.functions.invoke('raconte-moi', {
        body: { command, language: currentLang }
      });
      
      if (error) throw error;
      
      const result = data as AssistantResponse;
      setResponse(result);
      
      // Speak the response in current language
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
          onOpenChange(false);
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

  const toggleOpen = useCallback(() => {
    tamtamFeedback.play('click');
    if (isOpen) {
      if (isListening) {
        audioRecorder.cancelRecording();
      }
      setIsListening(false);
      onOpenChange(false);
    } else {
      onOpenChange(true);
      setTimeout(() => startListening(), 500);
    }
  }, [isOpen, isListening, startListening, audioRecorder, onOpenChange]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <>
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
                      {currentLang === 'ba' ? 'Olùrànlọ́wọ́ ohùn Bàátɔ̀nú' : 'Assistant vocal Bariba'}
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
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [10, 30, 10] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                          className="w-2 bg-white rounded-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <Volume2 className="w-12 h-12 text-white/60" />
                  )}
                </motion.div>
              </div>

              {/* Recording duration */}
              {isListening && audioRecorder.duration > 0 && (
                <div className="text-center mb-4">
                  <span className="text-white/70 text-sm">
                    {Math.floor(audioRecorder.duration / 60)}:{(audioRecorder.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

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
                onClick={handleMicToggle}
                disabled={isProcessing}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {isListening 
                  ? (currentLang === 'ba' ? '⏹️ Dúró' : '⏹️ Arrêter')
                  : (currentLang === 'ba' ? '🎤 Bẹ̀rẹ̀ sísọ' : '🎤 Commencer à parler')
                }
              </button>

              {/* Quick Commands */}
              <div className="mt-4 flex flex-wrap gap-2">
                {['Accueil', 'Social', 'Marché', 'Profil', 'Urgence'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => {
                      setTranscript(cmd);
                      processCommand(cmd);
                    }}
                    disabled={isProcessing || isListening}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
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
