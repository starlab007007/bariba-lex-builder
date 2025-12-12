import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, Copy, Volume2, Brain, Zap, Languages, Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useHybridTranslation } from "@/hooks/useHybridTranslation";
import { useTranslationCache } from "@/hooks/useTranslationCache";
import { useGamification } from "@/hooks/useGamification";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBaribaSTTWithFallback } from "@/hooks/useBaribaSTTWithFallback";
import { useFrenchSTT } from "@/hooks/useFrenchSTT";
import { useBaribaTTSWithFallback } from "@/hooks/useBaribaTTSWithFallback";
import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import TranslationFeedback from "./TranslationFeedback";
import { TranslationSuggestions } from "./TranslationSuggestions";
import { ModelHealthBadge } from "./ModelHealthBadge";
import { ServiceStatusIndicator } from "./ServiceStatusIndicator";
import { TranslationModelSwitcher, type TranslationModel } from "./TranslationModelSwitcher";

type TranslationDirection = "french-to-bariba" | "bariba-to-french";

export const PhraseTranslator = () => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translationLogId, setTranslationLogId] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<TranslationDirection>("french-to-bariba");
  const [isTranslating, setIsTranslating] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [usedCache, setUsedCache] = useState(false);
  const [phraseSuggestions, setPhraseSuggestions] = useState<string[]>([]);
  const [detectedLang, setDetectedLang] = useState<'french' | 'bariba' | 'mixed'>('mixed');
  const [usedMethod, setUsedMethod] = useState<string>('');
  const [translationConfidence, setTranslationConfidence] = useState<number>(0);
  const [translationDuration, setTranslationDuration] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<TranslationModel>('byt5-expert');
  const { toast } = useToast();
  const { updateAchievement } = useGamification();
  
  // Hooks audio avec fallback
  const { startRecording, stopRecording, isRecording, audioBlob } = useAudioRecorder();
  const { transcribe: transcribeBariba, isTranscribing: isTranscribingBariba, serviceAvailable: baribaSTTAvailable } = useBaribaSTTWithFallback();
  const { startListening, stopListening, isListening, transcript: frenchTranscript } = useFrenchSTT();
  const { speak: speakBariba, isSpeaking: isSpeakingBariba, serviceAvailable: baribaTTSAvailable, usedFallback: baribaTTSUsedFallback } = useBaribaTTSWithFallback();
  const { speak: speakFrench, isSpeaking: isSpeakingFrench } = useFrenchTTS();
  
  // Hook pour le traducteur hybride
  const {
    translateFrenchToBariba,
    translateBaribaToFrench,
    translateIntelligent,
    getSuggestions,
    detectLanguage,
    isLoading: aiLoading,
    isInitialized: aiReady,
    error: aiError,
    getStats
  } = useHybridTranslation();

  // Stats du modèle
  const modelStats = aiReady ? getStats() : null;

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

  // Détecter automatiquement la langue et ajuster la direction
  useEffect(() => {
    if (!sourceText.trim() || !aiReady) {
      setDetectedLang('mixed');
      return;
    }

    const lang = detectLanguage(sourceText);
    setDetectedLang(lang);

    if (lang === 'french' && direction !== 'french-to-bariba') {
      setDirection('french-to-bariba');
    } else if (lang === 'bariba' && direction !== 'bariba-to-french') {
      setDirection('bariba-to-french');
    }
  }, [sourceText, aiReady, detectLanguage]);

  // Traduction automatique en temps réel
  useEffect(() => {
    if (!autoTranslate || !sourceText.trim() || !aiReady || isTranslating) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsTranslating(true);
        let result;
        
        if (direction === "french-to-bariba") {
          result = await translateFrenchToBariba(sourceText);
        } else {
          result = await translateBaribaToFrench(sourceText);
        }
        
        setTranslatedText(result.translation);
        await updateAchievement('translations_made');
      } catch (error) {
        console.error("Erreur de traduction automatique:", error);
        toast({
          title: "Erreur de traduction",
          description: "Impossible de traduire automatiquement. Essayez manuellement.",
          variant: "destructive"
        });
      } finally {
        setIsTranslating(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [sourceText, direction, autoTranslate, aiReady, translateFrenchToBariba, translateBaribaToFrench, isTranslating]);

  const translatePhrase = async () => {
    if (!sourceText.trim()) {
      toast({
        title: "Texte requis",
        description: "Veuillez saisir un texte à traduire.",
        variant: "destructive"
      });
      return;
    }

    if (useAI && !aiReady) {
      toast({
        title: "Modèle en cours d'initialisation",
        description: "Veuillez patienter pendant l'initialisation du modèle IA...",
        variant: "destructive"
      });
      return;
    }

    setIsTranslating(true);
    const startTime = performance.now();
    
    try {
      let translation = "";
      const sourceLang = direction === "french-to-bariba" ? 'french' : 'bariba';
      const targetLang = direction === "french-to-bariba" ? 'bariba' : 'french';
      
      // 1. Vérifier d'abord le cache
      const cached = await getCachedTranslation(sourceText, sourceLang, targetLang);
      if (cached) {
        translation = cached.target_text;
        setUsedCache(true);
        
        const duration = Math.round(performance.now() - startTime);
        toast({
          title: "⚡ Traduction instantanée (Cache)",
          description: `Traduction trouvée dans le cache (${duration}ms). Utilisée ${cached.usage_count} fois.`
        });
      }
      // 2. Sinon, utiliser le modèle local AI (gratuit)
      else if (useAI && aiReady) {
        setUsedCache(false);
        
        let result;
        try {
          if (direction === "french-to-bariba") {
            result = await translateFrenchToBariba(sourceText, { preferredModel: selectedModel });
          } else {
            result = await translateBaribaToFrench(sourceText, { preferredModel: selectedModel });
          }
        } catch (translationError) {
          // If ByT5 was selected and failed, fallback to SimplifiedAI
          if (selectedModel === 'byt5-expert') {
            console.warn('ByT5 failed, falling back to SimplifiedAI...');
            toast({
              title: "⚠️ ByT5 Expert indisponible",
              description: "Basculement vers SimplifiedAI...",
            });
            
            if (direction === "french-to-bariba") {
              result = await translateFrenchToBariba(sourceText, { preferredModel: 'simplified' });
            } else {
              result = await translateBaribaToFrench(sourceText, { preferredModel: 'simplified' });
            }
            
            // Auto-switch selected model for future translations
            setSelectedModel('simplified');
          } else {
            throw translationError;
          }
        }
        
        translation = result.translation;
        
        // Enregistrer les métriques pour affichage
        setUsedMethod(result.method);
        setTranslationConfidence(result.confidence);
        setTranslationDuration(result.duration);
        
        // Sauvegarder dans le cache
        await cacheTranslation(sourceText, translation, sourceLang, targetLang, result.confidence);
        
        // Display appropriate toast based on method used
        if (result.method === 'byt5-expert') {
          toast({
            title: `🤖 ByT5 Expert`,
            description: `Traduction en ${result.duration}ms (${result.confidence}% confiance)`
          });
        } else if (result.method === 'simplified-ai' && selectedModel === 'byt5-expert') {
          toast({
            title: `⚡ SimplifiedAI (fallback)`,
            description: `ByT5 indisponible. Traduction en ${result.duration}ms.`
          });
        } else {
          toast({
            title: `🧠 Traduction ${result.method.toUpperCase()}`,
            description: `En ${result.duration}ms avec ${result.confidence}% de confiance.`
          });
        }
      } else {
        // Fallback: traduction de démonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (direction === "french-to-bariba") {
          const demoTranslations: Record<string, string> = {
            "bonjour": "aagu",
            "comment allez-vous": "foo ka bani",
            "merci": "gando",
            "au revoir": "ka su gbenma",
            "je vais bien": "n de bani gandi",
            "comment vous appelez-vous": "sunbu ka be",
            "je m'appelle": "n sunbu bee"
          };
          
          const lowerText = sourceText.toLowerCase();
          translation = demoTranslations[lowerText] || 
            `[Traduction en Bààtɔ̀nú pour: "${sourceText}"]`;
        } else {
          const demoTranslations: Record<string, string> = {
            "aagu": "bonjour / salut",
            "foo ka bani": "comment allez-vous",
            "gando": "merci",
            "ka su gbenma": "au revoir",
            "n de bani gandi": "je vais bien",
            "sunbu ka be": "comment vous appelez-vous",
            "n sunbu bee": "je m'appelle"
          };
          
          const lowerText = sourceText.toLowerCase();
          translation = demoTranslations[lowerText] || 
            `[Traduction en français pour: "${sourceText}"]`;
        }
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
      setIsTranslating(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground font-sans">
          Traducteur <span className="bariba-text">Bààtɔ̀nú</span>
        </h2>
        <p className="text-muted-foreground">
          Traduction de phrases complètes basée sur le dictionnaire
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
        {aiError && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {aiError}
          </div>
        )}
        
        {/* Chargement */}
        {aiLoading && (
          <div className="text-sm text-muted-foreground">
            Initialisation en cours...
          </div>
        )}
      </div>

      {/* Model Selector */}
      <div className="flex justify-center">
        <TranslationModelSwitcher
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={isTranslating || aiLoading}
        />
      </div>

      {/* Direction Controls - Responsive */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        <Button
          variant={direction === "french-to-bariba" ? "default" : "outline"}
          size="sm"
          onClick={() => setDirection("french-to-bariba")}
          disabled={isTranslating}
          className="text-xs sm:text-sm"
        >
          Français → <span className="bariba-text ml-1">Bààtɔ̀nú</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={swapLanguages}
          className="p-2"
          disabled={isTranslating}
          title="Inverser les langues"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          variant={direction === "bariba-to-french" ? "default" : "outline"}
          size="sm"
          onClick={() => setDirection("bariba-to-french")}
          disabled={isTranslating}
        >
          <span className="bariba-text mr-1">Bààtɔ̀nú</span> → Français
        </Button>
        
        {/* Détection automatique de la langue */}
        {detectedLang !== 'mixed' && sourceText.trim() && (
          <Badge variant="secondary" className="text-xs">
            <Languages className="h-3 w-3 mr-1" />
            Détecté: {detectedLang === 'french' ? 'Français' : 'Bààtɔ̀nú'}
          </Badge>
        )}
        
        {/* Toggle Traduction Automatique */}
        <Button
          variant={autoTranslate ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoTranslate(!autoTranslate)}
          disabled={isTranslating || aiLoading || !aiReady}
          className="flex items-center gap-2"
          title="Activer/désactiver la traduction automatique"
        >
          <ArrowRight className="h-3 w-3" />
          {autoTranslate ? "Auto" : "Manuel"}
        </Button>
      </div>

      {/* Suggestions de phrases */}
      {phraseSuggestions.length > 0 && (
        <Card className="p-4 bg-accent/5">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Suggestions de phrases
            </h4>
            <div className="flex flex-wrap gap-2">
              {phraseSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSourceText(suggestion);
                  }}
                  className="text-xs px-3 py-2 bg-background hover:bg-primary/10 border border-border rounded-lg transition-colors text-foreground hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Translation Interface */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Source Text */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {direction === "french-to-bariba" ? "Français" : "Bààtɔ̀nú"}
            </h3>
            <Badge variant="outline" className="text-xs">
              Source
            </Badge>
          </div>
          <div className="relative">
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={
                direction === "french-to-bariba"
                  ? "Entrez votre texte en français..."
                  : "Saisissez votre texte en bariba..."
              }
              className="min-h-[120px] resize-none"
              disabled={isTranslating}
            />
            {/* Voice Input Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRecording}
              disabled={isTranslating || isTranscribingBariba}
              className={`absolute bottom-2 right-2 ${isVoiceActive ? 'text-red-500 animate-pulse' : ''}`}
              title={isVoiceActive ? "Arrêter l'enregistrement" : "Dicter"}
            >
              {isVoiceActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {sourceText.length} caractères
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={!sourceText && !translatedText}
            >
              Effacer
            </Button>
          </div>
        </Card>

        {/* Translated Text */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {direction === "french-to-bariba" ? "Bààtɔ̀nú" : "Français"}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {usedMethod && (
                <Badge 
                  variant={usedMethod === 'byt5-expert' ? 'default' : 'secondary'} 
                  className={`text-xs ${usedMethod === 'byt5-expert' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                  {usedMethod === 'byt5-expert' ? '🤖 ByT5 Expert' : 
                   usedMethod === 'simplified' ? '⚡ SimplifiedAI' :
                   usedMethod === 'idiom' ? '💡 Idiome' :
                   usedMethod === 'context' ? '🔄 Cache' :
                   usedMethod === 'advanced' ? '🚀 Advanced' :
                   usedMethod === 'ai' ? '☁️ Lovable AI' :
                   usedMethod}
                </Badge>
              )}
              {translationConfidence > 0 && (
                <Badge variant={translationConfidence >= 80 ? "default" : translationConfidence >= 60 ? "secondary" : "outline"} className="text-xs">
                  {translationConfidence}%
                </Badge>
              )}
              {translationDuration > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {translationDuration}ms
                </Badge>
              )}
            </div>
          </div>
          <div className="relative">
            <Textarea
              value={translatedText}
              readOnly
              placeholder="La traduction apparaîtra ici..."
              className="min-h-[120px] resize-none bg-muted/50"
            />
            {translatedText && (
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={speakTranslation}
                  disabled={isSpeakingBariba || isSpeakingFrench}
                  title="Écouter"
                >
                  {(isSpeakingBariba || isSpeakingFrench) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(translatedText)}
                  title="Copier"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {translatedText.length} caractères
              {usedCache && " • Cache"}
            </span>
            {usedMethod && (
              <ModelHealthBadge modelId={usedMethod as any} confidence={translationConfidence} duration={translationDuration} />
            )}
          </div>
        </Card>
      </div>

      {/* Translate Button */}
      <div className="flex justify-center">
        <Button
          onClick={translatePhrase}
          disabled={isTranslating || !sourceText.trim() || (useAI && !aiReady)}
          size="lg"
          className="min-w-[200px]"
        >
          {isTranslating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traduction...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Traduire
            </>
          )}
        </Button>
      </div>

      {/* Translation Suggestions */}
      {translatedText && translationLogId && (
        <TranslationSuggestions
          sourceText={sourceText}
          translatedText={translatedText}
          translationLogId={translationLogId}
        />
      )}

      {/* Feedback Section */}
      {translatedText && translationLogId && (
        <TranslationFeedback
          translationLogId={translationLogId}
        />
      )}
    </div>
  );
};
