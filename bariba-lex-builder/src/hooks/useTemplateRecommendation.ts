// useTemplateRecommendation.ts
// Smart AI-powered template recommendations based on context

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ADVANCED_TEMPLATES, AdvancedTemplate } from '@/components/tamtam/creator/AdvancedTemplateData';

interface TemplateSuggestion {
  id: string;
  reason: string;
  template: AdvancedTemplate;
}

interface RecommendationContext {
  hour: number;
  dayOfWeek: number;
  userIntent?: string;
  language: 'fr' | 'ba';
}

interface UseTemplateRecommendationReturn {
  suggestions: TemplateSuggestion[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  fetchWithIntent: (intent: string) => Promise<void>;
}

export function useTemplateRecommendation(
  language: 'fr' | 'ba' = 'fr'
): UseTemplateRecommendationReturn {
  const [userIntent, setUserIntent] = useState<string>('');
  const [manualSuggestions, setManualSuggestions] = useState<TemplateSuggestion[]>([]);
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Get contextual recommendations (based on time of day)
  const getContextualDefaults = useCallback((): TemplateSuggestion[] => {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const suggestions: TemplateSuggestion[] = [];

    // Morning (6-12): Educational content
    if (hour >= 6 && hour < 12) {
      const template = ADVANCED_TEMPLATES.find(t => t.id === 'micro_cours_pratique');
      if (template) {
        suggestions.push({
          id: template.id,
          reason: language === 'ba' ? 'Kalan ɲuman' : 'Parfait pour les leçons du matin',
          template,
        });
      }
    }

    // Afternoon (12-17): Community content
    if (hour >= 12 && hour < 17) {
      const template = ADVANCED_TEMPLATES.find(t => t.id === 'annonce_communautaire');
      if (template) {
        suggestions.push({
          id: template.id,
          reason: language === 'ba' ? 'Dugu kuma' : 'Idéal pour les annonces',
          template,
        });
      }
    }

    // Evening (17-21): Cultural/entertainment
    if (hour >= 17 && hour < 21) {
      const template = ADVANCED_TEMPLATES.find(t => t.id === 'beat_sync_ultra');
      if (template) {
        suggestions.push({
          id: template.id,
          reason: language === 'ba' ? 'Dↄn kpankpa' : 'Pour danser ce soir!',
          template,
        });
      }
    }

    // Night (21-6): Stories and tales
    if (hour >= 21 || hour < 6) {
      const template = ADVANCED_TEMPLATES.find(t => t.id === 'conte_du_soir');
      if (template) {
        suggestions.push({
          id: template.id,
          reason: language === 'ba' ? 'Nsurun kuma' : 'Parfait pour un conte du soir',
          template,
        });
      }
    }

    // Market days (typically Wednesday and Saturday in many regions)
    if (dayOfWeek === 3 || dayOfWeek === 6) {
      const template = ADVANCED_TEMPLATES.find(t => t.id === 'metiers_terroir');
      if (template) {
        suggestions.push({
          id: template.id,
          reason: language === 'ba' ? 'Baara don' : 'C\'est jour de marché!',
          template,
        });
      }
    }

    // Always add parole_ancien as a preserve-heritage option
    const ancienTemplate = ADVANCED_TEMPLATES.find(t => t.id === 'parole_ancien');
    if (ancienTemplate && suggestions.length < 3) {
      suggestions.push({
        id: ancienTemplate.id,
        reason: language === 'ba' ? 'Kↄrↄ kuma yeli' : 'Préserve la mémoire des anciens',
        template: ancienTemplate,
      });
    }

    return suggestions.slice(0, 3);
  }, [language]);

  // Auto-refresh context recommendations
  const { data: contextSuggestions, isLoading: isLoadingContext, refetch } = useQuery({
    queryKey: ['template-recommendations', language],
    queryFn: async () => {
      // First try local contextual defaults (faster)
      const localSuggestions = getContextualDefaults();
      
      // Then try AI suggestions
      try {
        const { data, error } = await supabase.functions.invoke('generate-template-assets', {
          body: {
            action: 'suggest_template',
            userContext: {
              hour: new Date().getHours(),
              dayOfWeek: new Date().getDay(),
              userIntent: '',
              language,
            }
          }
        });

        if (error) throw error;

        if (data?.suggestions) {
          return data.suggestions
            .map((sug: { id: string; reason: string }) => {
              const template = ADVANCED_TEMPLATES.find(t => t.id === sug.id);
              if (!template) return null;
              return { ...sug, template };
            })
            .filter((s: TemplateSuggestion | null): s is TemplateSuggestion => s !== null);
        }
      } catch (err) {
        console.warn('AI suggestions failed, using local defaults:', err);
      }

      return localSuggestions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch recommendations with user intent (voice input)
  const fetchWithIntent = useCallback(async (intent: string) => {
    setUserIntent(intent);
    setIsLoadingManual(true);
    setManualError(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-template-assets', {
        body: {
          action: 'suggest_template',
          userContext: {
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            userIntent: intent,
            language,
          }
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        const suggestions = data.suggestions
          .map((sug: { id: string; reason: string }) => {
            const template = ADVANCED_TEMPLATES.find(t => t.id === sug.id);
            if (!template) return null;
            return { ...sug, template };
          })
          .filter((s: TemplateSuggestion | null): s is TemplateSuggestion => s !== null);
        
        setManualSuggestions(suggestions);
      }
    } catch (err) {
      console.error('Failed to fetch intent-based suggestions:', err);
      setManualError(err instanceof Error ? err.message : 'Erreur');
      // Fall back to contextual defaults
      setManualSuggestions(getContextualDefaults());
    } finally {
      setIsLoadingManual(false);
    }
  }, [language, getContextualDefaults]);

  // Merge suggestions: manual takes priority if user provided intent
  const finalSuggestions = userIntent && manualSuggestions.length > 0
    ? manualSuggestions
    : (contextSuggestions || getContextualDefaults());

  return {
    suggestions: finalSuggestions,
    isLoading: isLoadingManual || isLoadingContext,
    error: manualError,
    refetch,
    fetchWithIntent,
  };
}

export default useTemplateRecommendation;
