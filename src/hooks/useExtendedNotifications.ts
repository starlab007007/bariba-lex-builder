import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { usePushNotifications } from './usePushNotifications';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export function useExtendedNotifications() {
  const { user } = useAuth();
  const { sendNotification, isEnabled, permission } = usePushNotifications();

  // Subscribe to reactions on user's posts
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    // Subscribe to likes on user's posts
    const reactionsChannel = supabase
      .channel(uniqueChannelName('reaction-notifications'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_reactions'
        },
        async (payload) => {
          // Check if this reaction is on the user's post
          const { data: post } = await supabase
            .from('tamtam_posts')
            .select('user_id')
            .eq('id', payload.new.post_id)
            .single();

          if (post?.user_id === user.id && payload.new.user_id !== user.id) {
            // Get reactor info
            const { data: reactor } = await supabase
              .from('tamtam_profiles')
              .select('display_name, username')
              .eq('user_id', payload.new.user_id)
              .single();

            const reactorName = reactor?.display_name || reactor?.username || 'Quelqu\'un';
            const reactionEmoji = getReactionEmoji(payload.new.reaction_type);

            if (document.hidden) {
              sendNotification(`${reactionEmoji} ${reactorName}`, {
                body: 'A aimé votre publication',
                tag: 'tamtam-reaction'
              });
            }
            triggerFeedback('heart_like', { haptic: true });
          }
        }
      )
      .subscribe();

    // Subscribe to comments on user's posts
    const commentsChannel = supabase
      .channel(uniqueChannelName('comment-notifications'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_comments'
        },
        async (payload) => {
          // Check if this comment is on the user's post
          const { data: post } = await supabase
            .from('tamtam_posts')
            .select('user_id')
            .eq('id', payload.new.post_id)
            .single();

          if (post?.user_id === user.id && payload.new.user_id !== user.id) {
            // Get commenter info
            const { data: commenter } = await supabase
              .from('tamtam_profiles')
              .select('display_name, username')
              .eq('user_id', payload.new.user_id)
              .single();

            const commenterName = commenter?.display_name || commenter?.username || 'Quelqu\'un';

            if (document.hidden) {
              sendNotification(`💬 ${commenterName}`, {
                body: 'A commenté votre publication',
                tag: 'tamtam-comment'
              });
            }
            triggerFeedback('notification', { haptic: true });
          }
        }
      )
      .subscribe();

    // Subscribe to follows
    const followsChannel = supabase
      .channel(uniqueChannelName('follow-notifications'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_follows',
          filter: `following_id=eq.${user.id}`
        },
        async (payload) => {
          // Get follower info
          const { data: follower } = await supabase
            .from('tamtam_profiles')
            .select('display_name, username')
            .eq('user_id', payload.new.follower_id)
            .single();

          const followerName = follower?.display_name || follower?.username || 'Quelqu\'un';

          if (document.hidden) {
            sendNotification(`👤 ${followerName}`, {
              body: 'A commencé à vous suivre',
              tag: 'tamtam-follow'
            });
          }
          triggerFeedback('success', { haptic: true });
        }
      )
      .subscribe();

    // Subscribe to friend requests
    const friendsChannel = supabase
      .channel(uniqueChannelName('friend-notifications'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_friendships',
          filter: `addressee_id=eq.${user.id}`
        },
        async (payload) => {
          // Get requester info
          const { data: requester } = await supabase
            .from('tamtam_profiles')
            .select('display_name, username')
            .eq('user_id', payload.new.requester_id)
            .single();

          const requesterName = requester?.display_name || requester?.username || 'Quelqu\'un';

          if (document.hidden) {
            sendNotification(`🤝 ${requesterName}`, {
              body: 'Veut être votre ami(e)',
              tag: 'tamtam-friend'
            });
          }
          triggerFeedback('notification', { haptic: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(friendsChannel);
    };
  }, [user, permission, sendNotification]);

  return { isEnabled };
}

function getReactionEmoji(type: string): string {
  const emojis: Record<string, string> = {
    'like': '👍',
    'love': '❤️',
    'fire': '🔥',
    'laugh': '😂',
    'sad': '😢',
    'wow': '😮'
  };
  return emojis[type] || '❤️';
}
