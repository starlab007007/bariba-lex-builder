import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useUserBlocking() {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tamtam_user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) throw error;
      setBlockedUsers(data?.map(b => b.blocked_id) || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBlockedUsers();
    }
  }, [user, fetchBlockedUsers]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user) return { error: 'Not authenticated' };
    if (userId === user.id) return { error: 'Cannot block yourself' };

    try {
      const { error } = await supabase
        .from('tamtam_user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: userId
        });

      if (error) throw error;

      setBlockedUsers(prev => [...prev, userId]);
      
      // Also unfollow/unfriend if applicable
      await supabase
        .from('tamtam_follows')
        .delete()
        .or(`and(follower_id.eq.${user.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${user.id})`);

      await supabase
        .from('tamtam_friendships')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);

      toast({
        title: "Utilisateur bloqué",
        description: "Cet utilisateur ne pourra plus vous contacter"
      });

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(id => id !== userId));
      
      toast({
        title: "Utilisateur débloqué",
        description: "Vous pouvez à nouveau interagir avec cet utilisateur"
      });

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  const isBlocked = useCallback((userId: string) => {
    return blockedUsers.includes(userId);
  }, [blockedUsers]);

  const reportContent = useCallback(async (
    reason: string,
    details?: string,
    options?: {
      userId?: string;
      postId?: string;
      commentId?: string;
    }
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('tamtam_content_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: options?.userId,
          reported_post_id: options?.postId,
          reported_comment_id: options?.commentId,
          reason,
          details
        });

      if (error) throw error;

      toast({
        title: "Signalement envoyé",
        description: "Merci de nous aider à garder la communauté sûre"
      });

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [user]);

  return {
    blockedUsers,
    loading,
    blockUser,
    unblockUser,
    isBlocked,
    reportContent,
    refetch: fetchBlockedUsers
  };
}
