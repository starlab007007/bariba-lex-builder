import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export function usePresenceIndicator(userIds: string[] = []) {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});

  // Update own presence
  const updateOwnPresence = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('tamtam_profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user]);

  // Check if user is online (active within last 2 minutes)
  const isUserOnline = useCallback((lastSeenAt: string | null): boolean => {
    if (!lastSeenAt) return false;
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    return diffMinutes < 2;
  }, []);

  // Fetch presence for specified users
  const fetchPresence = useCallback(async () => {
    if (userIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('tamtam_profiles')
        .select('user_id, last_seen_at')
        .in('user_id', userIds);

      if (error) throw error;

      const newPresenceMap: Record<string, UserPresence> = {};
      data?.forEach(profile => {
        newPresenceMap[profile.user_id] = {
          userId: profile.user_id,
          isOnline: isUserOnline(profile.last_seen_at),
          lastSeenAt: profile.last_seen_at
        };
      });

      setPresenceMap(newPresenceMap);
    } catch (error) {
      console.error('Error fetching presence:', error);
    }
  }, [userIds, isUserOnline]);

  // Update own presence periodically
  useEffect(() => {
    if (!user) return;

    // Update immediately
    updateOwnPresence();

    // Update every 30 seconds
    const interval = setInterval(updateOwnPresence, 30000);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOwnPresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, updateOwnPresence]);

  // Fetch presence for tracked users
  useEffect(() => {
    fetchPresence();

    // Refresh presence every 30 seconds
    const interval = setInterval(fetchPresence, 30000);

    return () => clearInterval(interval);
  }, [fetchPresence]);

  // Get presence for a specific user
  const getPresence = useCallback((userId: string): UserPresence => {
    return presenceMap[userId] || {
      userId,
      isOnline: false,
      lastSeenAt: null
    };
  }, [presenceMap]);

  return {
    presenceMap,
    getPresence,
    isUserOnline,
    updateOwnPresence,
    refreshPresence: fetchPresence
  };
}
