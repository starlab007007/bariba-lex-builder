/**
 * Hook for fetching videos from the feed with realtime updates
 * OPTIMIZED: Pagination, caching, and memory-efficient loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  metadata: Record<string, any> | null;
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
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const PAGE_SIZE = 15; // Reduced from 50 for faster initial load

export function useVideoFeed(): UseVideoFeedReturn {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchVideos = useCallback(async (reset = true) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      setError(null);
      if (reset) {
        setIsLoading(true);
        offsetRef.current = 0;
      }
      
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*, tamtam_profiles!videos_user_id_fkey(user_id, username, display_name, avatar_url, is_verified)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

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
          metadata: v.metadata || null,
          author: {
            id: v.user_id,
            name: v.tamtam_profiles?.display_name || v.template_name || 'Créateur FITILA',
            username: v.tamtam_profiles?.username ? `@${v.tamtam_profiles.username}` : '@fitila_user',
            avatarUrl: v.tamtam_profiles?.avatar_url || undefined
          }
        }));
        
        if (reset) {
          setVideos(mappedVideos);
        } else {
          setVideos(prev => [...prev, ...mappedVideos]);
        }
        
        setHasMore(data.length === PAGE_SIZE);
        offsetRef.current += data.length;
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingRef.current) return;
    await fetchVideos(false);
  }, [hasMore, fetchVideos]);

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
          // Add new video to top of list instead of full refetch
          const v = payload.new as any;
          if (v.is_public) {
            const newVideo: FeedVideo = {
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
              metadata: v.metadata || null,
              author: {
                id: v.user_id,
                name: v.template_name || 'Créateur FITILA',
                username: '@fitila_user',
                avatarUrl: undefined
              }
            };
            setVideos(prev => [newVideo, ...prev]);
          }
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
    refetch: () => fetchVideos(true),
    loadMore,
    hasMore
  };
}

export default useVideoFeed;
