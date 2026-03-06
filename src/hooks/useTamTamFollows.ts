import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

interface FollowWithProfile extends Follow {
  profile?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio_audio_url: string | null;
  };
}

export function useTamTamFollows(targetUserId?: string) {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<FollowWithProfile[]>([]);
  const [following, setFollowing] = useState<FollowWithProfile[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const profileId = targetUserId || user?.id;

  useEffect(() => {
    if (profileId) {
      fetchFollowCounts();
    }
  }, [profileId, user?.id]);

  // Fast: only fetch counts using head:true
  const fetchFollowCounts = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('tamtam_follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', profileId),
        supabase
          .from('tamtam_follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', profileId),
      ]);

      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);

      // Check if current user follows the target
      if (user && targetUserId && user.id !== targetUserId) {
        const { data: followCheck } = await supabase
          .from('tamtam_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();
        setIsFollowing(!!followCheck);
      }
    } catch (err) {
      console.error('Error fetching follow counts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Lazy: load full profiles only when list is opened
  const fetchFollowersList = useCallback(async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from('tamtam_follows')
      .select('*')
      .eq('following_id', profileId);
    if (data && data.length > 0) {
      const ids = data.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from('tamtam_profiles')
        .select('id, username, display_name, avatar_url, bio_audio_url, user_id')
        .in('user_id', ids);
      setFollowers(data.map(f => ({
        ...f,
        profile: profiles?.find(p => p.user_id === f.follower_id)
      })) as FollowWithProfile[]);
    } else {
      setFollowers([]);
    }
  }, [profileId]);

  const fetchFollowingList = useCallback(async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from('tamtam_follows')
      .select('*')
      .eq('follower_id', profileId);
    if (data && data.length > 0) {
      const ids = data.map(f => f.following_id);
      const { data: profiles } = await supabase
        .from('tamtam_profiles')
        .select('id, username, display_name, avatar_url, bio_audio_url, user_id')
        .in('user_id', ids);
      setFollowing(data.map(f => ({
        ...f,
        profile: profiles?.find(p => p.user_id === f.following_id)
      })) as FollowWithProfile[]);
    } else {
      setFollowing([]);
    }
  }, [profileId]);

  const followUser = useCallback(async (userIdToFollow: string) => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const { error } = await supabase
        .from('tamtam_follows')
        .insert({ follower_id: user.id, following_id: userIdToFollow });
      if (error) throw error;

      await supabase
        .from('tamtam_notifications')
        .insert({ user_id: userIdToFollow, type: 'follow', actor_id: user.id });

      setIsFollowing(true);
      setFollowersCount(c => c + 1);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const unfollowUser = useCallback(async (userIdToUnfollow: string) => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const { error } = await supabase
        .from('tamtam_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userIdToUnfollow);
      if (error) throw error;

      setIsFollowing(false);
      setFollowersCount(c => Math.max(0, c - 1));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const toggleFollow = useCallback(async (userIdToToggle: string) => {
    if (isFollowing) return unfollowUser(userIdToToggle);
    else return followUser(userIdToToggle);
  }, [isFollowing, followUser, unfollowUser]);

  return {
    followers,
    following,
    followersCount,
    followingCount,
    isFollowing,
    loading,
    followUser,
    unfollowUser,
    toggleFollow,
    fetchFollowersList,
    fetchFollowingList,
    refetch: fetchFollowCounts
  };
}
