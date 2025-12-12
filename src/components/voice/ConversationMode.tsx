import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2, Settings, Trash2, RotateCcw } from 'lucide-react';
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
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';
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
  const [userLanguage, setUserLanguage] = useState<'bariba' | 'french'>('french');
  const [showSettings, setShowSettings] = useState(false);
  const [autoPlayResponse, setAutoPlayResponse] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isDetecting, isSpeaking: isVADSpeaking, startDetection, stopDetection, onSpeechEnd, sensitivity, setSensitivity } = useVoiceDetection();
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba } = useBaribaSTT();
  const { startListening, stopListening, isListening, transcript: frenchTranscript } = useFrenchSTT();
  const { speak: speakBariba, isLoading: isLoadingBariba } = useBaribaTTS();
  const { speak: speakFrench } = useFrenchTTS();
  const { translateFrenchToBariba, translateBaribaToFrench, isInitialized } = useHybridTranslation();
  const { toast } = useToast();

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

  const isActive = isDetecting || isListening || isRecording;
  const isAnyProcessing = isProcessing || isTranscribingBariba || isLoadingBariba;

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Je parle:</span>
              <Button
                size="sm"
                variant={userLanguage === 'french' ? 'default' : 'outline'}
                onClick={() => setUserLanguage('french')}
              >
                Français
              </Button>
              <Button
                size="sm"
                variant={userLanguage === 'bariba' ? 'default' : 'outline'}
                onClick={() => setUserLanguage('bariba')}
                className="bariba-text"
              >
                Bààtɔ̀nú
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
              <span className="text-sm">Détection auto</span>
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
              <span className="text-sm">Lire automatiquement les réponses</span>
              <Switch checked={autoPlayResponse} onCheckedChange={setAutoPlayResponse} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sensibilité de détection</span>
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
        <ScrollArea className="h-[400px] pr-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Mic className="h-12 w-12 mb-4 opacity-50" />
              <p>Appuyez sur le bouton pour commencer la conversation</p>
              <p className="text-sm mt-2">
                Parlez en {userLanguage === 'french' ? 'Français' : 'Bààtɔ̀nú'} et recevez la traduction
              </p>
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
                      "max-w-[80%] p-3 rounded-lg space-y-1",
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {msg.language === 'bariba' ? 'Bààtɔ̀nú' : 'Français'}
                      </Badge>
                    </div>
                    <p className={msg.language === 'bariba' ? 'bariba-text' : ''}>
                      {msg.text}
                    </p>
                    
                    {/* Play button for assistant messages */}
                    {msg.role === 'assistant' && (
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
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        Écouter
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Recording Button */}
      <div className="flex justify-center">
        <div className="relative">
          {(isActive || isVADSpeaking) && (
            <div className="absolute inset-0 -m-4 rounded-full animate-ping bg-primary/30" />
          )}
          <Button
            size="lg"
            variant={isActive ? "destructive" : "default"}
            className="w-24 h-24 rounded-full"
            onClick={toggleConversation}
            disabled={isAnyProcessing || !isInitialized}
          >
            {isAnyProcessing ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : isActive ? (
              <MicOff className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isAnyProcessing ? (
            'Traitement en cours...'
          ) : isActive ? (
            isVADSpeaking ? 'Parole détectée...' : 'Écoute en cours...'
          ) : (
            `Appuyez pour parler en ${userLanguage === 'french' ? 'Français' : 'Bààtɔ̀nú'}`
          )}
        </p>
      </div>
    </div>
  );
};
