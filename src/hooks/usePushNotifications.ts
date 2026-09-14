import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { triggerFeedback, FeedbackType } from '@/utils/tamtamFeedback';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if notifications are supported
  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Send a notification
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available or not permitted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'tamtam-message',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Also trigger distinctive tam-tam sound for messages
      triggerFeedback('tamtam_message', { sound: true, haptic: true, volume: 0.5 });

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isSupported, permission]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    const channel = supabase
      .channel(uniqueChannelName('push-notifications'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tamtam_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          // Get sender info
          const { data: senderProfile } = await supabase
            .from('tamtam_profiles')
            .select('display_name, username')
            .eq('user_id', payload.new.sender_id)
            .single();

          const senderName = senderProfile?.display_name || senderProfile?.username || 'Quelqu\'un';

          // Only notify if tab is not focused
          if (document.hidden) {
            sendNotification(`🎤 ${senderName}`, {
              body: 'Vous a envoyé un message vocal',
              silent: false
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permission, sendNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    isEnabled: isSupported && permission === 'granted'
  };
}
