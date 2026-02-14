import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePostInteractionsResult {
  isLiked: boolean;
  likesCount: number;
  toggleLike: () => Promise<void>;
  isBookmarked: boolean;
  toggleBookmark: () => Promise<void>;
  sharesCount: number;
  sharePost: (shareMethod?: string) => Promise<void>;
  isFollowing: boolean;
  toggleFollow: () => Promise<void>;
  currentUserId: string | null;
}

export function usePostInteractions(postId: string | null, authorId: string | null): UsePostInteractionsResult {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [sharesCount, setSharesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Load initial states from DB
  useEffect(() => {
    if (!currentUserId || !postId) return;

    const loadStates = async () => {
      // Parallel queries
      const [likeRes, bookmarkRes, likesCountRes, sharesCountRes] = await Promise.all([
        supabase.from('tamtam_reactions').select('id').eq('post_id', postId).eq('user_id', currentUserId).maybeSingle(),
        supabase.from('tamtam_bookmarks').select('id').eq('post_id', postId).eq('user_id', currentUserId).maybeSingle(),
        supabase.from('tamtam_reactions').select('id', { count: 'exact', head: true }).eq('post_id', postId),
        supabase.from('tamtam_shares').select('id', { count: 'exact', head: true }).eq('post_id', postId),
      ]);

      setIsLiked(!!likeRes.data);
      setIsBookmarked(!!bookmarkRes.data);
      setLikesCount(likesCountRes.count || 0);
      setSharesCount(sharesCountRes.count || 0);
    };

    loadStates();
  }, [currentUserId, postId]);

  // Load follow state
  useEffect(() => {
    if (!currentUserId || !authorId || currentUserId === authorId) return;

    supabase.from('tamtam_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', authorId)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [currentUserId, authorId]);

  const toggleLike = useCallback(async () => {
    if (!currentUserId || !postId) return;

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (wasLiked) {
        await supabase.from('tamtam_reactions').delete().eq('post_id', postId).eq('user_id', currentUserId);
      } else {
        await supabase.from('tamtam_reactions').insert({ post_id: postId, user_id: currentUserId, reaction_type: 'like' });
      }
      // Update likes_count on the post
      const { count } = await supabase.from('tamtam_reactions').select('id', { count: 'exact', head: true }).eq('post_id', postId);
      await supabase.from('tamtam_posts').update({ likes_count: count || 0 }).eq('id', postId);
    } catch {
      // Revert on error
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
  }, [currentUserId, postId, isLiked]);

  const toggleBookmark = useCallback(async () => {
    if (!currentUserId || !postId) return;

    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);

    try {
      if (wasBookmarked) {
        await supabase.from('tamtam_bookmarks').delete().eq('post_id', postId).eq('user_id', currentUserId);
      } else {
        await supabase.from('tamtam_bookmarks').insert({ post_id: postId, user_id: currentUserId });
      }
    } catch {
      setIsBookmarked(wasBookmarked);
    }
  }, [currentUserId, postId, isBookmarked]);

  const sharePost = useCallback(async (shareMethod: string = 'link') => {
    if (!currentUserId || !postId) return;

    try {
      await supabase.from('tamtam_shares').insert({ post_id: postId, user_id: currentUserId, shared_to: shareMethod });
      setSharesCount(prev => prev + 1);
      // Update shares_count on the post
      const { count } = await supabase.from('tamtam_shares').select('id', { count: 'exact', head: true }).eq('post_id', postId);
      await supabase.from('tamtam_posts').update({ shares_count: count || 0 }).eq('id', postId);
    } catch (err) {
      console.error('Share error:', err);
    }

    // Also trigger native share
    if (navigator.share) {
      navigator.share({ title: 'FITILA', url: `${window.location.origin}/fitila?video=${postId}` }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/fitila?video=${postId}`).catch(() => {});
    }
  }, [currentUserId, postId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUserId || !authorId || currentUserId === authorId) return;

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await supabase.from('tamtam_follows').delete().eq('follower_id', currentUserId).eq('following_id', authorId);
      } else {
        await supabase.from('tamtam_follows').insert({ follower_id: currentUserId, following_id: authorId });
      }
    } catch {
      setIsFollowing(wasFollowing);
    }
  }, [currentUserId, authorId, isFollowing]);

  return {
    isLiked, likesCount, toggleLike,
    isBookmarked, toggleBookmark,
    sharesCount, sharePost,
    isFollowing, toggleFollow,
    currentUserId,
  };
}
