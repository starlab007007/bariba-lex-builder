import { useState, useEffect } from "react";
import { RotateCcw, Copy, Volume2, Languages, Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSimpleTranslation } from "@/hooks/useSimpleTranslation";
import { useTranslationCache } from "@/hooks/useTranslationCache";
import { useGamification } from "@/hooks/useGamification";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBaribaSTTWithFallback } from "@/hooks/useBaribaSTTWithFallback";
import { useFrenchSTT } from "@/hooks/useFrenchSTT";
import { useBaribaTTSWithFallback } from "@/hooks/useBaribaTTSWithFallback";
import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import TranslationFeedback from "./TranslationFeedback";
import { ServiceStatusIndicator } from "./ServiceStatusIndicator";

type TranslationDirection = "french-to-bariba" | "bariba-to-french";

export const PhraseTranslator = () => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translationLogId, setTranslationLogId] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<TranslationDirection>("french-to-bariba");
  const [isTranslatingLocal, setIsTranslatingLocal] = useState(false);
  const [usedCache, setUsedCache] = useState(false);
  const [detectedLang, setDetectedLang] = useState<'french' | 'bariba' | 'mixed'>('mixed');
  const [usedMethod, setUsedMethod] = useState<string>('');
  const [translationConfidence, setTranslationConfidence] = useState<number>(0);
  const [translationDuration, setTranslationDuration] = useState<number>(0);
  const { toast } = useToast();
  const { updateAchievement } = useGamification();
  
  // Hooks audio avec fallback
  const { startRecording, stopRecording, isRecording, audioBlob } = useAudioRecorder();
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba, serviceAvailable: baribaSTTAvailable } = useBaribaSTTWithFallback();
  const { startListening, stopListening, isListening, transcript: frenchTranscript } = useFrenchSTT();
  const { speak: speakBariba, isSpeaking: isSpeakingBariba, serviceAvailable: baribaTTSAvailable, usedFallback: baribaTTSUsedFallback } = useBaribaTTSWithFallback();
  const { speak: speakFrench, isSpeaking: isSpeakingFrench } = useFrenchTTS();
  
  // Hook pour le traducteur simple (ByT5 + fallback)
  const {
    translateFrenchToBariba,
    translateBaribaToFrench,
    detectLanguage,
    isTranslating,
    isInitialized,
    error: translationError
  } = useSimpleTranslation();

  // Hook pour le cache de traductions
  const { 
    getCachedTranslation, 
    cacheTranslation, 
    isCacheLoading 
  } = useTranslationCache();

  // Handle audio recording completion for Bariba
  useEffect(() => {
    if (audioBlob && !isRecording && direction === 'bariba-to-french') {
      handleBaribaVoiceInput();
    }
  }, [audioBlob, isRecording]);

  // Handle French transcript update
  useEffect(() => {
    if (frenchTranscript && direction === 'french-to-bariba') {
      setSourceText(frenchTranscript);
    }
  }, [frenchTranscript]);

  const handleBaribaVoiceInput = async () => {
    if (!audioBlob) return;
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const result = await transcribeBariba(base64Audio);
        
        if (result && result.transcription) {
          setSourceText(result.transcription);
          toast({
            title: "🎤 Transcription réussie",
            description: `Texte reconnu: "${result.transcription.substring(0, 50)}${result.transcription.length > 50 ? '...' : ''}"`
          });
        }
      };
    } catch (error) {
      console.error('Voice input error:', error);
      toast({
        title: "Erreur de transcription",
        description: "Impossible de transcrire l'audio",
        variant: "destructive"
      });
    }
  };

  const toggleRecording = () => {
    if (direction === 'bariba-to-french') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  const isVoiceActive = isRecording || isListening || isTranscribingBariba;

  const speakTranslation = async () => {
    if (!translatedText) return;
    
    try {
      if (direction === 'french-to-bariba') {
        await speakBariba(translatedText);
      } else {
        await speakFrench(translatedText);
      }
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: "Erreur audio",
        description: "Impossible de lire la traduction",
        variant: "destructive"
      });
    }
  };

  // Détecter la langue pour affichage (badge) - ne change PAS la direction
  useEffect(() => {
    if (!sourceText.trim() || !isInitialized) {
      setDetectedLang('mixed');
      return;
    }
    setDetectedLang(detectLanguage(sourceText));
  }, [sourceText, isInitialized, detectLanguage]);

  const translatePhrase = async () => {
    if (!sourceText.trim()) {
      toast({
        title: "Texte requis",
        description: "Veuillez saisir un texte à traduire.",
        variant: "destructive"
      });
      return;
    }

    setIsTranslatingLocal(true);
    const textToTranslate = sourceText.trim();
    setSourceText("");
    const startTime = performance.now();
    
    try {
      let translation = "";
      const sourceLang = direction === "french-to-bariba" ? 'french' : 'bariba';
      const targetLang = direction === "french-to-bariba" ? 'bariba' : 'french';
      
      // 1. Vérifier d'abord le cache
      const cached = await getCachedTranslation(textToTranslate, sourceLang, targetLang);
      if (cached) {
        translation = cached.target_text;
        setUsedCache(true);
        
        const duration = Math.round(performance.now() - startTime);
        toast({
          title: "⚡ Traduction instantanée (Cache)",
          description: `Traduction trouvée dans le cache (${duration}ms). Utilisée ${cached.usage_count} fois.`
        });
      } else {
        // 2. Utiliser le traducteur simple (ByT5 + fallback)
        setUsedCache(false);
        
        let result;
        if (direction === "french-to-bariba") {
          result = await translateFrenchToBariba(textToTranslate);
        } else {
          result = await translateBaribaToFrench(textToTranslate);
        }
        
        translation = result.translation;
        
        // Enregistrer les métriques pour affichage
        setUsedMethod(result.method);
        setTranslationConfidence(result.confidence);
        setTranslationDuration(result.duration);
        
        // Sauvegarder dans le cache
        await cacheTranslation(textToTranslate, translation, sourceLang, targetLang, result.confidence);
        
        // Display toast based on method used
        toast({
          title: `🤖 ByT5 Expert`,
          description: `Traduction en ${result.duration}ms (${result.confidence}% confiance)`
        });
      }
      
      setTranslatedText(translation);
      await updateAchievement('translations_made');
    } catch (error) {
      console.error("Erreur de traduction:", error);
      toast({
        title: "Erreur de traduction",
        description: "Une erreur s'est produite lors de la traduction.",
        variant: "destructive"
      });
    } finally {
      setIsTranslatingLocal(false);
    }
  };

  const swapLanguages = () => {
    setDirection(prev => 
      prev === "french-to-bariba" ? "bariba-to-french" : "french-to-bariba"
    );
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié",
        description: "Texte copié dans le presse-papiers."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le texte.",
        variant: "destructive"
      });
    }
  };

  const clearAll = () => {
    setSourceText("");
    setTranslatedText("");
  };

  const isCurrentlyTranslating = isTranslatingLocal || isTranslating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground font-sans">
          Traducteur <span className="bariba-text">Bààtɔ̀nú</span>
        </h2>
        <p className="text-muted-foreground">
          Traduction de phrases avec ByT5 Expert
        </p>
        
        {/* Service Status Indicator */}
        <div className="flex justify-center">
          <ServiceStatusIndicator compact />
        </div>
        
        {/* Warning for unavailable Bariba audio services */}
        {(!baribaTTSAvailable || !baribaSTTAvailable) && (
          <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-3 py-2 rounded-md flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>
              Services audio Bariba indisponibles (HuggingFace Spaces en veille).
              {baribaTTSUsedFallback && " Fallback français utilisé."}
            </span>
          </div>
        )}
        
        {/* Message d'erreur seulement */}
        {translationError && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {translationError}
          </div>
        )}
      </div>

      {/* Direction Controls - Responsive */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        <Button
          variant={direction === "french-to-bariba" ? "default" : "outline"}
          size="sm"
          onClick={() => setDirection("french-to-bariba")}
          disabled={isCurrentlyTranslating}
          className="text-xs sm:text-sm"
        >
          Français → <span className="bariba-text ml-1">Bààtɔ̀nú</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={swapLanguages}
          className="p-2"
          disabled={isCurrentlyTranslating}
          title="Inverser les langues"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          variant={direction === "bariba-to-french" ? "default" : "outline"}
          size="sm"
          onClick={() => setDirection("bariba-to-french")}
          disabled={isCurrentlyTranslating}
        >
          <span className="bariba-text mr-1">Bààtɔ̀nú</span> → Français
        </Button>
        
      {/* Détection de langue (informatif uniquement) */}
        {detectedLang !== 'mixed' && sourceText.trim() && (
          <Badge 
            variant={
              (detectedLang === 'french' && direction === 'french-to-bariba') ||
              (detectedLang === 'bariba' && direction === 'bariba-to-french')
                ? 'secondary' 
                : 'destructive'
            } 
            className="text-xs cursor-pointer"
            onClick={() => {
              if (detectedLang === 'french' && direction !== 'french-to-bariba') {
                setDirection('french-to-bariba');
              } else if (detectedLang === 'bariba' && direction !== 'bariba-to-french') {
                setDirection('bariba-to-french');
              }
            }}
          >
            <Languages className="h-3 w-3 mr-1" />
            {detectedLang === 'french' ? 'Français détecté' : 'Bààtɔ̀nú détecté'}
            {((detectedLang === 'french' && direction !== 'french-to-bariba') ||
              (detectedLang === 'bariba' && direction !== 'bariba-to-french')) && 
              ' — cliquer pour corriger'}
          </Badge>
        )}
      </div>

      {/* Translation Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Source Text */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {direction === "french-to-bariba" ? "Français" : <span className="bariba-text">Bààtɔ̀nú</span>}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRecording}
                disabled={isCurrentlyTranslating}
                className={isVoiceActive ? "text-destructive" : ""}
              >
                {isVoiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              {sourceText && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={direction === "french-to-bariba" ? "Entrez le texte en français..." : "Entrez le texte en Bààtɔ̀nú..."}
            className={`min-h-32 ${direction === "bariba-to-french" ? "bariba-text" : ""}`}
            disabled={isCurrentlyTranslating}
          />
          <Button 
            onClick={translatePhrase} 
            disabled={!sourceText.trim() || isCurrentlyTranslating}
            className="w-full"
          >
            {isCurrentlyTranslating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traduction...
              </>
            ) : (
              "Traduire"
            )}
          </Button>
        </Card>

        {/* Translated Text */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {direction === "french-to-bariba" ? <span className="bariba-text">Bààtɔ̀nú</span> : "Français"}
            </Badge>
            <div className="flex gap-1">
              {translatedText && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(translatedText)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={speakTranslation}
                    disabled={isSpeakingBariba || isSpeakingFrench}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className={`min-h-32 p-3 bg-muted/30 rounded-md ${direction === "french-to-bariba" ? "bariba-text" : ""}`}>
            {isCurrentlyTranslating ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Traduction en cours...</span>
              </div>
            ) : translatedText ? (
              translatedText
            ) : (
              <span className="text-muted-foreground">La traduction apparaîtra ici...</span>
            )}
          </div>
          
          {/* Translation info */}
          {translatedText && !usedCache && usedMethod && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{usedMethod}</Badge>
              <Badge variant="outline">{translationConfidence}% confiance</Badge>
              <Badge variant="outline">{translationDuration}ms</Badge>
            </div>
          )}
          
          {translatedText && usedCache && (
            <Badge variant="outline" className="text-xs">⚡ Cache</Badge>
          )}
        </Card>
      </div>

      {/* Feedback */}
      {translatedText && translationLogId && (
        <TranslationFeedback translationLogId={translationLogId} />
      )}
    </div>
  );
};
