import { SimplifiedTranslationAI } from "@/services/SimplifiedTranslationAI";
import { loadComprehensiveDictionary } from "@/data/fullDictionaryData";
import { useState, useEffect, useCallback } from "react";

export const useTranslationAI = () => {
  const [translationModel, setTranslationModel] = useState<SimplifiedTranslationAI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialisation du modèle
  useEffect(() => {
    const initializeModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("🔄 Chargement de toutes les données (dictionnaire + phrases + exemples)...");
        const { entries, phrases, examples } = await loadComprehensiveDictionary();
        
        console.log("🤖 Création du traducteur avec 220k+ entrées...");
        const model = new SimplifiedTranslationAI(entries, phrases, examples);
        
        setTranslationModel(model);
        setIsInitialized(true);
        
        console.log("✅ Traducteur entièrement entraîné et prêt!");
      } catch (err) {
        console.error("❌ Erreur lors de l'initialisation:", err);
        setError("Erreur lors de l'initialisation du traducteur");
      } finally {
        setIsLoading(false);
      }
    };

    initializeModel();
  }, []);

  // Traduction français vers bariba
  const translateFrenchToBariba = useCallback(async (text: string): Promise<string> => {
    if (!translationModel || !isInitialized) {
      throw new Error("Traducteur non initialisé");
    }
    
    const result = await translationModel.translateFrenchToBariba(text);
    return result.translation;
  }, [translationModel, isInitialized]);

  // Traduction bariba vers français
  const translateBaribaToFrench = useCallback(async (text: string): Promise<string> => {
    if (!translationModel || !isInitialized) {
      throw new Error("Traducteur non initialisé");
    }
    
    const result = await translationModel.translateBaribaToFrench(text);
    return result.translation;
  }, [translationModel, isInitialized]);

  // Traduction intelligente avec détection automatique
  const translateIntelligent = useCallback(async (text: string): Promise<{ translation: string; detectedLanguage: 'french' | 'bariba' | 'mixed' }> => {
    if (!translationModel || !isInitialized) {
      throw new Error("Traducteur non initialisé");
    }

    const result = await translationModel.translateIntelligent(text);
    return {
      translation: result.translation,
      detectedLanguage: result.detectedLanguage
    };
  }, [translationModel, isInitialized]);

  // Obtenir des suggestions de phrases
  const getSuggestions = useCallback((text: string, maxSuggestions: number = 5): string[] => {
    if (!translationModel || !isInitialized) {
      return [];
    }
    
    return translationModel.getSuggestions(text, maxSuggestions);
  }, [translationModel, isInitialized]);

  // Détecter la langue
  const detectLanguage = useCallback((text: string): 'french' | 'bariba' | 'mixed' => {
    if (!translationModel || !isInitialized) {
      return 'mixed';
    }
    
    return translationModel.detectLanguage(text);
  }, [translationModel, isInitialized]);

  return {
    translateFrenchToBariba,
    translateBaribaToFrench,
    translateIntelligent,
    getSuggestions,
    detectLanguage,
    isLoading,
    isInitialized,
    error,
    modelStats: translationModel ? {
      isReady: translationModel.isReady
    } : null
  };
};