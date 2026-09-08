import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { useAuth } from '@/contexts/AuthContext';

export const useStoryViews = (storyId: string | null) => {
  const { user } = useAuth();
  const [viewCount, setViewCount] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch initial view count
  const fetchViewCount = useCallback(async () => {
    if (!storyId) return;
    
    try {
      const { count, error } = await supabase
        .from('tamtam_story_views')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);
      
      if (error) throw error;
      setViewCount(count || 0);
      
      // Check if current user has viewed
      if (user) {
        const { data } = await supabase
          .from('tamtam_story_views')
          .select('id')
          .eq('story_id', storyId)
          .eq('viewer_id', user.id)
          .maybeSingle();
        
        setHasViewed(!!data);
      }
    } catch (err) {
      console.error('[useStoryViews] Fetch error:', err);
    }
  }, [storyId, user]);

  // Record a view
  const recordView = useCallback(async () => {
    if (!storyId || !user || hasViewed) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tamtam_story_views')
        .upsert({
          story_id: storyId,
          viewer_id: user.id
        }, { onConflict: 'story_id,viewer_id' });
      
      if (error) throw error;
      
      setHasViewed(true);
      setViewCount(prev => prev + 1);
    } catch (err) {
      console.error('[useStoryViews] Record error:', err);
    } finally {
      setLoading(false);
    }
  }, [storyId, user, hasViewed]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!storyId) return;
    
    fetchViewCount();

    const channel = supabase
      .channel(uniqueChannelName(`story-views-${storyId}`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_story_views',
          filter: `story_id=eq.${storyId}`
        },
        () => {
          setViewCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId, fetchViewCount]);

  return { viewCount, hasViewed, recordView, loading };
};
