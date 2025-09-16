import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, Copy, Volume2, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslationAI } from "@/hooks/useTranslationAI";

type TranslationDirection = "french-to-bariba" | "bariba-to-french";

export const PhraseTranslator = () => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [direction, setDirection] = useState<TranslationDirection>("french-to-bariba");
  const [isTranslating, setIsTranslating] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const { toast } = useToast();
  
  // Hook pour le modèle IA
  const {
    translateFrenchToBariba,
    translateBaribaToFrench,
    translateIntelligent,
    isLoading: aiLoading,
    isInitialized: aiReady,
    error: aiError,
    modelStats
  } = useTranslationAI();

  // Traduction automatique en temps réel
  useEffect(() => {
    if (!autoTranslate || !sourceText.trim() || !aiReady || isTranslating) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsTranslating(true);
        let translation = "";
        
        if (direction === "french-to-bariba") {
          translation = await translateFrenchToBariba(sourceText);
        } else {
          translation = await translateBaribaToFrench(sourceText);
        }
        
        setTranslatedText(translation);
      } catch (error) {
        console.error("Erreur de traduction automatique:", error);
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
    
    try {
      let translation = "";
      
      if (useAI && aiReady) {
        // Utiliser le modèle IA entraîné sur le dictionnaire
        if (direction === "french-to-bariba") {
          translation = await translateFrenchToBariba(sourceText);
        } else {
          translation = await translateBaribaToFrench(sourceText);
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
      
      toast({
        title: useAI ? "Traduction IA terminée" : "Traduction terminée",
        description: useAI ? "Votre texte a été traduit par l'IA entraînée sur le dictionnaire." : "Votre texte a été traduit avec succès."
      });
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
          Traducteur IA <span className="bariba-text">Bààtɔ̀nú</span>
        </h2>
        <p className="text-muted-foreground">
          Traduisez des phrases complètes avec l'IA entraînée sur le dictionnaire <span className="bariba-text">Bààtɔ̀nú</span>
        </p>
        
        {/* Statut IA */}
        <div className="flex items-center justify-center gap-4">
          <Badge variant={aiReady ? "default" : aiLoading ? "secondary" : "destructive"} className="text-sm">
            <Brain className="h-3 w-3 mr-1" />
            {aiLoading ? "Initialisation IA..." : aiReady ? "IA Prête" : "IA Indisponible"}
          </Badge>
          
          {modelStats && (
            <Badge variant="outline" className="text-xs">
              Modèle entraîné sur dictionnaire complet
            </Badge>
          )}
        </div>
        
        {aiError && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {aiError}
          </div>
        )}
      </div>

      {/* Direction Controls */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Badge variant={direction === "french-to-bariba" ? "default" : "outline"} className="text-sm">
          Français → <span className="bariba-text">Bààtɔ̀nú</span>
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={swapLanguages}
          className="p-2"
          disabled={isTranslating}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Badge variant={direction === "bariba-to-french" ? "default" : "outline"} className="text-sm">
          <span className="bariba-text">Bààtɔ̀nú</span> → Français
        </Badge>
        
        {/* Toggle IA */}
        <Button
          variant={useAI ? "default" : "outline"}
          size="sm"
          onClick={() => setUseAI(!useAI)}
          disabled={isTranslating || aiLoading}
          className="flex items-center gap-2"
        >
          {useAI ? <Zap className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
          {useAI ? "IA Activée" : "Mode Simple"}
        </Button>
        
        {/* Toggle Traduction Automatique */}
        <Button
          variant={autoTranslate ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoTranslate(!autoTranslate)}
          disabled={isTranslating || aiLoading || !aiReady}
          className="flex items-center gap-2"
        >
          <ArrowRight className="h-3 w-3" />
          {autoTranslate ? "Auto" : "Manuel"}
        </Button>
      </div>

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
          
          <Textarea
            placeholder={
              direction === "french-to-bariba"
                ? "Saisissez votre texte en français..."
                : "Saisissez votre texte en Bààtɔ̀nú..."
            }
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className={`min-h-32 resize-none ${direction === "bariba-to-french" ? "bariba-text" : ""}`}
            disabled={isTranslating}
          />
          
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {direction === "french-to-bariba" ? "Bààtɔ̀nú" : "Français"}
            </h3>
            <Badge variant="secondary" className="text-xs">
              Traduction
            </Badge>
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
          disabled={!sourceText.trim() || isTranslating || (useAI && !aiReady)}
          className="px-8"
        >
          {isTranslating ? (
            <>
              <Brain className="mr-2 h-4 w-4 animate-pulse" />
              {useAI ? "Traduction IA..." : "Traduction..."}
            </>
          ) : (
            <>
              {useAI ? <Zap className="mr-2 h-4 w-4" /> : <Brain className="mr-2 h-4 w-4" />}
              Traduire {useAI ? "(IA)" : ""}
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

      {/* Examples */}
      <Card className="p-4 bg-gradient-to-br from-accent/5 to-primary/5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-foreground font-sans">
            Exemples de phrases {useAI ? "(Testez l'IA)" : ""}
          </h4>
          {useAI && aiReady && (
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              IA Entraînée
            </Badge>
          )}
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