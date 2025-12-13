import { useState, useEffect } from 'react';
import { Mic, Languages, Copy, ArrowRight, Volume2, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartVoiceRecorder } from './SmartVoiceRecorder';
import { AudioPlayer } from './AudioPlayer';
import { useBaribaSTT, SpeakerType } from '@/hooks/useBaribaSTT';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceDictationProps {
  onTranslate?: (text: string, language: 'bariba' | 'french') => void;
}

type ServiceStatus = 'checking' | 'available' | 'unavailable' | 'error';

export const VoiceDictation = ({ onTranslate }: VoiceDictationProps) => {
  const [language, setLanguage] = useState<'bariba' | 'french'>('bariba');
  const [transcription, setTranscription] = useState('');
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);
  const [baribaSTTStatus, setBaribaSTTStatus] = useState<ServiceStatus>('checking');
  const [lastError, setLastError] = useState<string | null>(null);
  
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba, error: baribaError } = useBaribaSTT();
  const { 
    startListening, 
    stopListening, 
    isListening, 
    transcript: frenchTranscript,
    interimTranscript,
    isSupported: isFrenchSTTSupported 
  } = useFrenchSTT();
  const { toast } = useToast();

  // Check Bariba STT service status on mount
  useEffect(() => {
    const checkBaribaSTTStatus = async () => {
      try {
        setBaribaSTTStatus('checking');
        const { data, error } = await supabase.functions.invoke('bariba-stt', {
          body: { audio: 'test' }
        });
        
        if (error) {
          console.error('Bariba STT health check error:', error);
          setBaribaSTTStatus('error');
          return;
        }
        
        if (data?.isHealthCheck && data?.status === 'ok') {
          setBaribaSTTStatus('available');
        } else {
          setBaribaSTTStatus('unavailable');
        }
      } catch (e) {
        console.error('Bariba STT health check failed:', e);
        setBaribaSTTStatus('error');
      }
    };

    checkBaribaSTTStatus();
  }, []);

  const handleBaribaRecordingComplete = async (audioBase64: string) => {
    setLastAudioBase64(audioBase64);
    setLastError(null);
    
    // Attempt Bariba STT
    const result = await transcribeBariba(audioBase64);
    
    if (result?.transcription) {
      setTranscription(result.transcription);
      setBaribaSTTStatus('available');
      toast({
        title: "✅ Transcription réussie",
        description: `Confiance: ${result.confidence}% | Durée: ${result.duration}ms`,
      });
      return;
    }
    
    // Handle failure with detailed error
    const errorMessage = baribaError || "Le service de transcription Bariba n'a pas pu traiter l'audio.";
    setLastError(errorMessage);
    setBaribaSTTStatus('error');
    
    toast({
      title: "⚠️ Transcription Bariba échouée",
      description: (
        <div className="space-y-1">
          <p>{errorMessage}</p>
          <p className="text-xs text-muted-foreground">
            Conseil: Essayez l'onglet Français ou réenregistrez avec un son plus clair.
          </p>
        </div>
      ),
      variant: "destructive",
      duration: 8000,
    });
  };

  const handleFrenchListening = () => {
    if (isListening) {
      stopListening();
      setTranscription(frenchTranscript);
    } else {
      setTranscription('');
      startListening();
    }
  };

  const handleCopy = async () => {
    if (transcription) {
      await navigator.clipboard.writeText(transcription);
      toast({
        title: "Copié",
        description: "Texte copié dans le presse-papiers"
      });
    }
  };

  const handleTranslate = () => {
    if (transcription && onTranslate) {
      onTranslate(transcription, language);
    }
  };

  const isLoading = isTranscribingBariba || isListening;

  return (
    <div className="space-y-6">
      <Tabs value={language} onValueChange={(v) => setLanguage(v as 'bariba' | 'french')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bariba" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span className="bariba-text">Bààtɔ̀nú</span>
          </TabsTrigger>
          <TabsTrigger value="french" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Français
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bariba" className="space-y-6 pt-4">
          {/* Service Status Indicator */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              {baribaSTTStatus === 'checking' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Vérification...
                </Badge>
              )}
              {baribaSTTStatus === 'available' && (
                <Badge variant="default" className="flex items-center gap-1 bg-green-500/20 text-green-700 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  STT Bariba disponible
                </Badge>
              )}
              {baribaSTTStatus === 'unavailable' && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                  <AlertTriangle className="h-3 w-3" />
                  STT en veille
                </Badge>
              )}
              {baribaSTTStatus === 'error' && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  STT indisponible
                </Badge>
              )}
            </div>
            {baribaSTTStatus === 'error' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLanguage('french')}
                className="text-xs"
              >
                Utiliser Français →
              </Button>
            )}
          </div>

          {/* Last Error Display */}
          {lastError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Erreur de transcription</p>
                  <p className="text-xs mt-1 opacity-80">{lastError}</p>
                </div>
              </div>
            </div>
          )}

          <Card className="p-6">
            <SmartVoiceRecorder
              language="bariba"
              onRecordingComplete={handleBaribaRecordingComplete}
              showSpeakerType={true}
            />
          </Card>
        </TabsContent>

        <TabsContent value="french" className="space-y-6 pt-4">
          <Card className="p-6">
            {isFrenchSTTSupported ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {isListening && (
                    <div className="absolute inset-0 -m-2 rounded-full animate-ping bg-primary/30" />
                  )}
                  <Button
                    size="lg"
                    variant={isListening ? "default" : "outline"}
                    className="w-20 h-20 rounded-full"
                    onClick={handleFrenchListening}
                  >
                    {isListening ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {isListening ? 'Écoute en cours... Parlez maintenant' : 'Appuyez pour parler en Français'}
                </p>

                {/* Interim transcript */}
                {interimTranscript && (
                  <div className="text-sm text-muted-foreground italic">
                    {interimTranscript}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>La reconnaissance vocale n'est pas supportée par ce navigateur.</p>
                <p className="text-sm">Utilisez Chrome ou Edge pour cette fonctionnalité.</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transcription Result */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            <span className="font-medium">Transcription</span>
          </div>
          <Badge variant="secondary">
            {language === 'bariba' ? 'Bààtɔ̀nú' : 'Français'}
          </Badge>
        </div>

        <Textarea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder={isLoading ? "Transcription en cours..." : "Le texte transcrit apparaîtra ici..."}
          className={`min-h-24 ${language === 'bariba' ? 'bariba-text' : ''}`}
          disabled={isLoading}
        />

        {/* Audio Playback */}
        {lastAudioBase64 && language === 'bariba' && (
          <AudioPlayer
            audioBase64={lastAudioBase64}
            title="Dernier enregistrement"
            compact={true}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!transcription}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copier
          </Button>
          
          {onTranslate && (
            <Button
              size="sm"
              onClick={handleTranslate}
              disabled={!transcription}
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Traduire
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
