/**
 * Hook for managing the anime scene library
 * Used by admin to generate and manage pre-generated images
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LibraryImage {
  id: string;
  style: string;
  emotion: string;
  scene_type: string;
  character_type: string;
  action: string;
  time_of_day: string;
  description_en: string;
  description_fr: string;
  image_url: string;
  storage_path: string;
  usage_count: number;
  created_at: string;
}

export interface LibraryStats {
  total_images: number;
  total_possible_combinations: number;
  coverage_percent: number;
  by_style: Record<string, number>;
  by_emotion: Record<string, number>;
  by_scene_type: Record<string, number>;
}

export interface GenerationParams {
  style: string;
  emotion: string;
  scene_type: string;
  character_type?: string;
  action?: string;
  time_of_day?: string;
  count?: number;
}

export function useAnimeLibrary() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [images, setImages] = useState<LibraryImage[]>([]);

  /**
   * Fetch library statistics
   */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-anime-library', {
        body: { action: 'get_stats' }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch stats');

      setStats(data.stats);
      return data.stats;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List library images with optional filters
   */
  const listImages = useCallback(async (filters?: {
    style?: string;
    emotion?: string;
    scene_type?: string;
    character_type?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-anime-library', {
        body: { action: 'list_library', ...filters }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to list images');

      setImages(data.images);
      return { images: data.images, total: data.total };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate a batch of images
   */
  const generateBatch = useCallback(async (params: GenerationParams) => {
    setLoading(true);
    setError(null);

    try {
      // Use 'image_action' to avoid conflict with 'action' (API command)
      const { action: imageAction, ...rest } = params;
      const { data, error: fnError } = await supabase.functions.invoke('generate-anime-library', {
        body: { action: 'generate_batch', image_action: imageAction, ...rest }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to generate images');

      // Refresh stats after generation
      await fetchStats();

      return {
        generated: data.generated,
        images: data.images,
        errors: data.errors
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  /**
   * Generate essential images (Phase 1 of the plan)
   * African + Fantasy styles with common emotions and scenes
   */
  const generateEssentials = useCallback(async (onProgress?: (current: number, total: number) => void) => {
    const essentialCombos = [
      // African style - core combinations
      { style: 'african', emotion: 'joy', scene_type: 'village', character_type: 'child_boy' },
      { style: 'african', emotion: 'joy', scene_type: 'village', character_type: 'child_girl' },
      { style: 'african', emotion: 'wonder', scene_type: 'forest', character_type: 'child_boy' },
      { style: 'african', emotion: 'wonder', scene_type: 'spirit', character_type: 'child_girl' },
      { style: 'african', emotion: 'peace', scene_type: 'journey', character_type: 'elder' },
      { style: 'african', emotion: 'excitement', scene_type: 'gathering', character_type: 'group' },
      { style: 'african', emotion: 'fear', scene_type: 'forest', character_type: 'child_boy' },
      { style: 'african', emotion: 'sadness', scene_type: 'home', character_type: 'child_girl' },
      
      // Fantasy style - core combinations
      { style: 'fantasy', emotion: 'wonder', scene_type: 'spirit', character_type: 'child_boy' },
      { style: 'fantasy', emotion: 'wonder', scene_type: 'forest', character_type: 'child_girl' },
      { style: 'fantasy', emotion: 'joy', scene_type: 'village', character_type: 'group' },
      { style: 'fantasy', emotion: 'peace', scene_type: 'river', character_type: 'elder' },
      { style: 'fantasy', emotion: 'excitement', scene_type: 'journey', character_type: 'child_boy' },
      { style: 'fantasy', emotion: 'fear', scene_type: 'night', character_type: 'child_girl' },
    ];

    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < essentialCombos.length; i++) {
      onProgress?.(i + 1, essentialCombos.length);

      try {
        const result = await generateBatch({
          ...essentialCombos[i],
          action: 'standing',
          count: 1
        });

        if (result) {
          results.push(...(result.images || []));
          if (result.errors) errors.push(...result.errors);
        }
      } catch (err) {
        errors.push({ combo: essentialCombos[i], error: err });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { generated: results.length, images: results, errors };
  }, [generateBatch]);

  return {
    loading,
    error,
    stats,
    images,
    fetchStats,
    listImages,
    generateBatch,
    generateEssentials
  };
}
