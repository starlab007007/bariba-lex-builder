import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StoryViewsState {
  viewCount: number;
  isLoading: boolean;
  hasViewed: boolean;
}

export const useStoryViews = (storyId: string | null) => {
  const { user } = useAuth();
  const [state, setState] = useState<StoryViewsState>({
    viewCount: 0,
    isLoading: true,
    hasViewed: false
  });

  // Fetch initial view count
  useEffect(() => {
    if (!storyId) return;

    const fetchViews = async () => {
      const { count, error } = await supabase
        .from('tamtam_story_views')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);

      if (!error) {
        setState(prev => ({ ...prev, viewCount: count || 0, isLoading: false }));
      }
    };

    fetchViews();
  }, [storyId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!storyId) return;

    const channel = supabase
      .channel(`story-views-${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_story_views',
          filter: `story_id=eq.${storyId}`
        },
        () => {
          setState(prev => ({ ...prev, viewCount: prev.viewCount + 1 }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId]);

  // Record a view
  const recordView = useCallback(async () => {
    if (!storyId || !user || state.hasViewed) return;

    try {
      const { error } = await supabase
        .from('tamtam_story_views')
        .upsert(
          { story_id: storyId, viewer_id: user.id },
          { onConflict: 'story_id,viewer_id' }
        );

      if (!error) {
        setState(prev => ({ ...prev, hasViewed: true }));
        
        // Update the views_count on the story itself
        await supabase
          .from('tamtam_stories')
          .update({ views_count: state.viewCount + 1 })
          .eq('id', storyId);
      }
    } catch (err) {
      console.error('Error recording view:', err);
    }
  }, [storyId, user, state.hasViewed, state.viewCount]);

  return {
    viewCount: state.viewCount,
    isLoading: state.isLoading,
    hasViewed: state.hasViewed,
    recordView
  };
};
