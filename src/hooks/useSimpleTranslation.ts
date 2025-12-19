import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationResult {
  translation: string;
  confidence: number;
  method: string;
  duration: number;
}

/**
 * Hook de traduction simplifié utilisant uniquement:
 * 1. ByT5 (byt5-bariba-translate) comme traducteur principal
 * 2. ai-translate-lovable comme fallback
 * 
 * Aucun chargement lourd au démarrage!
 */
export function useSimpleTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Traduire du français vers le bariba
   */
  const translateFrenchToBariba = useCallback(async (text: string): Promise<TranslationResult> => {
    if (!text.trim()) {
      return { translation: '', confidence: 0, method: 'none', duration: 0 };
    }

    setIsTranslating(true);
    setError(null);
    const startTime = performance.now();

    try {
      // 1. Essayer ByT5 d'abord
      const { data, error: byT5Error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text, sourceLang: 'french', targetLang: 'bariba' }
      });

      if (!byT5Error && data?.translation) {
        const duration = Math.round(performance.now() - startTime);
        return {
          translation: data.translation,
          confidence: data.confidence || 85,
          method: 'byt5-expert',
          duration
        };
      }

      console.warn('ByT5 failed, trying Lovable AI fallback...', byT5Error);

      // 2. Fallback: ai-translate-lovable
      const { data: lovableData, error: lovableError } = await supabase.functions.invoke('ai-translate-lovable', {
        body: { text, sourceLang: 'french', targetLang: 'bariba' }
      });

      if (!lovableError && lovableData?.translation) {
        const duration = Math.round(performance.now() - startTime);
        return {
          translation: lovableData.translation,
          confidence: lovableData.confidence || 75,
          method: 'lovable-ai',
          duration
        };
      }

      throw new Error(lovableError?.message || 'Traduction échouée');
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  /**
   * Traduire du bariba vers le français
   */
  const translateBaribaToFrench = useCallback(async (text: string): Promise<TranslationResult> => {
    if (!text.trim()) {
      return { translation: '', confidence: 0, method: 'none', duration: 0 };
    }

    setIsTranslating(true);
    setError(null);
    const startTime = performance.now();

    try {
      // 1. Essayer ByT5 d'abord
      const { data, error: byT5Error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text, sourceLang: 'bariba', targetLang: 'french' }
      });

      if (!byT5Error && data?.translation) {
        const duration = Math.round(performance.now() - startTime);
        return {
          translation: data.translation,
          confidence: data.confidence || 85,
          method: 'byt5-expert',
          duration
        };
      }

      console.warn('ByT5 failed, trying Lovable AI fallback...', byT5Error);

      // 2. Fallback: ai-translate-lovable
      const { data: lovableData, error: lovableError } = await supabase.functions.invoke('ai-translate-lovable', {
        body: { text, sourceLang: 'bariba', targetLang: 'french' }
      });

      if (!lovableError && lovableData?.translation) {
        const duration = Math.round(performance.now() - startTime);
        return {
          translation: lovableData.translation,
          confidence: lovableData.confidence || 75,
          method: 'lovable-ai',
          duration
        };
      }

      throw new Error(lovableError?.message || 'Traduction échouée');
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  /**
   * Détection simple de la langue
   */
  const detectLanguage = useCallback((text: string): 'french' | 'bariba' | 'mixed' => {
    if (!text.trim()) return 'mixed';
    
    const baribaMarkers = ['ɔ', 'ɛ', 'ŋ', 'kpa', 'gba', 'nya', 'ka ', 'ba ', 'n de'];
    const frenchMarkers = ['le', 'la', 'les', 'de', 'du', 'des', 'je', 'tu', 'il', 'nous', 'vous'];
    
    const lowerText = text.toLowerCase();
    
    const baribaScore = baribaMarkers.filter(m => lowerText.includes(m)).length;
    const frenchScore = frenchMarkers.filter(m => lowerText.includes(m)).length;
    
    if (baribaScore > frenchScore) return 'bariba';
    if (frenchScore > baribaScore) return 'french';
    return 'mixed';
  }, []);

  return {
    translateFrenchToBariba,
    translateBaribaToFrench,
    detectLanguage,
    isTranslating,
    isInitialized: true, // Toujours prêt, pas de chargement initial
    isLoading: false, // Pas de chargement initial
    error
  };
}
