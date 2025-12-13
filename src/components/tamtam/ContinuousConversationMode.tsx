import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, Loader2, Settings, Trash2, 
  X, Pause, Play, Zap, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useVoiceDetection } from '@/hooks/useVoiceDetection';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { audioServicesMonitoring } from '@/services/AudioServicesMonitoringService';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  textBa: string;
  textFr: string;
  timestamp: Date;
  isPlaying?: boolean;
}

interface ContinuousConversationModeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContinuousConversationMode({ isOpen, onClose }: ContinuousConversationModeProps) {
  const { currentLang, t } = useTamTamLanguage();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoPlayResponse, setAutoPlayResponse] = useState(true);
  const [conversationMode, setConversationMode] = useState<'translator' | 'assistant'>('assistant');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const hasSpokenRef = useRef(false);

  const { 
    isDetecting, 
    isSpeaking: isVADSpeaking, 
    startDetection, 
    stopDetection, 
    onSpeechEnd,
    sensitivity,
    setSensitivity 
  } = useVoiceDetection();
  
  const { startRecording, stopRecording, isRecording, duration } = useAudioRecorder();
  const { transcribe, isTranscribing } = useBaribaSTT();
  const { speak: speakBariba, isLoading: isLoadingBariba } = useBaribaTTS();
  const { speak: speakFrench } = useFrenchTTS();
  const { translateBaribaToFrench, translateFrenchToBariba, isInitialized } = useHybridTranslation();

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle speech end callback
  useEffect(() => {
    if (!isActive || isPaused) return;

    const unsubscribe = onSpeechEnd(async (speechDuration) => {
      if (isProcessingRef.current || hasSpokenRef.current) return;
      
      hasSpokenRef.current = true;
      console.log(`🎤 Speech ended after ${speechDuration}ms, processing...`);
      
      const audioBase64 = await stopRecording();
      if (audioBase64 && audioBase64.length > 1000) {
        await processUserSpeech(audioBase64);
      }
      
      hasSpokenRef.current = false;
      
      // Restart recording for next turn
      if (isActive && !isPaused) {
        setTimeout(() => {
          startRecording();
        }, 500);
      }
    });

    return unsubscribe;
  }, [isActive, isPaused]);

  const processUserSpeech = async (audioBase64: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // 1. Transcribe Bariba
      const sttStart = Date.now();
      const result = await transcribe(audioBase64);
      
      audioServicesMonitoring.logCall({
        serviceType: 'stt',
        language: 'bariba',
        duration: Date.now() - sttStart,
        success: !!result,
        inputLength: audioBase64.length
      });

      if (!result?.transcription) {
        toast({ title: "Pas de parole détectée", variant: "destructive" });
        return;
      }

      const userTextBa = result.transcription;

      // 2. Translate to French
      const transResult = await translateBaribaToFrench(userTextBa);
      const userTextFr = transResult?.translation || userTextBa;

      // Add user message
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        textBa: userTextBa,
        textFr: userTextFr,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);

      // 3. Generate AI response (for assistant mode) or just translate (for translator mode)
      let responseFr = '';
      let responseBa = '';

      if (conversationMode === 'assistant') {
        // Call AI for response
        const { data, error } = await supabase.functions.invoke('raconte-moi', {
          body: { command: userTextFr, language: 'fr' }
        });

        if (data?.response) {
          responseFr = typeof data.response === 'string' 
            ? data.response 
            : data.response.message || JSON.stringify(data.response);
        } else {
          responseFr = `J'ai compris : "${userTextFr}". Comment puis-je vous aider ?`;
        }

        // Translate response to Bariba
        const baTransResult = await translateFrenchToBariba(responseFr);
        responseBa = baTransResult?.translation || responseFr;
      } else {
        // Translator mode: just provide the translation
        responseFr = userTextFr;
        responseBa = userTextBa;
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        textBa: responseBa,
        textFr: responseFr,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);

      // 4. Speak response
      if (autoPlayResponse) {
        const ttsStart = Date.now();
        if (currentLang === 'ba') {
          await speakBariba(responseBa);
        } else {
          await speakFrench(responseFr);
        }
        
        audioServicesMonitoring.logCall({
          serviceType: 'tts',
          language: currentLang === 'ba' ? 'bariba' : 'french',
          duration: Date.now() - ttsStart,
          success: true,
          inputLength: (currentLang === 'ba' ? responseBa : responseFr).length
        });
      }

    } catch (error: any) {
      console.error('Conversation error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const startConversation = async () => {
    try {
      await startDetection();
      await startRecording();
      setIsActive(true);
      setIsPaused(false);
      toast({ title: "🎙️ Conversation démarrée", description: "Parlez naturellement..." });
    } catch (error: any) {
      toast({ 
        title: "Erreur microphone", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const pauseConversation = () => {
    setIsPaused(true);
    stopDetection();
    stopRecording();
  };

  const resumeConversation = async () => {
    setIsPaused(false);
    await startDetection();
    await startRecording();
  };

  const stopConversation = async () => {
    setIsActive(false);
    setIsPaused(false);
    stopDetection();
    await stopRecording();
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const speakMessage = (msg: Message) => {
    const text = currentLang === 'ba' ? msg.textBa : msg.textFr;
    if (currentLang === 'ba') {
      speakBariba(text);
    } else {
      speakFrench(text);
    }
  };

  if (!isOpen) return null;

  const isAnyLoading = isProcessing || isTranscribing || isLoadingBariba;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-gray-950"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Conversation Continue
              </h1>
              <p className="text-xs text-gray-400">
                {conversationMode === 'assistant' ? 'Mode Assistant IA' : 'Mode Traducteur'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSettings(!showSettings)}
              className="text-white"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearMessages}
              className="text-white"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4 border-t border-gray-800 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Lire les réponses</span>
                  <Switch checked={autoPlayResponse} onCheckedChange={setAutoPlayResponse} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Mode</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={conversationMode === 'assistant' ? 'default' : 'outline'}
                      onClick={() => setConversationMode('assistant')}
                      className="text-xs"
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      Assistant
                    </Button>
                    <Button
                      size="sm"
                      variant={conversationMode === 'translator' ? 'default' : 'outline'}
                      onClick={() => setConversationMode('translator')}
                      className="text-xs"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Traducteur
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Sensibilité VAD</span>
                    <span>{sensitivity}%</span>
                  </div>
                  <Slider
                    value={[sensitivity]}
                    min={10}
                    max={90}
                    step={5}
                    onValueChange={([v]) => setSensitivity(v)}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 h-[calc(100vh-280px)]">
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-4"
              >
                <Mic className="h-10 w-10 text-white" />
              </motion.div>
              <p className="text-gray-400">
                {isActive 
                  ? "Parlez, je vous écoute..." 
                  : "Appuyez pour démarrer la conversation"
                }
              </p>
              <p className="text-sm text-gray-500 mt-2">
                La détection automatique de voix est activée
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <Card
                  className={cn(
                    "max-w-[85%] p-4 space-y-2",
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 text-white' 
                      : 'bg-gray-800 border-gray-700 text-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        msg.role === 'user' ? 'border-white/30 text-white/80' : 'border-purple-500/50 text-purple-400'
                      )}
                    >
                      {msg.role === 'user' ? '👤 Vous' : '🤖 Assistant'}
                    </Badge>
                  </div>

                  {/* Bilingual text */}
                  <div className="space-y-1">
                    <p className="bariba-text text-sm">{msg.textBa}</p>
                    <p className="text-sm text-gray-300 italic">{msg.textFr}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-7 text-xs",
                        msg.role === 'user' ? 'text-white/70 hover:bg-white/20' : 'text-gray-400 hover:bg-gray-700'
                      )}
                      onClick={() => speakMessage(msg)}
                      disabled={isLoadingBariba}
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      Écouter
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-gray-900/50">
        <div className="flex items-center justify-center gap-4 text-sm">
          {isActive && (
            <>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isVADSpeaking ? "bg-green-500 animate-pulse" : "bg-gray-500"
                )} />
                <span className="text-gray-400">
                  {isVADSpeaking ? 'Parole détectée' : 'En écoute...'}
                </span>
              </div>
              {isRecording && (
                <Badge variant="outline" className="text-red-400 border-red-400">
                  🔴 {duration}s
                </Badge>
              )}
            </>
          )}
          {isAnyLoading && (
            <div className="flex items-center gap-2 text-purple-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {isTranscribing ? 'Transcription...' : 
                 isLoadingBariba ? 'Génération audio...' : 'Traitement...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Control Button */}
      <div className="p-6 flex justify-center">
        <div className="relative">
          {isActive && !isPaused && (
            <motion.div
              className="absolute inset-0 -m-4 rounded-full bg-purple-500/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
          
          <div className="flex items-center gap-4">
            {isActive && (
              <Button
                size="lg"
                variant="outline"
                className="w-14 h-14 rounded-full border-gray-600"
                onClick={isPaused ? resumeConversation : pauseConversation}
              >
                {isPaused ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <Pause className="h-6 w-6" />
                )}
              </Button>
            )}
            
            <Button
              size="lg"
              variant={isActive ? "destructive" : "default"}
              className={cn(
                "w-20 h-20 rounded-full shadow-xl",
                !isActive && "bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
              )}
              onClick={isActive ? stopConversation : startConversation}
              disabled={isAnyLoading || !isInitialized}
            >
              {isAnyLoading ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : isActive ? (
                <MicOff className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
