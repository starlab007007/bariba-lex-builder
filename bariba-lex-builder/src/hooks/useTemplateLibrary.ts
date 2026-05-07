import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ADVANCED_TEMPLATES } from '@/components/tamtam/creator/AdvancedTemplateData';
import { toast } from 'sonner';

export interface AIGeneratedTemplate {
  id: string;
  template_key: string;
  emoji: string;
  label_fr: string;
  label_ba: string | null;
  description_fr: string;
  description_ba: string | null;
  family: string;
  collection: string | null;
  color: string;
  ai_voice_description_fr: string | null;
  ai_voice_description_ba: string | null;
  ai_enhanced_description: string | null;
  ai_storyboard: any | null;
  ai_preview_image_url: string | null;
  ai_preview_image_base64: string | null;
  ai_analysis: any | null;
  inputs: any[];
  supported_durations: string[];
  output_ratios: string[];
  features: any;
  voice_instructions: any[];
  kse_engine: any | null;
  usage_count: number;
  download_count: number;
  rating_average: number;
  rating_count: number;
  is_active: boolean;
  is_featured: boolean;
  generation_status: string;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateFilters {
  family?: string;
  collection?: string;
  status?: string;
  search?: string;
}

export interface GenerationStats {
  total: number;
  pending: number;
  generating: number;
  completed: number;
  failed: number;
}

export function useTemplateLibrary() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<AIGeneratedTemplate | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    currentTemplate: string;
  } | null>(null);

  // Fetch all templates from database
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ai-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_generated_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return (data || []) as AIGeneratedTemplate[];
    },
  });

  // Fetch generation status
  const { data: stats } = useQuery({
    queryKey: ['ai-templates-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-ai-templates', {
        body: { action: 'get_status' },
      });

      if (error) throw error;
      return data.stats as GenerationStats;
    },
  });

  // Sync all templates from code to database
  const syncMutation = useMutation({
    mutationFn: async () => {
      const templatesData = ADVANCED_TEMPLATES.map(tpl => ({
        id: tpl.id,
        emoji: tpl.emoji,
        label: tpl.label_fr,
        labelBa: tpl.label_ba,
        description: tpl.description_fr,
        family: tpl.family,
        collection: tpl.collection,
        color: tpl.color,
        inputs: tpl.inputs,
        supportedDurations: tpl.supportedDurations,
        outputRatios: tpl.outputRatios,
        features: tpl.features,
        voiceInstructions: tpl.voiceInstructions,
        engine: tpl.engine,
      }));

      const { data, error } = await supabase.functions.invoke('generate-ai-templates', {
        body: { action: 'sync_all', templates: templatesData },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.synced} templates synchronisés`);
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      queryClient.invalidateQueries({ queryKey: ['ai-templates-stats'] });
    },
    onError: (error) => {
      toast.error(`Erreur de synchronisation: ${error.message}`);
    },
  });

  // Generate AI content for a single template
  const generateSingleMutation = useMutation({
    mutationFn: async (templateKey: string) => {
      const { data, error } = await supabase.functions.invoke('generate-ai-templates', {
        body: { action: 'generate_single', templateKey },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Template "${data.templateKey}" généré avec succès`);
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      queryClient.invalidateQueries({ queryKey: ['ai-templates-stats'] });
    },
    onError: (error) => {
      toast.error(`Erreur de génération: ${error.message}`);
    },
  });

  // Generate AI content for batch of templates
  const generateBatchMutation = useMutation({
    mutationFn: async (batchSize: number = 5) => {
      const { data, error } = await supabase.functions.invoke('generate-ai-templates', {
        body: { action: 'generate_batch', batchSize },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.succeeded}/${data.processed} templates générés`);
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      queryClient.invalidateQueries({ queryKey: ['ai-templates-stats'] });
    },
    onError: (error) => {
      toast.error(`Erreur de génération batch: ${error.message}`);
    },
  });

  // Generate all pending templates
  const generateAllPending = useCallback(async () => {
    if (!stats) return;

    const pendingCount = stats.pending;
    if (pendingCount === 0) {
      toast.info('Tous les templates sont déjà générés');
      return;
    }

    setGenerationProgress({ current: 0, total: pendingCount, currentTemplate: '' });

    let processed = 0;
    while (processed < pendingCount) {
      const result = await generateBatchMutation.mutateAsync(5);
      processed += result.processed;
      setGenerationProgress({
        current: processed,
        total: pendingCount,
        currentTemplate: result.results?.[0]?.key || '',
      });

      if (result.processed === 0) break; // No more pending
    }

    setGenerationProgress(null);
    toast.success('Génération terminée !');
  }, [stats, generateBatchMutation]);

  // Track template usage
  const trackUsage = useCallback(async (templateId: string) => {
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
  }, []);

  // Track template download
  const trackDownload = useCallback(async (templateId: string) => {
    const { data } = await supabase
      .from('ai_generated_templates')
      .select('download_count')
      .eq('id', templateId)
      .single();
    if (data) {
      await supabase
        .from('ai_generated_templates')
        .update({ download_count: (data.download_count || 0) + 1 })
        .eq('id', templateId);
    }
  }, []);

  // Download template as JSON
  const downloadTemplate = useCallback(async (template: AIGeneratedTemplate) => {
    const exportData = {
      metadata: {
        id: template.template_key,
        version: '1.0',
        exported_at: new Date().toISOString(),
        source: 'TamTam Creator',
      },
      template: {
        emoji: template.emoji,
        label_fr: template.label_fr,
        label_ba: template.label_ba,
        description_fr: template.description_fr,
        description_ba: template.description_ba,
        family: template.family,
        collection: template.collection,
        color: template.color,
      },
      ai_content: {
        voice_description_fr: template.ai_voice_description_fr,
        voice_description_ba: template.ai_voice_description_ba,
        enhanced_description: template.ai_enhanced_description,
        storyboard: template.ai_storyboard,
        analysis: template.ai_analysis,
      },
      technical: {
        inputs: template.inputs,
        supported_durations: template.supported_durations,
        output_ratios: template.output_ratios,
        features: template.features,
        voice_instructions: template.voice_instructions,
        kse_engine: template.kse_engine,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${template.template_key}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Track download
    await supabase
      .from('ai_generated_templates')
      .update({ download_count: (template.download_count || 0) + 1 })
      .eq('id', template.id);

    toast.success('Template téléchargé !');
  }, []);

  // Filter templates
  const filterTemplates = useCallback((filters: TemplateFilters) => {
    let filtered = [...templates];

    if (filters.family) {
      filtered = filtered.filter(t => t.family === filters.family);
    }
    if (filters.collection) {
      filtered = filtered.filter(t => t.collection === filters.collection);
    }
    if (filters.status) {
      filtered = filtered.filter(t => t.generation_status === filters.status);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.label_fr.toLowerCase().includes(search) ||
        t.description_fr.toLowerCase().includes(search) ||
        t.emoji.includes(search)
      );
    }

    return filtered;
  }, [templates]);

  // Select template for use
  const selectTemplate = useCallback((template: AIGeneratedTemplate) => {
    setSelectedTemplate(template);
    // Track usage
    supabase
      .from('ai_generated_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', template.id);
  }, []);

  return {
    // Data
    templates,
    stats,
    selectedTemplate,
    generationProgress,

    // State
    isLoading,
    error,
    isSyncing: syncMutation.isPending,
    isGenerating: generateSingleMutation.isPending || generateBatchMutation.isPending,

    // Actions
    refetch,
    syncTemplates: syncMutation.mutate,
    generateSingle: generateSingleMutation.mutate,
    generateBatch: generateBatchMutation.mutate,
    generateAllPending,
    downloadTemplate,
    filterTemplates,
    selectTemplate,
    clearSelection: () => setSelectedTemplate(null),
    trackUsage,
    trackDownload,
  };
}
