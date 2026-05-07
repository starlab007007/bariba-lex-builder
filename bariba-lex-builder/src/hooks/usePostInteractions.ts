import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

// Module-level cache to avoid refetching the same post interactions
const interactionsCache = new Map<string, { isLiked: boolean; isBookmarked: boolean; likesCount: number; sharesCount: number; ts: number }>();
const followCache = new Map<string, { isFollowing: boolean; ts: number }>();
const CACHE_TTL = 60_000; // 60s

// Module-level user id cache
let cachedUserId: string | null = null;
let userIdPromise: Promise<string | null> | null = null;

function getCachedUserId(): Promise<string | null> {
  if (cachedUserId !== null) return Promise.resolve(cachedUserId);
  if (!userIdPromise) {
    userIdPromise = supabase.auth.getUser().then(({ data }) => {
      cachedUserId = data.user?.id || null;
      return cachedUserId;
    });
  }
  return userIdPromise;
}

export function usePostInteractions(postId: string | null, authorId: string | null): UsePostInteractionsResult {
  const [currentUserId, setCurrentUserId] = useState<string | null>(cachedUserId);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [sharesCount, setSharesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Get current user (cached)
  useEffect(() => {
    getCachedUserId().then(id => setCurrentUserId(id));
  }, []);

  // Load initial states from DB with cache
  useEffect(() => {
    if (!currentUserId || !postId) return;

    const cacheKey = `${postId}_${currentUserId}`;
    const cached = interactionsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setIsLiked(cached.isLiked);
      setIsBookmarked(cached.isBookmarked);
      setLikesCount(cached.likesCount);
      setSharesCount(cached.sharesCount);
      return;
    }

    const loadStates = async () => {
      const [likeRes, bookmarkRes, likesCountRes, sharesCountRes] = await Promise.all([
        supabase.from('tamtam_reactions').select('id').eq('post_id', postId).eq('user_id', currentUserId).maybeSingle(),
        supabase.from('tamtam_bookmarks').select('id').eq('post_id', postId).eq('user_id', currentUserId).maybeSingle(),
        supabase.from('tamtam_reactions').select('id', { count: 'exact', head: true }).eq('post_id', postId),
        supabase.from('tamtam_shares').select('id', { count: 'exact', head: true }).eq('post_id', postId),
      ]);

      const state = {
        isLiked: !!likeRes.data,
        isBookmarked: !!bookmarkRes.data,
        likesCount: likesCountRes.count || 0,
        sharesCount: sharesCountRes.count || 0,
        ts: Date.now(),
      };
      interactionsCache.set(cacheKey, state);

      setIsLiked(state.isLiked);
      setIsBookmarked(state.isBookmarked);
      setLikesCount(state.likesCount);
      setSharesCount(state.sharesCount);
    };

    loadStates();
  }, [currentUserId, postId]);

  // Load follow state with cache
  useEffect(() => {
    if (!currentUserId || !authorId || currentUserId === authorId) return;

    const followKey = `${currentUserId}_${authorId}`;
    const cached = followCache.get(followKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setIsFollowing(cached.isFollowing);
      return;
    }

    supabase.from('tamtam_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', authorId)
      .maybeSingle()
      .then(({ data }) => {
        const val = !!data;
        followCache.set(followKey, { isFollowing: val, ts: Date.now() });
        setIsFollowing(val);
      });
  }, [currentUserId, authorId]);

  const toggleLike = useCallback(async () => {
    if (!currentUserId) {
      toast({ title: '🔐 Connexion requise', description: 'Connectez-vous pour aimer cette publication', variant: 'destructive' });
      return;
    }
    if (!postId) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (wasLiked) {
        await supabase.from('tamtam_reactions').delete().eq('post_id', postId).eq('user_id', currentUserId);
      } else {
        await supabase.from('tamtam_reactions').insert({ post_id: postId, user_id: currentUserId, reaction_type: 'like' });
      }
      const { count } = await supabase.from('tamtam_reactions').select('id', { count: 'exact', head: true }).eq('post_id', postId);
      await supabase.from('tamtam_posts').update({ likes_count: count || 0 }).eq('id', postId);
    } catch {
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
  }, [currentUserId, postId, isLiked]);

  const toggleBookmark = useCallback(async () => {
    if (!currentUserId) {
      toast({ title: '🔐 Connexion requise', description: 'Connectez-vous pour sauvegarder cette publication', variant: 'destructive' });
      return;
    }
    if (!postId) return;

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
    // Native share always works (no auth needed for copying link)
    const postUrl = `${window.location.origin}/fitila/social?video=${postId}`;
    
    if (!currentUserId) {
      toast({ title: '🔐 Connexion requise', description: 'Connectez-vous pour partager cette publication', variant: 'destructive' });
      // Still allow native share/copy
      if (navigator.share) {
        navigator.share({ title: 'FITILA', text: 'Découvre cette publication sur FITILA !', url: postUrl }).catch(() => {});
      } else {
        navigator.clipboard.writeText(postUrl).catch(() => {});
      }
      return;
    }
    if (!postId) return;

    try {
      await supabase.from('tamtam_shares').insert({ post_id: postId, user_id: currentUserId, shared_to: shareMethod });
      setSharesCount(prev => prev + 1);
      const { count } = await supabase.from('tamtam_shares').select('id', { count: 'exact', head: true }).eq('post_id', postId);
      await supabase.from('tamtam_posts').update({ shares_count: count || 0 }).eq('id', postId);
    } catch (err) {
      console.error('Share error:', err);
    }

    if (navigator.share) {
      navigator.share({ title: 'FITILA', text: 'Découvre cette publication sur FITILA !', url: postUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(postUrl).catch(() => {});
    }
  }, [currentUserId, postId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUserId) {
      toast({ title: '🔐 Connexion requise', description: 'Connectez-vous pour suivre cet utilisateur', variant: 'destructive' });
      return;
    }
    if (!authorId || currentUserId === authorId) return;

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
