import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyPost {
  id: string;
  audio_url: string;
  media_url?: string | null;
  media_type?: string | null;
  thumbnail_url?: string | null;
  transcript_fr?: string | null;
  transcript_ba?: string | null;
  feeling_emoji?: string | null;
  is_public: boolean;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  duration_seconds?: number | null;
}

export const useMyPosts = () => {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPosts([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('tamtam_posts')
        .select('id, audio_url, media_url, media_type, thumbnail_url, transcript_fr, transcript_ba, feeling_emoji, is_public, likes_count, comments_count, shares_count, created_at, duration_seconds')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPosts(data?.map(p => ({
        ...p,
        is_public: p.is_public ?? true,
        likes_count: p.likes_count ?? 0,
        comments_count: p.comments_count ?? 0,
        shares_count: p.shares_count ?? 0,
      })) || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching my posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleVisibility = useCallback(async (postId: string, isPublic: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('tamtam_posts')
        .update({ is_public: isPublic })
        .eq('id', postId);

      if (updateError) throw updateError;

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, is_public: isPublic } : p
      ));
      return true;
    } catch (err: any) {
      console.error('Error toggling visibility:', err);
      return false;
    }
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('tamtam_posts')
        .delete()
        .eq('id', postId);

      if (deleteError) throw deleteError;

      setPosts(prev => prev.filter(p => p.id !== postId));
      return true;
    } catch (err: any) {
      console.error('Error deleting post:', err);
      return false;
    }
  }, []);

  const updatePost = useCallback(async (postId: string, updates: Partial<Pick<MyPost, 'transcript_fr' | 'transcript_ba' | 'feeling_emoji' | 'is_public'>>) => {
    try {
      const { error: updateError } = await supabase
        .from('tamtam_posts')
        .update(updates)
        .eq('id', postId);

      if (updateError) throw updateError;

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, ...updates } : p
      ));
      return true;
    } catch (err: any) {
      console.error('Error updating post:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  const publicPosts = posts.filter(p => p.is_public);
  const privatePosts = posts.filter(p => !p.is_public);

  return {
    posts,
    publicPosts,
    privatePosts,
    loading,
    error,
    refetch: fetchMyPosts,
    toggleVisibility,
    deletePost,
    updatePost,
  };
};
