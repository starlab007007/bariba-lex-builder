import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TamTamProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio_audio_url: string | null;
  bio_transcript_fr: string | null;
  bio_transcript_ba: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  phone_number: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  friends_count: number;
  posts_count: number;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTamTamProfile(userId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TamTamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('tamtam_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (fetchError) throw fetchError;

      // Self-heal: if no profile row exists for the logged-in user,
      // create a minimal one so the profile page never stays blank.
      if (!data && user?.id === targetUserId) {
        const fallbackUsername = `user_${targetUserId.replace(/-/g, '').slice(0, 6)}`;
        const { data: created, error: upsertError } = await supabase
          .from('tamtam_profiles')
          .upsert(
            {
              user_id: targetUserId,
              username: fallbackUsername,
              display_name: 'Utilisateur',
            },
            { onConflict: 'user_id' }
          )
          .select('*')
          .maybeSingle();
        if (upsertError) {
          console.warn('[useTamTamProfile] auto-create failed:', upsertError.message);
        }
        setProfile((created ?? null) as TamTamProfile | null);
      } else {
        setProfile(data as TamTamProfile);
      }
    } catch (err: any) {
      console.error('[useTamTamProfile] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user?.id]);

  useEffect(() => {
    if (!targetUserId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [targetUserId, fetchProfile]);

  const updateProfile = async (updates: Partial<TamTamProfile>) => {
    if (!user || !profile) return { error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('tamtam_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { error: null };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      return { error: err.message };
    }
  };

  const updateLastSeen = async () => {
    if (!user) return;
    
    await supabase
      .from('tamtam_profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', user.id);
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateLastSeen,
    refetch: fetchProfile
  };
}
