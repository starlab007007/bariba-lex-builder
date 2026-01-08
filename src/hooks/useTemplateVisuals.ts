import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VisualGenerationResult {
  success: boolean;
  previewUrl?: string;
  iconUrl?: string;
  storyboardFrames?: any[];
  error?: string;
  results?: Array<{ templateKey?: string; key?: string; success: boolean; error?: string; scenesCount?: number }>;
  processed?: number;
  succeeded?: number;
  failed?: number;
}

export function useTemplateVisuals() {
  const queryClient = useQueryClient();
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    currentTemplate?: string;
  } | null>(null);

  const invokeVisualFunction = async (
    action: string,
    params: Record<string, any> = {}
  ): Promise<VisualGenerationResult> => {
    const { data, error } = await supabase.functions.invoke('generate-template-visuals', {
      body: { action, ...params }
    });

    if (error) throw error;
    return data;
  };

  const invokeAITemplatesFunction = async (
    action: string,
    params: Record<string, any> = {}
  ): Promise<VisualGenerationResult> => {
    const { data, error } = await supabase.functions.invoke('generate-ai-templates', {
      body: { action, ...params }
    });

    if (error) throw error;
    return data;
  };

  // Generate all visuals for a single template (accepts template ID string)
  const generateSingleVisuals = useMutation({
    mutationFn: async (templateId: string) => {
      return invokeAITemplatesFunction('generate_single_visual', { templateId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      const scenesCount = (data as any)?.scenesCount || 5;
      toast.success(`🎬 ${scenesCount} scènes TikTok générées !`);
    },
    onError: (error) => {
      console.error('Visual generation error:', error);
      toast.error('Erreur lors de la génération des visuels');
    }
  });

  // Generate preview image only
  const generatePreview = useMutation({
    mutationFn: async (templateId: string) => {
      return invokeVisualFunction('generate_preview', { templateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
    }
  });

  // Generate icon only
  const generateIcon = useMutation({
    mutationFn: async (templateId: string) => {
      return invokeVisualFunction('generate_icon', { templateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
    }
  });

  // Generate storyboard frames
  const generateStoryboard = useMutation({
    mutationFn: async (templateId: string) => {
      return invokeVisualFunction('generate_storyboard', { templateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
    }
  });

  // Batch generate visuals using the new AI templates function
  const batchGenerate = useMutation({
    mutationFn: async (batchSize: number = 3) => {
      return invokeAITemplatesFunction('generate_visuals_batch', { batchSize });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      const successCount = data.succeeded || data.results?.filter((r: any) => r.success).length || 0;
      toast.success(`${successCount} templates générés avec 5 scènes chacun`);
    }
  });

  // Generate all pending templates with real-time progress
  const generateAllPending = useCallback(async () => {
    // Get count of pending templates
    const { count } = await supabase
      .from('ai_generated_templates')
      .select('*', { count: 'exact', head: true })
      .or('visual_generation_status.eq.pending,visual_generation_status.is.null');

    const total = count || 0;
    if (total === 0) {
      toast.info('Tous les templates ont déjà des visuels');
      return;
    }

    setGenerationProgress({ current: 0, total });
    let generated = 0;
    const batchSize = 2; // Generate 2 at a time to avoid rate limits

    toast.info(`🎨 Démarrage de la génération pour ${total} templates...`);

    while (generated < total) {
      try {
        // Use the new generate_visuals_batch action
        const result = await invokeAITemplatesFunction('generate_visuals_batch', { batchSize });
        
        const batchSuccess = result.succeeded || result.results?.filter((r: any) => r.success).length || 0;
        generated += batchSuccess;
        
        // Get current template name for progress
        const currentTemplate = result.results?.[0]?.key || result.results?.[0]?.templateKey;
        
        setGenerationProgress({ 
          current: generated, 
          total,
          currentTemplate 
        });

        // Break if no more templates processed
        if (!result.results || result.results.length === 0) {
          break;
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error('Batch generation error:', error);
        toast.error('Erreur lors de la génération batch');
        break;
      }
    }

    setGenerationProgress(null);
    queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
    toast.success(`🎉 Génération terminée: ${generated}/${total} templates avec 5 scènes chacun`);
  }, [queryClient]);

  // Get visual generation stats
  const getVisualStats = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_generated_templates')
      .select('visual_generation_status')
      .eq('is_active', true);

    if (error) return null;

    const stats = {
      total: data.length,
      completed: data.filter(t => t.visual_generation_status === 'completed').length,
      pending: data.filter(t => !t.visual_generation_status || t.visual_generation_status === 'pending').length,
      generating: data.filter(t => t.visual_generation_status === 'generating').length,
      failed: data.filter(t => t.visual_generation_status === 'failed').length
    };

    return stats;
  }, []);

  return {
    generateSingleVisuals,
    generatePreview,
    generateIcon,
    generateStoryboard,
    batchGenerate,
    generateAllPending,
    getVisualStats,
    generationProgress,
    isGenerating: generateSingleVisuals.isPending || batchGenerate.isPending
  };
}
