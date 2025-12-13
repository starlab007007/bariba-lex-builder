import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TamTamGroup {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  members_count: number;
  is_public: boolean;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  audio_url: string;
  media_type: string;
  media_url: string | null;
  transcript_fr: string | null;
  transcript_ba: string | null;
  feeling_emoji: string | null;
  duration_seconds: number | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useTamTamCommunities() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<TamTamGroup[]>([]);
  const [myGroups, setMyGroups] = useState<TamTamGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
    if (user) {
      fetchMyGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_groups')
        .select('*')
        .eq('is_public', true)
        .order('members_count', { ascending: false });

      if (error) throw error;
      setGroups(data as TamTamGroup[]);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    if (!user) return;

    try {
      // Get groups where user is a member
      const { data: memberships } = await supabase
        .from('tamtam_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id);
        const { data: groupsData } = await supabase
          .from('tamtam_groups')
          .select('*')
          .in('id', groupIds);

        setMyGroups(groupsData as TamTamGroup[] || []);
      } else {
        setMyGroups([]);
      }
    } catch (err) {
      console.error('Error fetching my groups:', err);
    }
  };

  const createGroup = useCallback(async (
    name: string, 
    description?: string, 
    category?: string, 
    isPublic = true
  ) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('tamtam_groups')
        .insert({
          owner_id: user.id,
          name,
          description,
          category,
          is_public: isPublic,
          members_count: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('tamtam_group_members')
        .insert({
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      await fetchGroups();
      await fetchMyGroups();
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [user]);

  const joinGroup = useCallback(async (groupId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      await fetchMyGroups();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchMyGroups();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const getGroupMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data: members } = await supabase
        .from('tamtam_group_members')
        .select('*')
        .eq('group_id', groupId);

      if (!members || members.length === 0) return [];

      // Fetch profiles
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('tamtam_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      return members.map(m => ({
        ...m,
        profile: profiles?.find(p => p.user_id === m.user_id)
      })) as GroupMember[];
    } catch (err) {
      console.error('Error fetching group members:', err);
      return [];
    }
  }, []);

  const getGroupPosts = useCallback(async (groupId: string): Promise<GroupPost[]> => {
    try {
      const { data: posts } = await supabase
        .from('tamtam_group_posts')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (!posts || posts.length === 0) return [];

      // Fetch author profiles
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('tamtam_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      return posts.map(p => ({
        ...p,
        author_profile: profiles?.find(pr => pr.user_id === p.user_id)
      })) as GroupPost[];
    } catch (err) {
      console.error('Error fetching group posts:', err);
      return [];
    }
  }, []);

  const createGroupPost = useCallback(async (
    groupId: string,
    audioUrl: string,
    mediaType = 'audio',
    mediaUrl?: string,
    transcriptFr?: string,
    transcriptBa?: string,
    feelingEmoji?: string,
    durationSeconds?: number
  ) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('tamtam_group_posts')
        .insert({
          group_id: groupId,
          user_id: user.id,
          audio_url: audioUrl,
          media_type: mediaType,
          media_url: mediaUrl,
          transcript_fr: transcriptFr,
          transcript_ba: transcriptBa,
          feeling_emoji: feelingEmoji,
          duration_seconds: durationSeconds
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [user]);

  const isMember = useCallback((groupId: string): boolean => {
    return myGroups.some(g => g.id === groupId);
  }, [myGroups]);

  return {
    groups,
    myGroups,
    loading,
    createGroup,
    joinGroup,
    leaveGroup,
    getGroupMembers,
    getGroupPosts,
    createGroupPost,
    isMember,
    refetch: fetchGroups
  };
}
