import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  responded_at: string | null;
}

interface FriendWithProfile extends Friendship {
  profile?: {
    id: string;
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio_audio_url: string | null;
    last_seen_at: string | null;
  };
}

export function useTamTamFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFriends();
      const cleanup = setupRealtime();
      return cleanup;
    }
  }, [user]);

  const setupRealtime = () => {
    if (!user) return;

    const channel = supabase
      .channel('friendships-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tamtam_friendships',
          filter: `requester_id=eq.${user.id}`
        },
        () => fetchFriends()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tamtam_friendships',
          filter: `addressee_id=eq.${user.id}`
        },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all friendships involving current user
      const { data: friendships } = await supabase
        .from('tamtam_friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships) {
        setFriends([]);
        setPendingRequests([]);
        setSentRequests([]);
        setLoading(false);
        return;
      }

      // Collect all user IDs to fetch profiles
      const userIds = new Set<string>();
      friendships.forEach(f => {
        userIds.add(f.requester_id);
        userIds.add(f.addressee_id);
      });

      // Fetch all profiles at once
      const { data: profiles } = await supabase
        .from('tamtam_profiles')
        .select('id, user_id, username, display_name, avatar_url, bio_audio_url, last_seen_at')
        .in('user_id', Array.from(userIds));

      // Categorize friendships
      const accepted: FriendWithProfile[] = [];
      const pending: FriendWithProfile[] = [];
      const sent: FriendWithProfile[] = [];

      friendships.forEach(f => {
        const otherUserId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const profile = profiles?.find(p => p.user_id === otherUserId);
        const friendshipWithProfile = { ...f, profile } as FriendWithProfile;

        if (f.status === 'accepted') {
          accepted.push(friendshipWithProfile);
        } else if (f.status === 'pending') {
          if (f.addressee_id === user.id) {
            pending.push(friendshipWithProfile);
          } else {
            sent.push(friendshipWithProfile);
          }
        }
      });

      setFriends(accepted);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = useCallback(async (addresseeId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending'
        });

      if (error) throw error;

      // Create notification
      await supabase
        .from('tamtam_notifications')
        .insert({
          user_id: addresseeId,
          type: 'friend_request',
          actor_id: user.id
        });

      await fetchFriends();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const acceptFriendRequest = useCallback(async (friendshipId: string, requesterId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_friendships')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', friendshipId);

      if (error) throw error;

      // Create notification for requester
      await supabase
        .from('tamtam_notifications')
        .insert({
          user_id: requesterId,
          type: 'friend_accepted',
          actor_id: user.id
        });

      await fetchFriends();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const rejectFriendRequest = useCallback(async (friendshipId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_friendships')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchFriends();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchFriends();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const getFriendshipStatus = useCallback((otherUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'friends' => {
    const friend = friends.find(f => 
      f.requester_id === otherUserId || f.addressee_id === otherUserId
    );
    if (friend) return 'friends';

    const sent = sentRequests.find(f => f.addressee_id === otherUserId);
    if (sent) return 'pending_sent';

    const received = pendingRequests.find(f => f.requester_id === otherUserId);
    if (received) return 'pending_received';

    return 'none';
  }, [friends, pendingRequests, sentRequests]);

  return {
    friends,
    friendsCount: friends.length,
    pendingRequests,
    pendingCount: pendingRequests.length,
    sentRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendshipStatus,
    refetch: fetchFriends
  };
}
