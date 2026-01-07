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
  results?: Array<{ templateKey: string; success: boolean; error?: string }>;
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

  // Generate all visuals for a single template
  const generateSingleVisuals = useMutation({
    mutationFn: async (templateId: string) => {
      return invokeVisualFunction('generate_all', { templateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      toast.success('Visuels générés avec succès !');
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

  // Batch generate visuals
  const batchGenerate = useMutation({
    mutationFn: async (batchSize: number = 3) => {
      return invokeVisualFunction('batch_generate', { batchSize });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      toast.success(`${successCount} templates générés`);
    }
  });

  // Generate all pending templates
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

    while (generated < total) {
      try {
        const result = await invokeVisualFunction('batch_generate', { batchSize });
        const batchSuccess = result.results?.filter((r: any) => r.success).length || 0;
        generated += batchSuccess;
        
        setGenerationProgress({ 
          current: generated, 
          total,
          currentTemplate: result.results?.[0]?.templateKey 
        });

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Batch generation error:', error);
        break;
      }
    }

    setGenerationProgress(null);
    queryClient.invalidateQueries({ queryKey: ['ai-templates'] });
    toast.success(`Génération terminée: ${generated}/${total} templates`);
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
