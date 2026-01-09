/**
 * useUnifiedTemplates.ts
 * Hook pour charger et unifier tous les templates de différentes sources
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { kuaishouTemplates } from '@/data/KuaishouTemplateData';
import { ADVANCED_TEMPLATES } from '@/components/tamtam/creator/AdvancedTemplateData';
import { 
  UnifiedTemplate, 
  TemplateFilters, 
  TemplateSortOption,
  AdvancedTemplateData,
  AIGeneratedTemplateData
} from '@/types/UnifiedTemplateTypes';
import { KuaishouTemplateConfig } from '@/types/KuaishouTypes';

/**
 * Normalise un template Kuaishou vers UnifiedTemplate
 */
function normalizeKuaishouTemplate(template: KuaishouTemplateConfig): UnifiedTemplate {
  const templateAny = template as any;
  
  return {
    id: template.id,
    templateKey: template.id,
    name: template.name,
    name_bariba: templateAny.name_bariba,
    description: template.description,
    description_bariba: templateAny.description_bariba,
    icon: templateAny.icon || '🎬',
    emoji: templateAny.icon || '🎬',
    color: templateAny.color || '#FFD700',
    thumbnail: templateAny.thumbnail,
    previewVideo: templateAny.previewVideo,
    category: (template.category as any) || 'social',
    contentType: (template.contentType as any) || 'video',
    difficulty: (template.difficulty as any) || 'beginner',
    tags: templateAny.tags || [],
    duration: template.video?.duration || 15,
    minDuration: template.segments?.[0]?.minDuration,
    maxDuration: template.segments?.[0]?.maxDuration,
    format: '9:16',
    resolution: {
      width: template.video?.resolution?.width || 1080,
      height: template.video?.resolution?.height || 1920
    },
    rating: 5.0,
    usageCount: 0,
    downloadCount: 0,
    isPremium: template.id === 'one_take_pro',
    isNew: false,
    isFeatured: template.id === 'radio_village_pro_01',
    isActive: true,
    source: template.id.includes('radio_village') ? 'radio_village' : 'kuaishou',
    originalConfig: template,
    kuaishouEffects: {
      sparkles: template.kuaishouEffects?.sparkles?.enabled,
      glow: template.kuaishouEffects?.warmGlow?.enabled,
      beatSync: template.kuaishouEffects?.beatGlow?.enabled,
      calligraphy: template.kuaishouEffects?.calligraphy?.enabled,
      particles: true
    },
    voiceInstructions: {
      fr: template.description,
      bariba: templateAny.description_bariba
    }
  };
}

/**
 * Normalise un template avancé vers UnifiedTemplate
 */
function normalizeAdvancedTemplate(template: any): UnifiedTemplate {
  const durations = template.supportedDurations || ['15s'];
  const duration = parseInt(durations[0]) || 15;
  
  return {
    id: template.id || template.key,
    templateKey: template.key,
    name: template.label,
    name_bariba: template.labelBa,
    description: template.description,
    description_bariba: template.descriptionBa,
    icon: template.emoji || '🎬',
    emoji: template.emoji || '🎬',
    color: template.color || '#6366F1',
    thumbnail: undefined,
    previewVideo: undefined,
    category: mapFamilyToCategory(template.family),
    contentType: 'video',
    difficulty: 'intermediate',
    tags: template.features || [],
    duration,
    format: '9:16',
    resolution: { width: 1080, height: 1920 },
    rating: 4.5,
    usageCount: 0,
    downloadCount: 0,
    isPremium: template.family === 'Premium',
    isNew: template.collection === 'Nouveautés',
    isFeatured: false,
    isActive: true,
    source: 'advanced',
    originalConfig: template as AdvancedTemplateData,
    voiceInstructions: template.voiceInstructions
  };
}

/**
 * Normalise un template AI généré vers UnifiedTemplate
 */
function normalizeAITemplate(template: AIGeneratedTemplateData): UnifiedTemplate {
  const durations = template.supported_durations || ['15s'];
  const duration = parseInt(durations[0]) || 15;
  
  return {
    id: template.id,
    templateKey: template.template_key,
    name: template.label_fr,
    name_bariba: template.label_ba,
    description: template.description_fr,
    description_bariba: template.description_ba,
    icon: template.emoji || '✨',
    emoji: template.emoji || '✨',
    color: template.color || '#8B5CF6',
    thumbnail: template.ai_preview_image_url,
    previewVideo: template.demo_video_url,
    category: mapFamilyToCategory(template.family),
    contentType: 'video',
    difficulty: 'beginner',
    tags: Array.isArray(template.features) ? template.features : [],
    duration,
    format: '9:16',
    resolution: { width: 1080, height: 1920 },
    rating: template.rating_average || 4.0,
    usageCount: template.usage_count || 0,
    downloadCount: template.download_count || 0,
    isPremium: false,
    isNew: template.generation_status === 'completed',
    isFeatured: template.is_featured || false,
    isActive: template.is_active !== false,
    source: 'ai_generated',
    originalConfig: template,
    voiceInstructions: template.voice_instructions as any
  };
}

