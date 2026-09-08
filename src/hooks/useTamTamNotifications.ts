import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { useAuth } from '@/contexts/AuthContext';
import { triggerFeedback, FeedbackType } from '@/utils/tamtamFeedback';

export interface TamTamNotification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'friend_accepted' | 'mention' | 'group_invite' | 'message' | 'share';
  actor_id: string | null;
  post_id: string | null;
  group_id: string | null;
  audio_description_url: string | null;
  is_read: boolean;
  created_at: string;
  actor_profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useTamTamNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TamTamNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      setupRealtime();
    }
  }, [user]);

  const setupRealtime = () => {
    if (!user) return;

    const channel = supabase
      .channel(uniqueChannelName('notifications-realtime'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as TamTamNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play distinctive sound based on notification type
          const soundMap: Record<string, FeedbackType> = {
            'message': 'tamtam_message',
            'friend_request': 'friend_request',
            'friend_accepted': 'friend_accepted',
            'follow': 'new_follower',
            'like': 'heart_like',
            'love': 'love',
            'comment': 'notification',
            'group_invite': 'group_invite',
            'mention': 'notification',
            'share': 'success'
          };
          
          const feedbackType = soundMap[newNotification.type] || 'notification';
          triggerFeedback(feedbackType, { sound: true, haptic: true, volume: 0.4 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch actor profiles
      if (data && data.length > 0) {
        const actorIds = [...new Set(data.filter(n => n.actor_id).map(n => n.actor_id))];
        
        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('tamtam_profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', actorIds as string[]);

          const notificationsWithProfiles = data.map(n => ({
            ...n,
            actor_profile: profiles?.find(p => p.user_id === n.actor_id)
          }));

          setNotifications(notificationsWithProfiles as TamTamNotification[]);
          setUnreadCount(notificationsWithProfiles.filter(n => !n.is_read).length);
        } else {
          setNotifications(data as TamTamNotification[]);
          setUnreadCount(data.filter(n => !n.is_read).length);
        }
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user, notifications]);

  const getNotificationMessage = (notification: TamTamNotification): string => {
    const actorName = notification.actor_profile?.display_name || notification.actor_profile?.username || 'Quelqu\'un';
    
    switch (notification.type) {
      case 'like':
        return `${actorName} a aimé votre publication`;
      case 'comment':
        return `${actorName} a commenté votre publication`;
      case 'follow':
        return `${actorName} a commencé à vous suivre`;
      case 'friend_request':
        return `${actorName} veut être votre ami`;
      case 'friend_accepted':
        return `${actorName} a accepté votre demande d'ami`;
      case 'mention':
        return `${actorName} vous a mentionné`;
      case 'group_invite':
        return `${actorName} vous invite à rejoindre un groupe`;
      case 'message':
        return `${actorName} vous a envoyé un message`;
      case 'share':
        return `${actorName} a partagé votre publication`;
      default:
        return 'Nouvelle notification';
    }
  };

  const getNotificationIcon = (type: TamTamNotification['type']): string => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👤';
      case 'friend_request': return '🤝';
      case 'friend_accepted': return '✅';
      case 'mention': return '@';
      case 'group_invite': return '👥';
      case 'message': return '📩';
      case 'share': return '🔄';
      default: return '🔔';
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationMessage,
    getNotificationIcon,
    refetch: fetchNotifications
  };
}
