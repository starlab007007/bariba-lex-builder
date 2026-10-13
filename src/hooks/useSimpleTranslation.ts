import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isOffline, memoryTranslate } from '@/lib/translation/translationMemory';

interface TranslationResult {
  translation: string;
  confidence: number;
  method: string;
  duration: number;
}

/**
 * Hook de traduction FITILA, en ligne ET hors ligne :
 *  1. phrase attestée (dictionnaire, Apprendre, scènes) : exacte, instantanée, sans réseau ;
 *  2. en ligne : ByT5 (byt5-bariba-translate, qui consulte aussi la mémoire) ;
 *  3. hors ligne ou serveur indisponible : seules les phrases attestées sont garanties ; aucune phrase reconstruite mot à mot.
 * Sinon une erreur claire est retournée, jamais une traduction inventée.
 */
export function useSimpleTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const attested = await memoryTranslate(text, direction);
      if (attested) {
        return { ...attested, duration: Math.round(performance.now() - startTime) };
      }

      let onlineFailure: Error | null = null;
      if (!isOffline()) {
      try {
      const { data, error: byT5Error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text, sourceLang, targetLang }
      });

      if (byT5Error || !data?.translation || typeof data.translation !== 'string' || !data.translation.trim()) {
        throw new Error(byT5Error?.message || data?.error || 'ByT5 n\'a pas pu traduire ce texte');
      }

      const duration = Math.round(performance.now() - startTime);
      return {
        translation: data.translation,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        method: data.method || 'byt5-expert',
        duration
      };
      } catch (networkErr: any) {
        onlineFailure = networkErr instanceof Error ? networkErr : new Error(String(networkErr));
      }
      }

      throw onlineFailure ?? new Error('Hors connexion : cette phrase n’est pas dans la mémoire FITILA. Reconnectez-vous pour la traduire.');
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