/**
 * Map family to category
 */
function mapFamilyToCategory(family: string): UnifiedTemplate['category'] {
  const mapping: Record<string, UnifiedTemplate['category']> = {
    'Social': 'social',
    'Éducation': 'education',
    'Storytelling': 'storytelling',
    'Musique': 'music',
    'Challenge': 'challenge',
    'Tutoriel': 'tutorial',
    'Audio-First': 'audio_first',
    'Photo': 'photo_story',
    'Premium': 'premium'
  };
  return mapping[family] || 'social';
}

/**
 * Déduplique les templates par ID
 */
function deduplicateTemplates(templates: UnifiedTemplate[]): UnifiedTemplate[] {
  const seen = new Map<string, UnifiedTemplate>();
  
  for (const template of templates) {
    const existing = seen.get(template.id);
    // Priorité: kuaishou > advanced > ai_generated
    if (!existing || 
        (template.source === 'kuaishou') || 
        (template.source === 'advanced' && existing.source === 'ai_generated')) {
      seen.set(template.id, template);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Hook principal pour les templates unifiés
 */
export function useUnifiedTemplates() {
  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [sortBy, setSortBy] = useState<TemplateSortOption>('popular');

  // Charger tous les templates
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Normaliser templates Kuaishou (synchrone)
      const kuaishou = kuaishouTemplates.map(normalizeKuaishouTemplate);
      
      // 2. Normaliser templates avancés (synchrone)
      const advanced = ADVANCED_TEMPLATES.map(normalizeAdvancedTemplate);
      
      // 3. Charger templates AI depuis Supabase
      let aiTemplates: UnifiedTemplate[] = [];
      try {
        const { data, error: dbError } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .eq('is_active', true)
          .order('usage_count', { ascending: false });
        
        if (!dbError && data) {
          aiTemplates = data.map(t => normalizeAITemplate(t as unknown as AIGeneratedTemplateData));
        }
      } catch (e) {
        console.warn('Could not load AI templates:', e);
      }
      
      // 4. Fusionner et dédupliquer
      const allTemplates = deduplicateTemplates([...kuaishou, ...advanced, ...aiTemplates]);
      
      setTemplates(allTemplates);
    } catch (e) {
      setError(e as Error);
      console.error('Error loading templates:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger au mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filtrer les templates
  const filteredTemplates = useMemo(() => {
    let result = [...templates];
    
    // Appliquer les filtres
    if (filters.category) {
      result = result.filter(t => t.category === filters.category);
    }
    if (filters.source) {
      result = result.filter(t => t.source === filters.source);
    }
    if (filters.difficulty) {
      result = result.filter(t => t.difficulty === filters.difficulty);
    }
    if (filters.contentType) {
      result = result.filter(t => t.contentType === filters.contentType);
    }
    if (filters.isPremium !== undefined) {
      result = result.filter(t => t.isPremium === filters.isPremium);
    }
    if (filters.isFeatured !== undefined) {
      result = result.filter(t => t.isFeatured === filters.isFeatured);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    // Appliquer le tri
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recent':
      default:
        // Featured et premium en premier
        result.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1;
          return 0;
        });
    }
    
    return result;
  }, [templates, filters, sortBy]);

  // Obtenir les catégories disponibles
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return Array.from(cats);
  }, [templates]);

  // Obtenir un template par ID
  const getTemplateById = useCallback((id: string) => {
    return templates.find(t => t.id === id || t.templateKey === id);
  }, [templates]);

  // Tracker l'usage d'un template
  const trackUsage = useCallback(async (templateId: string) => {
    try {
      // Get current count and increment
      const { data } = await supabase
        .from('ai_generated_templates')
        .select('usage_count')
        .eq('id', templateId)
        .single();
      
      if (data) {
        await supabase
          .from('ai_generated_templates')
          .update({ usage_count: (data.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    } catch (e) {
      // Silently fail for usage tracking
    }
  }, []);

  return {
    // Data
    templates: filteredTemplates,
    allTemplates: templates,
    categories,
    
    // State
    isLoading,
    error,
    filters,
    sortBy,
    
    // Actions
    setFilters,
    setSortBy,
    refresh: loadTemplates,
    getTemplateById,
    trackUsage
  };
}

export default useUnifiedTemplates;
