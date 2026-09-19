import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TamTamPost {
  id: string;
  user_id: string | null;
  audio_url: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  transcript_fr: string | null;
  transcript_ba: string | null;
  feeling_emoji: string | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  duration_seconds: number | null;
  created_at: string | null;
  product_id?: string | null;
  product?: {
    id: string;
    title: string;
    title_fr: string | null;
    title_ba: string | null;
    price: number | null;
    currency: string | null;
    category: string | null;
    location: string | null;
    status: string | null;
    thumbnail_url: string | null;
    images: string[] | null;
  } | null;
  // Joined data
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  reactions?: {
    like: number;
    love: number;
    laugh: number;
    wow: number;
    pray: number;
  };
  userReaction?: string | null;
}

export interface TamTamComment {
  id: string;
  post_id: string;
  user_id: string | null;
  audio_url: string;
  transcript_fr: string | null;
  transcript_ba: string | null;
  duration_seconds: number | null;
  created_at: string | null;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface TamTamStory {
  id: string;
  user_id: string | null;
  audio_url: string;
  photo_url: string | null;
  transcript_fr: string | null;
  transcript_ba: string | null;
  duration_seconds: number | null;
  views_count: number | null;
  expires_at: string | null;
  created_at: string | null;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Helper pour uploader les médias vers Supabase Storage
// ✅ FIX: MIME-aware upload - respects blob.type for cross-device compatibility
export async function uploadMediaToStorage(
  blob: Blob, 
  type: 'video' | 'photo' | 'audio',
  userId: string
): Promise<string> {
  // ✅ Derive extension and contentType from actual blob.type
  const blobType = blob.type || '';
  
  let ext: string;
  let contentType: string;
  
  if (type === 'video') {
    if (blobType.includes('mp4')) {
      ext = 'mp4';
      contentType = 'video/mp4';
    } else if (blobType.includes('quicktime')) {
      ext = 'mov';
      contentType = 'video/quicktime';
    } else {
      ext = 'webm';
      contentType = 'video/webm';
    }
  } else if (type === 'photo') {
    if (blobType.includes('png')) {
      ext = 'png';
      contentType = 'image/png';
    } else if (blobType.includes('webp')) {
      ext = 'webp';
      contentType = 'image/webp';
    } else {
      ext = 'jpg';
      contentType = 'image/jpeg';
    }
  } else {
    // Audio
    if (blobType.includes('mp4') || blobType.includes('m4a')) {
      ext = 'm4a';
      contentType = 'audio/mp4';
    } else if (blobType.includes('mpeg') || blobType.includes('mp3')) {
      ext = 'mp3';
      contentType = 'audio/mpeg';
    } else {
      ext = 'webm';
      contentType = 'audio/webm';
    }
  }
  
  console.log(`📤 Upload: type=${type}, blob.type=${blobType} -> ext=${ext}, contentType=${contentType}`);
  
  const fileName = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${userId}/posts/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('tamtam-media')
    .upload(filePath, blob, {
      contentType,
      upsert: false
    });
    
  if (error) throw new Error(`Upload failed: ${error.message}`);
  
  const { data: urlData } = supabase.storage
    .from('tamtam-media')
    .getPublicUrl(filePath);
    
  console.log(`✅ Uploaded: ${filePath} -> ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

export const useTamTamPosts = () => {
  const [posts, setPosts] = useState<TamTamPost[]>([]);
  const [stories, setStories] = useState<TamTamStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_posts')
        .select(`
          *,
          profile:tamtam_profiles!tamtam_posts_user_id_fkey(username, display_name, avatar_url),
          product:tamtam_products!tamtam_posts_product_id_fkey(id, title, title_fr, title_ba, price, currency, category, location, status, thumbnail_url, images)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // ✅ OPTIMIZED: Single query for all reactions instead of N queries
      const postIds = (data || []).map(p => p.id);
      const { data: allReactions } = postIds.length > 0 
        ? await supabase
            .from('tamtam_reactions')
            .select('post_id, reaction_type')
            .in('post_id', postIds)
        : { data: [] };

      // Group reactions by post
      const reactionsByPost = new Map<string, { like: number; love: number; laugh: number; wow: number; pray: number }>();
      allReactions?.forEach(r => {
        if (!reactionsByPost.has(r.post_id)) {
          reactionsByPost.set(r.post_id, { like: 0, love: 0, laugh: 0, wow: 0, pray: 0 });
        }
        const counts = reactionsByPost.get(r.post_id)!;
        if (r.reaction_type in counts) {
          counts[r.reaction_type as keyof typeof counts]++;
        }
      });

      const postsWithReactions = (data || []).map(post => ({
        ...post,
        profile: Array.isArray(post.profile) ? post.profile[0] : post.profile,
        product: Array.isArray(post.product) ? post.product[0] : post.product,
        reactions: reactionsByPost.get(post.id) || { like: 0, love: 0, laugh: 0, wow: 0, pray: 0 }
      }));

      setPosts(postsWithReactions);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tamtam_stories')
        .select(`
          *,
          profile:tamtam_profiles!tamtam_stories_user_id_fkey(username, display_name, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStories((data || []).map(story => ({
        ...story,
        profile: Array.isArray(story.profile) ? story.profile[0] : story.profile
      })));
    } catch (err: any) {
      console.error('Error fetching stories:', err);
    }
  }, []);

  const createPost = useCallback(async (postData: {
    audio_url?: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    feeling_emoji?: string;
    duration_seconds?: number;
    topic?: string;
    template_id?: string;
    // ✅ NEW: Kuaishou-style metadata
    allow_duo?: boolean;
    music_id?: string;
    hashtags?: string[];
    cover_url?: string;
    product_id?: string | null;
  }) => {
    console.log('[useTamTamPosts.createPost] Starting post creation...');
    console.log('[useTamTamPosts.createPost] Post data:', JSON.stringify(postData, null, 2));
    
    try {
      // Vérification préalable de l'authentification
      const { data: userData, error: authError } = await supabase.auth.getUser();
      console.log('[useTamTamPosts.createPost] Auth check:', { 
        hasUser: !!userData?.user, 
        userId: userData?.user?.id,
        authError: authError?.message 
      });
      
      if (!userData?.user) {
        console.error('[useTamTamPosts.createPost] Auth failed - user not authenticated');
        toast({ 
          title: "🔐 Connexion requise", 
          description: "Connectez-vous pour publier", 
          variant: "destructive" 
        });
        throw new Error('Veuillez vous connecter pour publier');
      }

      // ✅ Auto-create profile if missing (prevents FK constraint error)
      const { data: existingProfile } = await supabase
        .from('tamtam_profiles')
        .select('user_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!existingProfile) {
        console.log('[useTamTamPosts.createPost] Auto-creating missing profile...');
        const shortId = userData.user.id.replace(/-/g, '').slice(0, 8);
        const { error: profileError } = await supabase.from('tamtam_profiles').insert({
          user_id: userData.user.id,
          username: `user_${shortId}`,
          display_name: userData.user.user_metadata?.display_name || 'Utilisateur'
        });
        if (profileError) {
          console.warn('[useTamTamPosts.createPost] Profile creation failed:', profileError.message);
        }
      }

      const durationSeconds =
        typeof postData.duration_seconds === 'number' && Number.isFinite(postData.duration_seconds)
          ? Math.max(0, Math.round(postData.duration_seconds))
          : null;

      const insertData = {
        user_id: userData.user.id,
        audio_url: postData.audio_url || null,
        media_type: postData.media_type || 'audio',
        media_url: postData.media_url || null,
        thumbnail_url: postData.thumbnail_url || postData.cover_url || null, // ✅ Support cover_url
        transcript_fr: postData.transcript_fr || null,
        transcript_ba: postData.transcript_ba || null,
        feeling_emoji: postData.feeling_emoji || null,
        duration_seconds: durationSeconds,
        topic: postData.topic || null,
        template_id: postData.template_id || null,
        hashtags: postData.hashtags || null, // ✅ Hashtags array
        product_id: postData.product_id || null,
        is_public: true
      };
      
      console.log('[useTamTamPosts.createPost] Inserting into tamtam_posts:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('tamtam_posts')
        .insert(insertData)
        .select()
        .single();

      console.log('[useTamTamPosts.createPost] Insert result:', { 
        success: !error, 
        dataId: data?.id,
        error: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint
      });

      if (error) {
        console.error('[useTamTamPosts.createPost] Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Erreur base de données: ${error.message} (${error.code})`);
      }

      console.log('[useTamTamPosts.createPost] Post created successfully:', data?.id);
      toast({ title: "✅ Publication créée !" });
      await fetchPosts();
      return data;
    } catch (err: any) {
      console.error('[useTamTamPosts.createPost] Final error:', err);
      toast({ 
        title: "Erreur de publication", 
        description: err.message || 'Erreur inconnue', 
        variant: "destructive" 
      });
      throw err;
    }
  }, [fetchPosts, toast]);

  const addReaction = useCallback(async (postId: string, reactionType: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check if user already reacted
      const { data: existing } = await supabase
        .from('tamtam_reactions')
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userData.user.id)
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          await supabase.from('tamtam_reactions').delete().eq('id', existing.id);
        } else {
          // Update reaction
          await supabase
            .from('tamtam_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existing.id);
        }
      } else {
        // Add new reaction
        await supabase.from('tamtam_reactions').insert({
          post_id: postId,
          user_id: userData.user.id,
          reaction_type: reactionType
        });
      }

      // Play sound feedback
      const audio = new Audio();
      audio.volume = 0.3;
      
      await fetchPosts();
    } catch (err: any) {
      console.error('Error adding reaction:', err);
    }
  }, [fetchPosts]);

  const fetchComments = useCallback(async (postId: string): Promise<TamTamComment[]> => {
    try {
      const { data, error } = await supabase
        .from('tamtam_comments')
        .select(`
          *,
          profile:tamtam_profiles!tamtam_comments_user_id_fkey(username, display_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(comment => ({
        ...comment,
        profile: Array.isArray(comment.profile) ? comment.profile[0] : comment.profile
      }));
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      return [];
    }
  }, []);

  const addComment = useCallback(async (postId: string, commentData: {
    audio_url: string;
    transcript_fr?: string;
    transcript_ba?: string;
    duration_seconds?: number;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('tamtam_comments').insert({
        post_id: postId,
        user_id: userData.user.id,
        audio_url: commentData.audio_url,
        transcript_fr: commentData.transcript_fr,
        transcript_ba: commentData.transcript_ba,
        duration_seconds: commentData.duration_seconds
      });

      if (error) throw error;

      toast({ title: "💬 Commentaire ajouté !" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [toast]);

  const createStory = useCallback(async (storyData: {
    audio_url: string;
    photo_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    duration_seconds?: number;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('tamtam_stories').insert({
        user_id: userData.user.id,
        audio_url: storyData.audio_url,
        photo_url: storyData.photo_url,
        transcript_fr: storyData.transcript_fr,
        transcript_ba: storyData.transcript_ba,
        duration_seconds: storyData.duration_seconds
      });

      if (error) throw error;

      toast({ title: "📸 Story créée !" });
      await fetchStories();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [fetchStories, toast]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tamtam_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userData.user.id);

      if (error) throw error;

      toast({ title: "🗑️ Publication supprimée" });
      await fetchPosts();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [fetchPosts, toast]);

  const updatePost = useCallback(async (postId: string, updates: {
    transcript_fr?: string;
    transcript_ba?: string;
    feeling_emoji?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tamtam_posts')
        .update(updates)
        .eq('id', postId)
        .eq('user_id', userData.user.id);

      if (error) throw error;

      toast({ title: "✏️ Publication modifiée" });
      await fetchPosts();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [fetchPosts, toast]);

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, [fetchPosts, fetchStories]);

  return {
    posts,
    stories,
    isLoading,
    error,
    fetchPosts,
    fetchStories,
    createPost,
    deletePost,
    updatePost,
    addReaction,
    fetchComments,
    addComment,
    createStory
  };
};
