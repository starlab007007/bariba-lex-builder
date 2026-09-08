import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { useAuth } from '@/contexts/AuthContext';
import { tamtamFeedback, FeedbackType } from '@/utils/tamtamFeedback';

export type StoryReactionType = 'love' | 'fire' | 'applause' | 'wow' | 'pray';

interface ReactionCounts {
  love: number;
  fire: number;
  applause: number;
  wow: number;
  pray: number;
}

const reactionToFeedback: Record<StoryReactionType, FeedbackType> = {
  love: 'love',
  fire: 'like',
  applause: 'success',
  wow: 'wow',
  pray: 'pray'
};

export const useStoryReactions = (storyId: string | null) => {
  const { user } = useAuth();
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({
    love: 0,
    fire: 0,
    applause: 0,
    wow: 0,
    pray: 0
  });
  const [userReaction, setUserReaction] = useState<StoryReactionType | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch reactions
  const fetchReactions = useCallback(async () => {
    if (!storyId) return;
    
    try {
      const { data, error } = await supabase
        .from('tamtam_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', storyId);
      
      if (error) throw error;
      
      const counts: ReactionCounts = { love: 0, fire: 0, applause: 0, wow: 0, pray: 0 };
      
      data?.forEach(reaction => {
        const type = reaction.reaction_type as StoryReactionType;
        if (counts[type] !== undefined) {
          counts[type]++;
        }
        if (user && reaction.user_id === user.id) {
          setUserReaction(type);
        }
      });
      
      setReactionCounts(counts);
    } catch (err) {
      console.error('[useStoryReactions] Fetch error:', err);
    }
  }, [storyId, user]);

  // Add reaction
  const addReaction = useCallback(async (type: StoryReactionType) => {
    if (!storyId || !user) return;
    
    setLoading(true);
    try {
      // Remove previous reaction if exists
      if (userReaction) {
        await supabase
          .from('tamtam_reactions')
          .delete()
          .eq('post_id', storyId)
          .eq('user_id', user.id);
        
        setReactionCounts(prev => ({
          ...prev,
          [userReaction]: Math.max(0, prev[userReaction] - 1)
        }));
      }
      
      // Add new reaction
      const { error } = await supabase
        .from('tamtam_reactions')
        .insert({
          post_id: storyId,
          user_id: user.id,
          reaction_type: type
        });
      
      if (error) throw error;
      
      setUserReaction(type);
      setReactionCounts(prev => ({
        ...prev,
        [type]: prev[type] + 1
      }));
      
      // Trigger feedback
      tamtamFeedback.trigger(reactionToFeedback[type]);
      
    } catch (err) {
      console.error('[useStoryReactions] Add reaction error:', err);
    } finally {
      setLoading(false);
    }
  }, [storyId, user, userReaction]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!storyId) return;
    
    fetchReactions();

    const channel = supabase
      .channel(uniqueChannelName(`story-reactions-${storyId}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tamtam_reactions',
          filter: `post_id=eq.${storyId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId, fetchReactions]);

  return { reactionCounts, userReaction, addReaction, loading, totalReactions: Object.values(reactionCounts).reduce((a, b) => a + b, 0) };
};
