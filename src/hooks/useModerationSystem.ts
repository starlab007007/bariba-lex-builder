import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ReportReason = 
  | 'inappropriate_content'
  | 'harassment'
  | 'spam'
  | 'hate_speech'
  | 'violence'
  | 'misinformation'
  | 'other';

export interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  reported_post_id?: string;
  reported_comment_id?: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export function useModerationSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isReporting, setIsReporting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const reportContent = useCallback(async (
    reason: ReportReason,
    options: {
      userId?: string;
      postId?: string;
      commentId?: string;
      details?: string;
    }
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Non connecté",
        description: "Vous devez être connecté pour signaler du contenu",
        variant: "destructive"
      });
      return false;
    }

    setIsReporting(true);

    try {
      const { error } = await supabase
        .from('tamtam_content_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: options.userId || null,
          reported_post_id: options.postId || null,
          reported_comment_id: options.commentId || null,
          reason: reason,
          details: options.details || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "✅ Signalement envoyé",
        description: "Notre équipe examinera ce contenu sous peu"
      });

      return true;
    } catch (error: any) {
      console.error('Report error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le signalement",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsReporting(false);
    }
  }, [user, toast]);

  const blockUser = useCallback(async (blockedUserId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Non connecté",
        variant: "destructive"
      });
      return false;
    }

    if (blockedUserId === user.id) {
      toast({
        title: "Action impossible",
        description: "Vous ne pouvez pas vous bloquer vous-même",
        variant: "destructive"
      });
      return false;
    }

    setIsBlocking(true);

    try {
      const { error } = await supabase
        .from('tamtam_user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Déjà bloqué",
            description: "Cet utilisateur est déjà bloqué"
          });
          return true;
        }
        throw error;
      }

      toast({
        title: "🚫 Utilisateur bloqué",
        description: "Vous ne verrez plus son contenu"
      });

      return true;
    } catch (error: any) {
      console.error('Block error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de bloquer l'utilisateur",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsBlocking(false);
    }
  }, [user, toast]);

  const unblockUser = useCallback(async (blockedUserId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('tamtam_user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      toast({
        title: "✅ Utilisateur débloqué"
      });

      return true;
    } catch (error: any) {
      console.error('Unblock error:', error);
      return false;
    }
  }, [user, toast]);

  const getBlockedUsers = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('tamtam_user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) throw error;

      return data?.map(b => b.blocked_id) || [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  }, [user]);

  const isUserBlocked = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('tamtam_user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .single();

      return !!data;
    } catch {
      return false;
    }
  }, [user]);

  return {
    reportContent,
    blockUser,
    unblockUser,
    getBlockedUsers,
    isUserBlocked,
    isReporting,
    isBlocking
  };
}

export const REPORT_REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'inappropriate_content', label: 'Contenu inapproprié', icon: '🔞' },
  { value: 'harassment', label: 'Harcèlement', icon: '😤' },
  { value: 'spam', label: 'Spam', icon: '📢' },
  { value: 'hate_speech', label: 'Discours haineux', icon: '🚫' },
  { value: 'violence', label: 'Violence', icon: '⚠️' },
  { value: 'misinformation', label: 'Désinformation', icon: '❌' },
  { value: 'other', label: 'Autre', icon: '📝' }
];
