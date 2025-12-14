import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2, Settings, Trash2, ArrowRightLeft, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useVoiceDetection } from '@/hooks/useVoiceDetection';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { useFrenchSTTBase64 } from '@/hooks/useFrenchSTTBase64';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
import { useAudioServices } from '@/hooks/useAudioServices';
import { AudioServicesStatusBar } from '@/components/tamtam/AudioServiceStatus';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  language: 'bariba' | 'french';
  text: string;
  translation?: string;
  timestamp: Date;
  audioBase64?: string;
}

export const ConversationMode = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [userLanguage, setUserLanguage] = useState<'bariba' | 'french'>('bariba');
  const [showSettings, setShowSettings] = useState(false);
  const [autoPlayResponse, setAutoPlayResponse] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBidirectionalMode, setIsBidirectionalMode] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isDetecting, isSpeaking: isVADSpeaking, startDetection, stopDetection, onSpeechEnd, sensitivity, setSensitivity } = useVoiceDetection();
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba } = useBaribaSTT();
  const { startListening, stopListening, isListening, transcript: frenchTranscript } = useFrenchSTT();
  const { transcribe: transcribeFrenchBase64, isTranscribing: isTranscribingFrench, serviceAvailable: frenchSTTAvailable } = useFrenchSTTBase64();
  const { speak: speakBariba, isLoading: isLoadingBariba, isSpeaking: isSpeakingBariba } = useBaribaTTS();
  const { speak: speakFrench, isSpeaking: isSpeakingFrench } = useFrenchTTS();
  const { translateFrenchToBariba, translateBaribaToFrench, isInitialized } = useHybridTranslation();
  const { health, checkHealth } = useAudioServices();
  const { toast } = useToast();

  // Check services health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle VAD speech end
  useEffect(() => {
    if (isAutoMode && isDetecting) {
      onSpeechEnd(async (duration) => {
        console.log(`Speech ended after ${duration}ms`);
        await handleSpeechComplete();
      });
    }
  }, [isAutoMode, isDetecting]);

  const handleSpeechComplete = async () => {
    if (userLanguage === 'bariba') {
      const audioBase64 = await stopRecording();
      if (audioBase64) {
        await processBaribaSpeech(audioBase64);
      }
    } else {
      stopListening();
      if (frenchTranscript) {
        await processFrenchSpeech(frenchTranscript);
      }
    }
  };

  const processBaribaSpeech = async (audioBase64: string) => {
    setIsProcessing(true);
    try {
      const result = await transcribeBariba(audioBase64);
      if (result) {
        // Add user message
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          language: 'bariba',
          text: result.transcription,
          timestamp: new Date(),
          audioBase64
        };
        setMessages(prev => [...prev, userMsg]);

        // Translate and respond
        const translation = await translateBaribaToFrench(result.transcription);
        if (translation) {
          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            language: 'french',
            text: translation.translation,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMsg]);

          // Auto-play response
          if (autoPlayResponse) {
            speakFrench(translation.translation);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processFrenchSpeech = async (text: string) => {
    setIsProcessing(true);
    try {
      // Add user message
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        language: 'french',
        text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);

      // Translate and respond
      const translation = await translateFrenchToBariba(text);
      if (translation) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          language: 'bariba',
          text: translation.translation,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Auto-play response
        if (autoPlayResponse) {
          speakBariba(translation.translation);
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleConversation = async () => {
    if (isDetecting || isListening || isRecording) {
      stopDetection();
      stopListening();
      await stopRecording();
    } else {
      if (isAutoMode) {
        await startDetection();
        if (userLanguage === 'bariba') {
          await startRecording();
        } else {
          startListening();
        }
      } else {
        // Manual mode
        if (userLanguage === 'bariba') {
          await startRecording();
        } else {
          startListening();
        }
      }
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const swapLanguage = () => {
    setUserLanguage(prev => prev === 'bariba' ? 'french' : 'bariba');
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const isActive = isDetecting || isListening || isRecording;
  const isAnyProcessing = isProcessing || isTranscribingBariba || isTranscribingFrench || isLoadingBariba;
  const isSpeakingAny = isSpeakingBariba || isSpeakingFrench;

  return (
    <div className="space-y-4">
      {/* Audio Services Status */}
      <AudioServicesStatusBar health={health} showAll={false} />

      {/* Header Controls - ICONIC */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Language Selector - ICONIC */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUserLanguage('bariba')}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all",
                userLanguage === 'bariba' 
                  ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30 ring-2 ring-orange-400' 
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              🇧🇯
            </button>
            
            <button
              onClick={swapLanguage}
              className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setUserLanguage('french')}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all",
                userLanguage === 'french' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 ring-2 ring-blue-400' 
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              🇫🇷
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Bidirectional Mode Toggle */}
            <div className="flex items-center gap-2">
              <Zap className={cn("h-4 w-4", isBidirectionalMode ? "text-yellow-500" : "text-muted-foreground")} />
              <Switch 
                checked={isBidirectionalMode} 
                onCheckedChange={setIsBidirectionalMode}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
              <span className="text-sm">🎯</span>
            </div>

            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            <Button variant="ghost" size="sm" onClick={clearMessages}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        <Collapsible open={showSettings}>
          <CollapsibleContent className="pt-4 space-y-4 border-t mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">🔊 Lire automatiquement</span>
              <Switch checked={autoPlayResponse} onCheckedChange={setAutoPlayResponse} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>👂 Sensibilité</span>
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
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Messages */}
      <Card className="p-4">
        <ScrollArea className="h-[350px] pr-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-lg">
                {userLanguage === 'bariba' ? '🇧🇯 → 🇫🇷' : '🇫🇷 → 🇧🇯'}
              </p>
              <p className="text-sm mt-2 opacity-70">👆</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] p-3 rounded-2xl space-y-1",
                      msg.role === 'user' 
                        ? msg.language === 'bariba'
                          ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        : 'bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{msg.language === 'bariba' ? '🇧🇯' : '🇫🇷'}</span>
                    </div>
                    <p className={msg.language === 'bariba' ? 'bariba-text' : ''}>
                      {msg.text}
                    </p>
                    
                    {/* Play button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => {
                        if (msg.language === 'bariba') {
                          speakBariba(msg.text);
                        } else {
                          speakFrench(msg.text);
                        }
                      }}
                      disabled={isSpeakingAny}
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Recording Button - GIANT CENTRAL */}
      <div className="flex justify-center">
        <div className="relative">
          {(isActive || isVADSpeaking) && (
            <div className={cn(
              "absolute inset-0 -m-6 rounded-full animate-pulse",
              userLanguage === 'bariba' ? 'bg-orange-500/30' : 'bg-blue-500/30'
            )} />
          )}
          <Button
            size="lg"
            variant={isActive ? "destructive" : "default"}
            className={cn(
              "w-28 h-28 rounded-full transition-all shadow-xl",
              !isActive && userLanguage === 'bariba' && 'bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700',
              !isActive && userLanguage === 'french' && 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
            )}
            onClick={toggleConversation}
            disabled={isAnyProcessing || !isInitialized}
          >
            {isAnyProcessing ? (
              <Loader2 className="h-12 w-12 animate-spin" />
            ) : isSpeakingAny ? (
              <Volume2 className="h-12 w-12 animate-pulse" />
            ) : isActive ? (
              <MicOff className="h-12 w-12" />
            ) : (
              <Mic className="h-12 w-12" />
            )}
          </Button>
        </div>
      </div>

      {/* Status - ICONIC */}
      <div className="text-center">
        <p className="text-2xl">
          {isAnyProcessing ? '⏳' : isSpeakingAny ? '🔊' : isActive ? (isVADSpeaking ? '🗣️' : '👂') : ''}
        </p>
      </div>
    </div>
  );
};
