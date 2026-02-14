import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PublicProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio_audio_url: string | null;
  bio_transcript_fr: string | null;
  bio_transcript_ba: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  friends_count: number;
  created_at: string;
}

interface UserPost {
  id: string;
  user_id: string | null;
  audio_url: string;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  transcript_fr: string | null;
  transcript_ba: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export function usePublicProfile(userId: string | undefined) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  const isOwnProfile = user?.id === userId;

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('tamtam_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user posts
      const { data: postsData, error: postsError } = await supabase
        .from('tamtam_posts')
        .select('id, user_id, audio_url, media_type, media_url, thumbnail_url, transcript_fr, transcript_ba, likes_count, comments_count, created_at')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!postsError) {
        setPosts(postsData || []);
      }

      // Check follow status
      if (user?.id && user.id !== userId) {
        const { data: followData } = await supabase
          .from('tamtam_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .single();

        setIsFollowing(!!followData);

        // Check friend status
        const { data: friendData } = await supabase
          .from('tamtam_friendships')
          .select('status')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .single();

        if (friendData) {
          setFriendStatus(friendData.status === 'accepted' ? 'accepted' : 'pending');
        } else {
          setFriendStatus('none');
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const followUser = async () => {
    if (!user?.id || !userId) return;

    try {
      if (isFollowing) {
        await supabase
          .from('tamtam_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        setIsFollowing(false);
      } else {
        await supabase
          .from('tamtam_follows')
          .insert({ follower_id: user.id, following_id: userId });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const sendFriendRequest = async () => {
    if (!user?.id || !userId || friendStatus !== 'none') return;

    try {
      await supabase
        .from('tamtam_friendships')
        .insert({ requester_id: user.id, addressee_id: userId, status: 'pending' });
      setFriendStatus('pending');
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  return {
    profile,
    posts,
    isLoading,
    isOwnProfile,
    isFollowing,
    friendStatus,
    followUser,
    sendFriendRequest,
    refetch: fetchProfile
  };
}
