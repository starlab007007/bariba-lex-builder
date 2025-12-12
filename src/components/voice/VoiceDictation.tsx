import { useState } from 'react';
import { Mic, Languages, Copy, ArrowRight, Volume2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceRecorder } from './VoiceRecorder';
import { AudioPlayer } from './AudioPlayer';
import { useBaribaSTT, SpeakerType } from '@/hooks/useBaribaSTT';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { useToast } from '@/hooks/use-toast';

interface VoiceDictationProps {
  onTranslate?: (text: string, language: 'bariba' | 'french') => void;
}

export const VoiceDictation = ({ onTranslate }: VoiceDictationProps) => {
  const [language, setLanguage] = useState<'bariba' | 'french'>('bariba');
  const [transcription, setTranscription] = useState('');
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);
  
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba } = useBaribaSTT();
  const { 
    startListening, 
    stopListening, 
    isListening, 
    transcript: frenchTranscript,
    interimTranscript,
    isSupported: isFrenchSTTSupported 
  } = useFrenchSTT();
  const { toast } = useToast();

  const handleBaribaRecordingComplete = async (audioBase64: string) => {
    setLastAudioBase64(audioBase64);
    const result = await transcribeBariba(audioBase64);
    if (result) {
      setTranscription(result.transcription);
    }
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
          <Card className="p-6">
            <VoiceRecorder
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
