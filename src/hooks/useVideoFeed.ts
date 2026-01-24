/**
 * Hook for fetching videos from the feed with realtime updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeedVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  templateId: string | null;
  templateName: string | null;
  duration: number;
  viewsCount: number;
  likesCount: number;
  sharesCount: number;
  createdAt: string;
  author: {
    id: string | null;
    name: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface UseVideoFeedReturn {
  videos: FeedVideo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useVideoFeed(): UseVideoFeedReturn {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const mappedVideos: FeedVideo[] = (data as any[]).map(v => ({
          id: v.id,
          videoUrl: v.video_url,
          thumbnailUrl: v.thumbnail_url,
          title: v.title,
          description: v.description,
          templateId: v.template_id,
          templateName: v.template_name,
          duration: v.duration_seconds || 30,
          viewsCount: v.views_count || 0,
          likesCount: v.likes_count || 0,
          sharesCount: v.shares_count || 0,
          createdAt: v.created_at,
          author: {
            id: v.user_id,
            name: v.template_name ? `Créateur ${v.template_name}` : 'Créateur FITILA',
            username: '@fitila_creator',
            avatarUrl: undefined
          }
        }));
        setVideos(mappedVideos);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();

    // Set up realtime subscription for new videos
    const channel = supabase
      .channel('videos-feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos'
        },
        (payload) => {
          console.log('New video added:', payload);
          // Refetch to get the complete data
          fetchVideos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos'
        },
        () => {
          // Refetch on updates (likes, views, etc.)
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVideos]);

  return {
    videos,
    isLoading,
    error,
    refetch: fetchVideos
  };
}

export default useVideoFeed;
