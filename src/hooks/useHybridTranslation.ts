/**
 * Hook React pour le système de traduction hybride
 * 
 * Utilise l'architecture en cascade pour une traduction optimale
 */

import { useState, useEffect, useCallback } from "react";
import { hybridTranslationService, type HybridTranslationResult } from "@/services/HybridTranslationService";
import { loadEnhancedDictionary } from "@/data/enhancedDictionaryLoader";
import { toast } from "sonner";

export const useHybridTranslation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Initialisation du système hybride
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("🔄 Chargement du système de traduction hybride...");
        const { entries, phrases, examples } = await loadEnhancedDictionary();
        
        console.log("🤖 Initialisation des modèles...");
        await hybridTranslationService.initialize(entries, phrases, examples);
        
        setIsInitialized(true);
        
        const stats = hybridTranslationService.getStats();
        console.log("✅ Système hybride prêt!");
        console.log("📊 Statistiques:");
        console.log(`  - ${stats.idiomCount} idiomes`);
        console.log(`  - ${stats.contextSize} entrées contextuelles`);
        console.log(`  - Modèle simplifié: ${stats.simplifiedReady ? '✅' : '❌'}`);
        console.log(`  - Modèle avancé: ${stats.advancedReady ? '✅' : '⚠️ désactivé'}`);
        
        toast.success("Traducteur haute performance activé");
      } catch (err) {
        console.error("❌ Erreur lors de l'initialisation:", err);
        setError("Erreur lors de l'initialisation du traducteur");
        toast.error("Erreur d'initialisation du traducteur");
      } finally {
        setIsLoading(false);
      }
    };

    initializeSystem();
  }, []);

  /**
   * Traduction français vers bariba
   */
  const translateFrenchToBariba = useCallback(async (
    text: string,
    options?: { useAI?: boolean; preferredModel?: 'byt5-expert' | 'simplified' | 'lovable-ai' }
  ): Promise<HybridTranslationResult> => {
    if (!isInitialized) {
      throw new Error("Traducteur non initialisé");
    }
    
    setIsTranslating(true);
    try {
      const result = await hybridTranslationService.translate(
        text,
        'french',
        'bariba',
        options
      );
      
      // Log de la méthode utilisée
      console.log(`✅ Traduction réussie via ${result.method} (${result.confidence}% confiance, ${result.duration}ms)`);
      
      return result;
    } finally {
      setIsTranslating(false);
    }
  }, [isInitialized]);

  /**
   * Traduction bariba vers français
   */
  const translateBaribaToFrench = useCallback(async (
    text: string,
    options?: { useAI?: boolean; preferredModel?: 'byt5-expert' | 'simplified' | 'lovable-ai' }
  ): Promise<HybridTranslationResult> => {
    if (!isInitialized) {
      throw new Error("Traducteur non initialisé");
    }
    
    setIsTranslating(true);
    try {
      const result = await hybridTranslationService.translate(
        text,
        'bariba',
        'french',
        options
      );
      
      console.log(`✅ Traduction réussie via ${result.method} (${result.confidence}% confiance, ${result.duration}ms)`);
      
      return result;
    } finally {
      setIsTranslating(false);
    }
  }, [isInitialized]);

  /**
   * Traduction intelligente avec détection automatique
   */
  const translateIntelligent = useCallback(async (
    text: string,
    useAI = false
  ): Promise<HybridTranslationResult> => {
    if (!isInitialized) {
      throw new Error("Traducteur non initialisé");
    }
    
    setIsTranslating(true);
    try {
      const result = await hybridTranslationService.translateIntelligent(text, useAI);
      
      console.log(`✅ Traduction intelligente (${result.detectedLanguage}) via ${result.method}`);
      
      return result;
    } finally {
      setIsTranslating(false);
    }
  }, [isInitialized]);

  /**
   * Détecte la langue du texte
   */
  const detectLanguage = useCallback((text: string): 'french' | 'bariba' | 'mixed' => {
    if (!isInitialized) {
      return 'mixed';
    }
    return hybridTranslationService.detectLanguage(text);
  }, [isInitialized]);

  /**
   * Génère des suggestions de phrases
   */
  const getSuggestions = useCallback((text: string, maxSuggestions: number = 5): string[] => {
    if (!isInitialized) {
      return [];
    }
    return hybridTranslationService.getSuggestions(text, maxSuggestions);
  }, [isInitialized]);

  /**
   * Obtenir les statistiques du système
   */
  const getStats = useCallback(() => {
    return hybridTranslationService.getStats();
  }, []);

  return {
    translateFrenchToBariba,
    translateBaribaToFrench,
    translateIntelligent,
    detectLanguage,
    getSuggestions,
    getStats,
    isLoading,
    isInitialized,
    isTranslating,
    error
  };
};
