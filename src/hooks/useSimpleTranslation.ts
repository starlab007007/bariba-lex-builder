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
 * 2. refine-bariba en mode 'translate' comme fallback (basé sur connaissances linguistiques)
 * 
 * Aucun appel à ai-translate-lovable !
 */
export function useSimpleTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidPatterns = ['Share via Link', 'share via', 'Loading', 'Submit', 'Clear', 'Button', 'Click', 'Select', 'Choose'];
  const isValid = (t: unknown) => typeof t === 'string' && t.trim().length > 0 && !invalidPatterns.some(p => (t as string).toLowerCase().includes(p.toLowerCase()));

  const translateWithFallback = useCallback(async (text: string, direction: 'fr-ba' | 'ba-fr'): Promise<TranslationResult> => {
    if (!text.trim()) {
      return { translation: '', confidence: 0, method: 'none', duration: 0 };
    }

    setIsTranslating(true);
    setError(null);
    const startTime = performance.now();

    const sourceLang = direction === 'fr-ba' ? 'french' : 'bariba';
    const targetLang = direction === 'fr-ba' ? 'bariba' : 'french';

    try {
      // 1. Essayer ByT5 d'abord
      const { data, error: byT5Error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text, sourceLang, targetLang }
      });

      if (!byT5Error && isValid(data?.translation)) {
        const duration = Math.round(performance.now() - startTime);
        return {
          translation: data.translation,
          confidence: data.confidence || 85,
          method: data.method || 'byt5-expert',
          duration
        };
      }

      console.warn('ByT5 failed, trying knowledge-based fallback...', byT5Error);

      // 2. Fallback: refine-bariba en mode translate
      const { data: refineData, error: refineError } = await supabase.functions.invoke('refine-bariba', {
        body: { text, type: 'translate', direction }
      });

      if (!refineError && refineData?.refined?.trim()) {
        const duration = Math.round(performance.now() - startTime);
        return {
          translation: refineData.refined,
          confidence: refineData.confidence || 80,
          method: 'knowledge-based',
          duration
        };
      }

      throw new Error(refineError?.message || 'Traduction échouée');
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const translateFrenchToBariba = useCallback((text: string) => translateWithFallback(text, 'fr-ba'), [translateWithFallback]);
  const translateBaribaToFrench = useCallback((text: string) => translateWithFallback(text, 'ba-fr'), [translateWithFallback]);

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
    isInitialized: true,
    isLoading: false,
    error
  };
}
