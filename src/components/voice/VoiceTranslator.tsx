import { useState } from 'react';
import { ArrowRight, Mic, Volume2, RotateCcw, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartVoiceRecorder } from './SmartVoiceRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useSimpleTranslation } from '@/hooks/useSimpleTranslation';
import { useToast } from '@/hooks/use-toast';

type Direction = 'bariba-to-french' | 'french-to-bariba';

export const VoiceTranslator = () => {
  const [direction, setDirection] = useState<Direction>('bariba-to-french');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba } = useBaribaSTT();
  const { startListening, stopListening, isListening, transcript: frenchTranscript } = useFrenchSTT();
  const { speak: speakBariba, isSpeaking: isSpeakingBariba, isLoading: isLoadingBariba } = useBaribaTTS();
  const { speak: speakFrench, isSpeaking: isSpeakingFrench } = useFrenchTTS();
  const { translateFrenchToBariba, translateBaribaToFrench, isInitialized } = useSimpleTranslation();
  const { toast } = useToast();

  const isSourceBariba = direction === 'bariba-to-french';
  const isSpeakingTranslation = isSourceBariba ? isSpeakingFrench : isSpeakingBariba;

  const handleBaribaRecordingComplete = async (audioBase64: string) => {
    const result = await transcribeBariba(audioBase64);
    if (result) {
      setSourceText(result.transcription);
      await performTranslation(result.transcription, 'bariba-to-french');
    }
  };

  const handleFrenchListening = async () => {
    if (isListening) {
      stopListening();
      if (frenchTranscript) {
        setSourceText(frenchTranscript);
        await performTranslation(frenchTranscript, 'french-to-bariba');
      }
    } else {
      setSourceText('');
      setTranslatedText('');
      startListening();
    }
  };

  const performTranslation = async (text: string, dir: Direction) => {
    if (!text.trim() || !isInitialized) return;

    setIsTranslating(true);
    try {
      let result;
      if (dir === 'french-to-bariba') {
        result = await translateFrenchToBariba(text);
      } else {
        result = await translateBaribaToFrench(text);
      }

      if (result) {
        setTranslatedText(result.translation);
        
        toast({
          title: "✅ Traduction terminée",
          description: `Confiance: ${result.confidence}% - Méthode: ${result.method}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur de traduction",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeakTranslation = () => {
    if (!translatedText) return;
    
    if (isSourceBariba) {
      // Translated text is French
      speakFrench(translatedText);
    } else {
      // Translated text is Bariba
      speakBariba(translatedText);
    }
  };

  const swapDirection = () => {
    setDirection(prev => prev === 'bariba-to-french' ? 'french-to-bariba' : 'bariba-to-french');
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const reset = () => {
    setSourceText('');
    setTranslatedText('');
  };

  const isProcessing = isTranscribingBariba || isListening || isTranslating;

  return (
    <div className="space-y-6">
      {/* Direction Controls */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button
          variant={isSourceBariba ? "default" : "outline"}
          size="sm"
          onClick={() => setDirection('bariba-to-french')}
          disabled={isProcessing}
        >
          <Mic className="h-4 w-4 mr-1" />
          <span className="bariba-text">Bààtɔ̀nú</span>
          <ArrowRight className="h-4 w-4 mx-1" />
          Français
        </Button>

        <Button variant="ghost" size="sm" onClick={swapDirection} disabled={isProcessing}>
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          variant={!isSourceBariba ? "default" : "outline"}
          size="sm"
          onClick={() => setDirection('french-to-bariba')}
          disabled={isProcessing}
        >
          <Mic className="h-4 w-4 mr-1" />
          Français
          <ArrowRight className="h-4 w-4 mx-1" />
          <span className="bariba-text">Bààtɔ̀nú</span>
        </Button>
      </div>

      {/* Recording Section */}
      <Card className="p-6">
        {isSourceBariba ? (
          <SmartVoiceRecorder
            language="bariba"
            onRecordingComplete={handleBaribaRecordingComplete}
            disabled={isProcessing}
          />
        ) : (
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
                disabled={isTranscribingBariba || isTranslating}
              >
                {isListening ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isListening ? 'Écoute en cours...' : 'Appuyez pour parler en Français'}
            </p>
          </div>
        )}
      </Card>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Source */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {isSourceBariba ? 'Bààtɔ̀nú' : 'Français'}
            </Badge>
            <span className="text-xs text-muted-foreground">Source</span>
          </div>
          <div className={`min-h-20 p-3 bg-muted/30 rounded-md ${isSourceBariba ? 'bariba-text' : ''}`}>
            {sourceText || (
              <span className="text-muted-foreground text-sm">
                Le texte transcrit apparaîtra ici...
              </span>
            )}
          </div>
        </Card>

        {/* Translation */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {isSourceBariba ? 'Français' : 'Bààtɔ̀nú'}
            </Badge>
            <span className="text-xs text-muted-foreground">Traduction</span>
          </div>
          <div className={`min-h-20 p-3 bg-muted/30 rounded-md ${!isSourceBariba ? 'bariba-text' : ''}`}>
            {isTranslating ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Traduction en cours...</span>
              </div>
            ) : translatedText ? (
              translatedText
            ) : (
              <span className="text-muted-foreground text-sm">
                La traduction apparaîtra ici...
              </span>
            )}
          </div>

          {/* Speak Translation Button */}
          {translatedText && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSpeakTranslation}
              disabled={isSpeakingTranslation || isLoadingBariba}
              className="w-full"
            >
              {isLoadingBariba ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4 mr-2" />
              )}
              {isSpeakingTranslation ? 'Lecture...' : 'Écouter la traduction'}
            </Button>
          )}
        </Card>
      </div>

      {/* Reset */}
      {(sourceText || translatedText) && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Nouvelle traduction
          </Button>
        </div>
      )}
    </div>
  );
};
