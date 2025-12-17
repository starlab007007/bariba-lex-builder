import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TamTamGroup {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  owner_id: string | null;
  is_public: boolean;
  members_count: number;
  created_at: string;
  owner?: {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  };
  is_member?: boolean;
  user_role?: string;
}

export interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  };
}

export function useTamTamGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<TamTamGroup[]>([]);
  const [myGroups, setMyGroups] = useState<TamTamGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch public groups
      const { data: publicGroups, error } = await supabase
        .from('tamtam_groups')
        .select('*')
        .eq('is_public', true)
        .order('members_count', { ascending: false });

      if (error) throw error;

      // Fetch owner profiles
      const ownerIds = [...new Set(publicGroups?.filter(g => g.owner_id).map(g => g.owner_id) || [])];
      let ownerProfiles: any[] = [];
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('tamtam_profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', ownerIds as string[]);
        ownerProfiles = profiles || [];
      }

      // Check membership for current user
      let membershipMap: Record<string, string> = {};
      if (user) {
        const { data: memberships } = await supabase
          .from('tamtam_group_members')
          .select('group_id, role')
          .eq('user_id', user.id);
        
        memberships?.forEach(m => {
          membershipMap[m.group_id] = m.role || 'member';
        });
      }

      const enrichedGroups = publicGroups?.map(g => ({
        ...g,
        owner: ownerProfiles.find(p => p.user_id === g.owner_id),
        is_member: !!membershipMap[g.id],
        user_role: membershipMap[g.id]
      })) || [];

      setGroups(enrichedGroups);
      setMyGroups(enrichedGroups.filter(g => g.is_member));
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(async (
    name: string,
    description?: string,
    category?: string,
    isPublic: boolean = true
  ) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      const { data: group, error } = await supabase
        .from('tamtam_groups')
        .insert({
          name,
          description,
          category,
          is_public: isPublic,
          owner_id: user.id,
          members_count: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as admin
      await supabase
        .from('tamtam_group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      fetchGroups();
      return { data: group, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [user, fetchGroups]);

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

      // Update member count
      const group = groups.find(g => g.id === groupId);
      if (group) {
        await supabase
          .from('tamtam_groups')
          .update({ members_count: (group.members_count || 0) + 1 })
          .eq('id', groupId);
      }

      fetchGroups();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user, groups, fetchGroups]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update member count
      const group = groups.find(g => g.id === groupId);
      if (group) {
        await supabase
          .from('tamtam_groups')
          .update({ members_count: Math.max(0, (group.members_count || 1) - 1) })
          .eq('id', groupId);
      }

      fetchGroups();
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user, groups, fetchGroups]);

  const getGroupMembers = useCallback(async (groupId: string) => {
    try {
      const { data: members, error } = await supabase
        .from('tamtam_group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) throw error;

      // Fetch profiles
      const userIds = members?.map(m => m.user_id) || [];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('tamtam_profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', userIds);
        profiles = data || [];
      }

      return members?.map(m => ({
        ...m,
        profile: profiles.find(p => p.user_id === m.user_id)
      })) || [];
    } catch (err) {
      console.error('Error fetching members:', err);
      return [];
    }
  }, []);

  const inviteToGroup = useCallback(async (groupId: string, userId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // Create notification for invite
      await supabase
        .from('tamtam_notifications')
        .insert({
          user_id: userId,
          actor_id: user.id,
          group_id: groupId,
          type: 'group_invite'
        });

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const kickMember = useCallback(async (groupId: string, userId: string) => {
    if (!user) return { error: 'Not authenticated' };

    // Check if user is admin
    const group = groups.find(g => g.id === groupId);
    if (group?.user_role !== 'admin' && group?.owner_id !== user.id) {
      return { error: 'Not authorized' };
    }

    try {
      const { error } = await supabase
        .from('tamtam_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update member count
      if (group) {
        await supabase
          .from('tamtam_groups')
          .update({ members_count: Math.max(0, (group.members_count || 1) - 1) })
          .eq('id', groupId);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user, groups]);

  const promoteToAdmin = useCallback(async (groupId: string, userId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const group = groups.find(g => g.id === groupId);
    if (group?.owner_id !== user.id) {
      return { error: 'Only owner can promote' };
    }

    try {
      const { error } = await supabase
        .from('tamtam_group_members')
        .update({ role: 'admin' })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user, groups]);

  return {
    groups,
    myGroups,
    loading,
    createGroup,
    joinGroup,
    leaveGroup,
    getGroupMembers,
    inviteToGroup,
    kickMember,
    promoteToAdmin,
    refetch: fetchGroups
  };
}
