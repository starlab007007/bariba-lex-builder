import { BaatonuTranslationAI } from "@/services/BaatonuTranslationAI";
import { loadComprehensiveDictionary } from "@/data/fullDictionaryData";
import { useState, useEffect, useCallback } from "react";

export const useTranslationAI = () => {
  const [translationModel, setTranslationModel] = useState<BaatonuTranslationAI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialisation du modèle
  useEffect(() => {
    const initializeModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("🔄 Chargement des données du dictionnaire...");
        const dictionaryEntries = await loadComprehensiveDictionary();
        
        console.log("🤖 Création du modèle de traduction IA...");
        const model = new BaatonuTranslationAI(dictionaryEntries);
        
        console.log("⚡ Initialisation du modèle...");
        await model.initialize();
        
        setTranslationModel(model);
        setIsInitialized(true);
        
        console.log("✅ Modèle de traduction IA prêt!");
      } catch (err) {
        console.error("❌ Erreur lors de l'initialisation du modèle:", err);
        setError("Erreur lors de l'initialisation du modèle de traduction");
      } finally {
        setIsLoading(false);
      }
    };

    initializeModel();
  }, []);

  // Traduction français vers bariba
  const translateFrenchToBariba = useCallback(async (text: string): Promise<string> => {
    if (!translationModel || !isInitialized) {
      throw new Error("Modèle de traduction non initialisé");
    }
    
    return await translationModel.translateFrenchToBariba(text);
  }, [translationModel, isInitialized]);

  // Traduction bariba vers français
  const translateBaribaToFrench = useCallback(async (text: string): Promise<string> => {
    if (!translationModel || !isInitialized) {
      throw new Error("Modèle de traduction non initialisé");
    }
    
    return await translationModel.translateBaribaToFrench(text);
  }, [translationModel, isInitialized]);

  // Traduction intelligente (détection automatique de la langue)
  const translateIntelligent = useCallback(async (text: string): Promise<{ translation: string; detectedLanguage: 'french' | 'bariba' }> => {
    if (!translationModel || !isInitialized) {
      throw new Error("Modèle de traduction non initialisé");
    }

    // Détection simple de la langue basée sur des caractères typiques
    const hasFrenchChars = /[àâäéèêëîïôùûüÿç]/i.test(text);
    const hasCommonFrenchWords = /\b(le|la|les|un|une|des|de|du|et|ou|est|sont|avec|pour|dans|sur|par|au|aux|ce|cette|ces|qui|que|dont|où)\b/i.test(text);
    
    const isFrench = hasFrenchChars || hasCommonFrenchWords || 
                    !/[\u0300-\u036f\u1E00-\u1EFF]/.test(text); // Pas de diacritiques bariba

    if (isFrench) {
      const translation = await translateFrenchToBariba(text);
      return { translation, detectedLanguage: 'french' };
    } else {
      const translation = await translateBaribaToFrench(text);
      return { translation, detectedLanguage: 'bariba' };
    }
  }, [translateFrenchToBariba, translateBaribaToFrench]);

  return {
    translateFrenchToBariba,
    translateBaribaToFrench,
    translateIntelligent,
    isLoading,
    isInitialized,
    error,
    modelStats: translationModel ? {
      isReady: translationModel.isReady
    } : null
  };
};