import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface YovoProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio_audio_url: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

export function useYovoProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<YovoProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('yovo_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      setProfile(data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<YovoProfile>) => {
    if (!user || !profile) return { error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('yovo_profiles')
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

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile
  };
}
