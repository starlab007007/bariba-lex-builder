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
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const profileId = targetUserId || user?.id;

  useEffect(() => {
    if (profileId) {
      fetchFollowData();
    }
  }, [profileId, user?.id]);

  const fetchFollowData = async () => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      // Fetch followers (people who follow this user)
      const { data: followersData } = await supabase
        .from('tamtam_follows')
        .select('*')
        .eq('following_id', profileId);

      // Fetch following (people this user follows)
      const { data: followingData } = await supabase
        .from('tamtam_follows')
        .select('*')
        .eq('follower_id', profileId);

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

      // Fetch profiles for followers
      if (followersData && followersData.length > 0) {
        const followerIds = followersData.map(f => f.follower_id);
        const { data: profiles } = await supabase
          .from('tamtam_profiles')
          .select('id, username, display_name, avatar_url, bio_audio_url, user_id')
          .in('user_id', followerIds);
        
        const followersWithProfiles = followersData.map(f => ({
          ...f,
          profile: profiles?.find(p => p.user_id === f.follower_id)
        }));
        setFollowers(followersWithProfiles as FollowWithProfile[]);
      } else {
        setFollowers([]);
      }

      // Fetch profiles for following
      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from('tamtam_profiles')
          .select('id, username, display_name, avatar_url, bio_audio_url, user_id')
          .in('user_id', followingIds);
        
        const followingWithProfiles = followingData.map(f => ({
          ...f,
          profile: profiles?.find(p => p.user_id === f.following_id)
        }));
        setFollowing(followingWithProfiles as FollowWithProfile[]);
      } else {
        setFollowing([]);
      }
    } catch (err) {
      console.error('Error fetching follow data:', err);
    } finally {
      setLoading(false);
    }
  };

  const followUser = useCallback(async (userIdToFollow: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_follows')
        .insert({
          follower_id: user.id,
          following_id: userIdToFollow
        });

      if (error) throw error;

      // Create notification
      await supabase
        .from('tamtam_notifications')
        .insert({
          user_id: userIdToFollow,
          type: 'follow',
          actor_id: user.id
        });

      setIsFollowing(true);
      await fetchFollowData();
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
      await fetchFollowData();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const toggleFollow = useCallback(async (userIdToToggle: string) => {
    if (isFollowing) {
      return unfollowUser(userIdToToggle);
    } else {
      return followUser(userIdToToggle);
    }
  }, [isFollowing, followUser, unfollowUser]);

  return {
    followers,
    following,
    followersCount: followers.length,
    followingCount: following.length,
    isFollowing,
    loading,
    followUser,
    unfollowUser,
    toggleFollow,
    refetch: fetchFollowData
  };
}
