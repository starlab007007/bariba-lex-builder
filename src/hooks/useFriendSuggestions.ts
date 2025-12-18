import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FriendSuggestion {
  id: string;
  user_id: string;
  suggested_user_id: string;
  reason: string | null;
  mutual_friends_count: number;
  score: number;
  profile?: {
    user_id: string;
    display_name: string | null;
    username: string;
    avatar_url: string | null;
    location: string | null;
  };
}

export function useFriendSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const generateSuggestions = useCallback(async () => {
    if (!user) return;

    try {
      // Get current user's friends
      const { data: friendships } = await supabase
        .from('tamtam_friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = new Set<string>();
      friendships?.forEach(f => {
        if (f.requester_id === user.id) friendIds.add(f.addressee_id);
        else friendIds.add(f.requester_id);
      });

      // Get friends of friends
      const friendsOfFriends = new Map<string, number>();
      for (const friendId of friendIds) {
        const { data: fof } = await supabase
          .from('tamtam_friendships')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${friendId},addressee_id.eq.${friendId}`)
          .eq('status', 'accepted');

        fof?.forEach(f => {
          const otherUserId = f.requester_id === friendId ? f.addressee_id : f.requester_id;
          if (otherUserId !== user.id && !friendIds.has(otherUserId)) {
            friendsOfFriends.set(otherUserId, (friendsOfFriends.get(otherUserId) || 0) + 1);
          }
        });
      }

      // Get users from same communities
      const { data: myMemberships } = await supabase
        .from('tamtam_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const communityIds = myMemberships?.map(m => m.group_id) || [];
      
      if (communityIds.length > 0) {
        const { data: communityMembers } = await supabase
          .from('tamtam_group_members')
          .select('user_id')
          .in('group_id', communityIds)
          .neq('user_id', user.id);

        communityMembers?.forEach(m => {
          if (!friendIds.has(m.user_id)) {
            const current = friendsOfFriends.get(m.user_id) || 0;
            friendsOfFriends.set(m.user_id, current + 0.5); // Lower score for community members
          }
        });
      }

      // Sort and take top 10
      const sortedSuggestions = Array.from(friendsOfFriends.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sortedSuggestions.length === 0) {
        // Fallback: suggest random active users
        const { data: randomUsers } = await supabase
          .from('tamtam_profiles')
          .select('user_id')
          .neq('user_id', user.id)
          .order('last_seen_at', { ascending: false })
          .limit(10);

        randomUsers?.forEach(u => {
          if (!friendIds.has(u.user_id)) {
            sortedSuggestions.push([u.user_id, 0]);
          }
        });
      }

      // Fetch profiles
      const suggestedIds = sortedSuggestions.map(s => s[0]);
      const { data: profiles } = await supabase
        .from('tamtam_profiles')
        .select('user_id, display_name, username, avatar_url, location')
        .in('user_id', suggestedIds);

      const enrichedSuggestions: FriendSuggestion[] = sortedSuggestions.map(([userId, score]) => ({
        id: `suggestion_${userId}`,
        user_id: user.id,
        suggested_user_id: userId,
        reason: score >= 1 ? 'mutual_friends' : score > 0 ? 'same_community' : 'popular',
        mutual_friends_count: Math.floor(score),
        score,
        profile: profiles?.find(p => p.user_id === userId)
      }));

      setSuggestions(enrichedSuggestions);
    } catch (err) {
      console.error('Error generating suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const dismissSuggestion = useCallback((suggestedUserId: string) => {
    setSuggestions(prev => prev.filter(s => s.suggested_user_id !== suggestedUserId));
  }, []);

  return {
    suggestions,
    loading,
    dismissSuggestion,
    refresh: generateSuggestions
  };
}
