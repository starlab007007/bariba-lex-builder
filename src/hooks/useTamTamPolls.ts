// TamTam Polls Hook - manages vocal polls with voting
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uniqueChannelName } from '@/lib/realtime';
import { useToast } from '@/hooks/use-toast';
import { triggerFeedback } from '@/utils/tamtamFeedback';
export interface PollOption {
  id: string;
  poll_id: string;
  audio_url: string;
  transcript: string | null;
  vote_count: number;
  position: number;
}

export interface Poll {
  id: string;
  user_id: string;
  question_audio_url: string;
  question_transcript: string | null;
  expires_at: string | null;
  is_anonymous: boolean;
  votes_count: number;
  created_at: string;
  options: PollOption[];
  user_vote?: string; // option_id the user voted for
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreatePollData {
  question_audio_url: string;
  question_transcript?: string;
  options: { audio_url: string; transcript?: string }[];
  expires_at?: string;
  is_anonymous?: boolean;
}

export function useTamTamPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchPolls = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch polls
      const { data: pollsData, error: pollsError } = await supabase
        .from('tamtam_polls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (pollsError) throw pollsError;

      if (!pollsData || pollsData.length === 0) {
        setPolls([]);
        return [];
      }

      // Fetch options for all polls
      const pollIds = pollsData.map(p => p.id);
      const { data: optionsData } = await supabase
        .from('tamtam_poll_options')
        .select('*')
        .in('poll_id', pollIds)
        .order('position', { ascending: true });

      // Fetch user votes if logged in
      let userVotes: Record<string, string> = {};
      if (user) {
        const { data: votesData } = await supabase
          .from('tamtam_poll_votes')
          .select('poll_id, option_id')
          .eq('user_id', user.id)
          .in('poll_id', pollIds);

        if (votesData) {
          votesData.forEach(v => {
            userVotes[v.poll_id] = v.option_id;
          });
        }
      }

      // Fetch profiles
      const userIds = [...new Set(pollsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('tamtam_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]));

      // Combine data
      const enrichedPolls: Poll[] = pollsData.map(poll => ({
        ...poll,
        options: (optionsData || []).filter(o => o.poll_id === poll.id),
        user_vote: userVotes[poll.id],
        profile: profilesMap.get(poll.user_id)
      }));

      setPolls(enrichedPolls);
      return enrichedPolls;
    } catch (err: any) {
      console.error('[useTamTamPolls] Error fetching polls:', err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const createPoll = async (data: CreatePollData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Connectez-vous", description: "Vous devez être connecté", variant: "destructive" });
        return null;
      }

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('tamtam_polls')
        .insert({
          user_id: user.id,
          question_audio_url: data.question_audio_url,
          question_transcript: data.question_transcript || null,
          expires_at: data.expires_at || null,
          is_anonymous: data.is_anonymous || false
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const optionsToInsert = data.options.map((opt, idx) => ({
        poll_id: poll.id,
        audio_url: opt.audio_url,
        transcript: opt.transcript || null,
        position: idx + 1
      }));

      const { error: optionsError } = await supabase
        .from('tamtam_poll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      triggerFeedback('success');
      toast({ title: "🗳️ Sondage créé !" });
      
      await fetchPolls();
      return poll;
    } catch (err: any) {
      console.error('[useTamTamPolls] Error creating poll:', err);
      triggerFeedback('error');
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const votePoll = async (pollId: string, optionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Connectez-vous", description: "Vous devez être connecté pour voter", variant: "destructive" });
        return false;
      }

      // Check if already voted
      const { data: existingVote } = await supabase
        .from('tamtam_poll_votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        toast({ title: "Déjà voté", description: "Vous avez déjà voté pour ce sondage" });
        return false;
      }

      // Create vote
      const { error: voteError } = await supabase
        .from('tamtam_poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id
        });

      if (voteError) throw voteError;

      // Update vote counts (optimistic update)
      setPolls(prev => prev.map(poll => {
        if (poll.id !== pollId) return poll;
        return {
          ...poll,
          votes_count: poll.votes_count + 1,
          user_vote: optionId,
          options: poll.options.map(opt => 
            opt.id === optionId 
              ? { ...opt, vote_count: opt.vote_count + 1 }
              : opt
          )
        };
      }));

      triggerFeedback('success');
      toast({ title: "✅ Vote enregistré !" });
      return true;
    } catch (err: any) {
      console.error('[useTamTamPolls] Error voting:', err);
      triggerFeedback('error');
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      return false;
    }
  };

  const deletePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('tamtam_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;

      setPolls(prev => prev.filter(p => p.id !== pollId));
      triggerFeedback('success');
      toast({ title: "Sondage supprimé" });
      return true;
    } catch (err: any) {
      console.error('[useTamTamPolls] Error deleting poll:', err);
      triggerFeedback('error');
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      return false;
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(uniqueChannelName('polls-changes'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamtam_polls' }, () => {
        fetchPolls();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamtam_poll_votes' }, () => {
        fetchPolls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPolls();
  }, []);

  return {
    polls,
    isLoading,
    fetchPolls,
    createPoll,
    votePoll,
    deletePoll
  };
}
