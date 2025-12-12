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

type TranslationDirection = "french-to-bariba" | "bariba-to-french";

interface PhraseTranslatorProps {
  selectedModel?: string;
}

export const PhraseTranslator = ({ selectedModel = 'auto' }: PhraseTranslatorProps) => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translationLogId, setTranslationLogId] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<TranslationDirection>("french-to-bariba");
  const [isTranslating, setIsTranslating] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false); // Mode manuel par défaut
  const [usedCache, setUsedCache] = useState(false);
  const [phraseSuggestions, setPhraseSuggestions] = useState<string[]>([]);
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
      // Convert blob to base64
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
      // Use Bariba STT (via Edge Function)
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      // Use French STT (Web Speech API)
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
        // Translation is in Bariba
        await speakBariba(translatedText);
      } else {
        // Translation is in French
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


  // DÉSACTIVÉ: Plus de suggestions de phrases automatiques pendant la saisie
  // Les utilisateurs veulent des corrections orthographiques, pas des suggestions de phrases

  // Détecter automatiquement la langue et ajuster la direction
  useEffect(() => {
    if (!sourceText.trim() || !aiReady) {
      setDetectedLang('mixed');
      return;
    }

    const lang = detectLanguage(sourceText);
    setDetectedLang(lang);

    // Ajuster automatiquement la direction en fonction de la langue détectée
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
        
        // Update gamification achievements
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
    }, 1000); // Délai de 1 seconde après l'arrêt de la saisie

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
        if (direction === "french-to-bariba") {
          result = await translateFrenchToBariba(sourceText);
        } else {
          result = await translateBaribaToFrench(sourceText);
        }
        
        translation = result.translation;
        const duration = Math.round(performance.now() - startTime);
        
        // Enregistrer les métriques pour affichage
        setUsedMethod(result.method);
        setTranslationConfidence(result.confidence);
        setTranslationDuration(result.duration);
        
        // Sauvegarder dans le cache
        await cacheTranslation(sourceText, translation, sourceLang, targetLang, result.confidence);
        
        toast({
          title: `🧠 Traduction ${result.method.toUpperCase()}`,
          description: `Traduction effectuée en ${result.duration}ms avec ${result.confidence}% de confiance.`
        });
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
      
      // Update gamification achievements
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
              placeholder={
                direction === "french-to-bariba"
                  ? "Saisissez votre texte en français..."
                  : "Saisissez votre texte en Bààtɔ̀nú..."
              }
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className={`min-h-32 resize-none pr-12 ${direction === "bariba-to-french" ? "bariba-text" : ""}`}
              disabled={isTranslating || isVoiceActive}
            />
            {/* Microphone Button */}
            <Button
              variant={isVoiceActive ? "default" : "ghost"}
              size="sm"
              className={`absolute right-2 top-2 ${isVoiceActive ? 'animate-pulse bg-destructive hover:bg-destructive/90' : ''}`}
              onClick={toggleRecording}
              disabled={isTranslating}
              title={isVoiceActive ? "Arrêter l'enregistrement" : "Parler"}
            >
              {isVoiceActive ? (
                <MicOff className="h-4 w-4" />
              ) : isTranscribingBariba ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{sourceText.length} caractères</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(sourceText)}
                disabled={!sourceText || isTranslating}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Translated Text */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-foreground">
              {direction === "french-to-bariba" ? "Bààtɔ̀nú" : "Français"}
            </h3>
            <div className="flex items-center gap-2">
              {usedMethod && translatedText && (
                <ModelHealthBadge 
                  modelId={usedMethod as any} 
                  confidence={translationConfidence}
                  duration={translationDuration}
                />
              )}
              <Badge variant="secondary" className="text-xs">
                Traduction
              </Badge>
            </div>
          </div>
          
          <div className={`min-h-32 p-3 bg-muted/30 rounded-md border-2 border-dashed border-border ${
            translatedText ? 'border-solid bg-background' : ''
          }`}>
            {isTranslating ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground text-sm">
                  Traduction en cours...
                </div>
              </div>
            ) : translatedText ? (
              <p className={`text-foreground ${direction === "french-to-bariba" ? "bariba-text" : ""}`}>
                {translatedText}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                La traduction apparaîtra ici...
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{translatedText.length} caractères</span>
            <div className="flex gap-2">
              {/* Play Button for TTS */}
              <Button
                variant="ghost"
                size="sm"
                onClick={speakTranslation}
                disabled={!translatedText || isTranslating || isSpeakingBariba || isSpeakingFrench}
                title="Écouter la traduction"
              >
                {isSpeakingBariba || isSpeakingFrench ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(translatedText)}
                disabled={!translatedText || isTranslating}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={translatePhrase}
          disabled={!sourceText.trim() || isTranslating || (useAI && !aiReady) || isCacheLoading}
          className="px-8"
        >
          {isTranslating || isCacheLoading ? (
            <>
              <Brain className="mr-2 h-4 w-4 animate-pulse" />
              {isCacheLoading ? "Recherche..." : "Traduction..."}
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Traduire
              {direction === "french-to-bariba" ? (
                <ArrowRight className="ml-2 h-4 w-4" />
              ) : (
                <ArrowLeft className="ml-2 h-4 w-4" />
              )}
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={clearAll}
          disabled={isTranslating}
        >
          Effacer tout
        </Button>
      </div>

      {/* Translation Suggestions - Système d'amélioration communautaire */}
      {translatedText && (
        <TranslationSuggestions
          sourceText={sourceText}
          translatedText={translatedText}
          translationLogId={translationLogId}
          onSuggestionSubmitted={() => {
            toast({
              title: "🎉 Contribution enregistrée",
              description: "Merci d'aider à améliorer le traducteur Bààtɔ̀nú !"
            });
          }}
        />
      )}

      {/* Cache indicator */}
      {usedCache && translatedText && (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs">
            ⚡ Traduction issue du cache (instantanée)
          </Badge>
        </div>
      )}

      {/* Examples */}
      <Card className="p-4 bg-gradient-to-br from-accent/5 to-primary/5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-foreground font-sans">
            Exemples de phrases
          </h4>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">Français → Bààtɔ̀nú</h5>
            <div className="space-y-1 text-sm">
              <button 
                className="block text-left hover:text-primary transition-colors cursor-pointer"
                onClick={() => {
                  setDirection("french-to-bariba");
                  setSourceText("Bonjour, comment allez-vous ?");
                  setTranslatedText("");
                }}
              >
                "Bonjour, comment allez-vous ?"
              </button>
              <button 
                className="block text-left hover:text-primary transition-colors cursor-pointer"
                onClick={() => {
                  setDirection("french-to-bariba");
                  setSourceText("Je vais bien, merci");
                  setTranslatedText("");
                }}
              >
                "Je vais bien, merci"
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">Bààtɔ̀nú → Français</h5>
            <div className="space-y-1 text-sm">
              <button 
                className="block text-left hover:text-primary transition-colors cursor-pointer bariba-text"
                onClick={() => {
                  setDirection("bariba-to-french");
                  setSourceText("Aagu, foo ka bani");
                  setTranslatedText("");
                }}
              >
                "Aagu, foo ka bani"
              </button>
              <button 
                className="block text-left hover:text-primary transition-colors cursor-pointer bariba-text"
                onClick={() => {
                  setDirection("bariba-to-french");
                  setSourceText("N de bani gandi, gando");
                  setTranslatedText("");
                }}
              >
                "N de bani gandi, gando"
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};