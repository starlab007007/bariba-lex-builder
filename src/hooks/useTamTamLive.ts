import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TamTamLive {
  id: string;
  host_id: string;
  community_id: string | null;
  title: string;
  title_audio_url: string | null;
  status: string;
  viewer_count: number;
  started_at: string;
  ended_at: string | null;
  host?: {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  };
}

export interface LiveReaction {
  id: string;
  live_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export function useTamTamLive() {
  const { user } = useAuth();
  const [lives, setLives] = useState<TamTamLive[]>([]);
  const [currentLive, setCurrentLive] = useState<TamTamLive | null>(null);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLives = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_lives')
        .select('*')
        .eq('status', 'live')
        .order('viewer_count', { ascending: false });

      if (error) throw error;

      // Fetch host profiles
      const hostIds = [...new Set(data?.map(l => l.host_id).filter(Boolean))];
      let hostProfiles: any[] = [];
      if (hostIds.length > 0) {
        const { data: profiles } = await supabase
          .from('tamtam_profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', hostIds as string[]);
        hostProfiles = profiles || [];
      }

      const enrichedLives = data?.map(l => ({
        ...l,
        host: hostProfiles.find(p => p.user_id === l.host_id)
      })) || [];

      setLives(enrichedLives);
    } catch (err) {
      console.error('Error fetching lives:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLives();
  }, [fetchLives]);

  const startLive = useCallback(async (
    title: string,
    titleAudioUrl?: string,
    communityId?: string
  ) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('tamtam_lives')
        .insert({
          host_id: user.id,
          title,
          title_audio_url: titleAudioUrl,
          community_id: communityId,
          status: 'live',
          viewer_count: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as viewer
      await supabase
        .from('tamtam_live_viewers')
        .insert({
          live_id: data.id,
          user_id: user.id
        });

      setCurrentLive(data);
      fetchLives();
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [user, fetchLives]);

  const endLive = useCallback(async (liveId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_lives')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', liveId)
        .eq('host_id', user.id);

      if (error) throw error;

      setCurrentLive(null);
      fetchLives();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user, fetchLives]);

  const joinLive = useCallback(async (liveId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // Join as viewer
      await supabase
        .from('tamtam_live_viewers')
        .insert({
          live_id: liveId,
          user_id: user.id
        });

      // Increment viewer count
      const live = lives.find(l => l.id === liveId);
      if (live) {
        await supabase
          .from('tamtam_lives')
          .update({ viewer_count: live.viewer_count + 1 })
          .eq('id', liveId);
      }

      // Fetch live details
      const { data } = await supabase
        .from('tamtam_lives')
        .select('*')
        .eq('id', liveId)
        .single();

      setCurrentLive(data);
      setViewerCount(data?.viewer_count || 0);

      // Subscribe to reactions
      const channel = supabase
        .channel(`live-reactions-${liveId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tamtam_live_reactions',
            filter: `live_id=eq.${liveId}`
          },
          (payload) => {
            setReactions(prev => [...prev, payload.new as LiveReaction]);
            // Auto-remove after 3 seconds
            setTimeout(() => {
              setReactions(prev => prev.filter(r => r.id !== (payload.new as LiveReaction).id));
            }, 3000);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tamtam_live_viewers',
            filter: `live_id=eq.${liveId}`
          },
          async () => {
            // Refetch viewer count
            const { count } = await supabase
              .from('tamtam_live_viewers')
              .select('*', { count: 'exact', head: true })
              .eq('live_id', liveId);
            setViewerCount(count || 0);
          }
        )
        .subscribe();

      return { error: null, channel };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user, lives]);

  const leaveLive = useCallback(async (liveId: string) => {
    if (!user) return;

    await supabase
      .from('tamtam_live_viewers')
      .delete()
      .eq('live_id', liveId)
      .eq('user_id', user.id);

    // Decrement viewer count
    const live = lives.find(l => l.id === liveId);
    if (live) {
      await supabase
        .from('tamtam_lives')
        .update({ viewer_count: Math.max(0, live.viewer_count - 1) })
        .eq('id', liveId);
    }

    setCurrentLive(null);
    setReactions([]);
  }, [user, lives]);

  const sendReaction = useCallback(async (liveId: string, reactionType: string) => {
    if (!user) return;

    await supabase
      .from('tamtam_live_reactions')
      .insert({
        live_id: liveId,
        user_id: user.id,
        reaction_type: reactionType
      });
  }, [user]);

  return {
    lives,
    currentLive,
    reactions,
    viewerCount,
    loading,
    startLive,
    endLive,
    joinLive,
    leaveLive,
    sendReaction,
    refetch: fetchLives
  };
}
