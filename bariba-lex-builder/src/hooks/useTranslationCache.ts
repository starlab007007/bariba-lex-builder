import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedTranslation {
  source_text: string;
  target_text: string;
  confidence_score: number;
  usage_count: number;
}

export const useTranslationCache = () => {
  const [isCacheLoading, setIsCacheLoading] = useState(false);

  // Rechercher une traduction dans le cache
  const getCachedTranslation = useCallback(async (
    sourceText: string,
    sourceLang: string,
    targetLang: string
  ): Promise<CachedTranslation | null> => {
    try {
      setIsCacheLoading(true);
      
      const { data, error } = await supabase
        .from('translation_memory')
        .select('source_text, target_text, confidence_score, usage_count')
        .eq('source_text', sourceText.trim().toLowerCase())
        .eq('source_language', sourceLang)
        .eq('target_language', targetLang)
        .order('usage_count', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Cache lookup error:', error);
        return null;
      }

      if (data) {
        // Incrémenter le compteur d'utilisation
        await supabase
          .from('translation_memory')
          .update({ 
            usage_count: data.usage_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('source_text', sourceText.trim().toLowerCase())
          .eq('source_language', sourceLang)
          .eq('target_language', targetLang);

        return data;
      }

      return null;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    } finally {
      setIsCacheLoading(false);
    }
  }, []);

  // Sauvegarder une traduction dans le cache
  const cacheTranslation = useCallback(async (
    sourceText: string,
    targetText: string,
    sourceLang: string,
    targetLang: string,
    confidence: number
  ) => {
    try {
      // Vérifier si la traduction existe déjà
      const { data: existing } = await supabase
        .from('translation_memory')
        .select('id, usage_count')
        .eq('source_text', sourceText.trim().toLowerCase())
        .eq('source_language', sourceLang)
        .eq('target_language', targetLang)
        .maybeSingle();

      if (existing) {
        // Mettre à jour si elle existe
        await supabase
          .from('translation_memory')
          .update({ 
            target_text: targetText,
            confidence_score: confidence,
            usage_count: existing.usage_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Créer une nouvelle entrée
        await supabase
          .from('translation_memory')
          .insert({
            source_text: sourceText.trim().toLowerCase(),
            target_text: targetText,
            source_language: sourceLang,
            target_language: targetLang,
            confidence_score: confidence,
            usage_count: 1
          });
      }
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }, []);

  // Obtenir les traductions les plus fréquentes
  const getFrequentTranslations = useCallback(async (limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('translation_memory')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Frequent translations error:', error);
      return [];
    }
  }, []);

  return {
    getCachedTranslation,
    cacheTranslation,
    getFrequentTranslations,
    isCacheLoading
  };
};
