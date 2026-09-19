import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BattleChallenge {
  id: string;
  challenge_date: string;
  prompt_fr: string;
  prompt_ba: string | null;
  proverb_fr: string | null;
  proverb_ba: string | null;
}

export interface BattleResponse {
  id: string;
  challenge_id: string;
  user_id: string;
  response_text: string;
  response_lang: string;
  ai_score: number | null;
  local_score: number | null;
  scoring_method: string;
  ai_feedback: string | null;
  xp_awarded: number;
  votes_count: number;
  created_at: string;
}

const PENDING_KEY = 'fitila_battle_pending';

/** Notation locale de secours : longueur, richesse lexicale, présence de marqueurs bariba. */
export function localScore(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  const words = clean.split(/\s+/);
  const unique = new Set(words.map((w) => w.toLowerCase())).size;
  const baribaMarkers = ['ɔ', 'ɛ', 'ŋ', 'ã', 'ĩ', 'ũ'];
  const hasMarkers = baribaMarkers.some((m) => clean.includes(m));
  let score = Math.min(60, words.length * 3);
  score += Math.min(20, unique * 2);
  if (hasMarkers) score += 15;
  if (clean.length > 120) score += 5;
  return Math.max(10, Math.min(100, score));
}

export function useSagesseBattle() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<BattleChallenge | null>(null);
  const [responses, setResponses] = useState<BattleResponse[]>([]);
  const [myResponse, setMyResponse] = useState<BattleResponse | null>(null);
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [history, setHistory] = useState<BattleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: ch, error: chErr } = await supabase
        .from('battle_challenges')
        .select('id, challenge_date, prompt_fr, prompt_ba, proverb_fr, proverb_ba')
        .lte('challenge_date', today)
        .eq('is_active', true)
        .order('challenge_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (chErr) throw chErr;
      setChallenge(ch as BattleChallenge | null);

      if (ch) {
        const { data: resp, error: rErr } = await supabase
          .from('battle_responses')
          .select('*')
          .eq('challenge_id', ch.id)
          .order('votes_count', { ascending: false })
          .limit(50);
        if (rErr) throw rErr;
        const list = (resp || []) as BattleResponse[];
        setResponses(list);
        setMyResponse(user ? list.find((r) => r.user_id === user.id) || null : null);
      }

      if (user) {
        const { data: votes } = await supabase
          .from('battle_response_votes')
          .select('response_id')
          .eq('user_id', user.id);
        setMyVotes((votes || []).map((v: { response_id: string }) => v.response_id));

        const { data: mine } = await supabase
          .from('battle_responses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        setHistory((mine || []) as BattleResponse[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Sauvegarde locale immédiate : la réponse n'est jamais perdue. */
  const savePendingLocally = useCallback((challengeId: string, text: string) => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ challengeId, text, at: Date.now() }));
    } catch {
      /* stockage indisponible : la réponse reste dans le champ de saisie */
    }
  }, []);

  const readPending = useCallback((challengeId: string): string | null => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { challengeId: string; text: string };
      return parsed.challengeId === challengeId ? parsed.text : null;
    } catch {
      return null;
    }
  }, []);

  const clearPending = useCallback(() => {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {
      /* rien à nettoyer */
    }
  }, []);

  const submit = useCallback(
    async (text: string, lang: 'bariba' | 'french') => {
      if (!challenge) throw new Error('Aucun défi disponible');
      if (!user) throw new Error('Connectez-vous pour participer');
      const clean = text.trim();
      if (clean.length < 5) throw new Error('Votre réponse est trop courte');

      setSubmitting(true);
      savePendingLocally(challenge.id, clean);
      const fallback = localScore(clean);

      // 1. La réponse est enregistrée d'abord, avec la note locale.
      const { data: saved, error: insErr } = await supabase
        .from('battle_responses')
        .upsert(
          {
            challenge_id: challenge.id,
            user_id: user.id,
            response_text: clean,
            response_lang: lang,
            local_score: fallback,
            scoring_method: 'local',
            xp_awarded: Math.round(fallback / 5),
          },
          { onConflict: 'challenge_id,user_id' }
        )
        .select()
        .single();

      if (insErr) {
        setSubmitting(false);
        throw new Error(`Enregistrement impossible : ${insErr.message}`);
      }
      clearPending();
      setMyResponse(saved as BattleResponse);

      // 2. Notation IA en second : un échec ne fait pas perdre la réponse.
      try {
        const { data: ai, error: aiErr } = await supabase.functions.invoke('fitila-ia-chat', {
          body: {
            message: `Note de 0 à 100 cette réponse au défi de sagesse bariba, puis donne un retour en une phrase.\nDéfi : ${challenge.prompt_fr}\nProverbe : ${challenge.proverb_fr || '—'}\nRéponse : ${clean}\nRéponds au format : SCORE=<nombre> | <retour>`,
            max_tokens: 120,
          },
        });
        const raw = String((ai as { response_fr?: string } | null)?.response_fr || '');
        const match = raw.match(/SCORE\s*=\s*(\d{1,3})/i);
        if (!aiErr && match) {
          const score = Math.max(0, Math.min(100, parseInt(match[1], 10)));
          const feedback = raw.split('|').slice(1).join('|').trim() || null;
          const { data: updated } = await supabase
            .from('battle_responses')
            .update({
              ai_score: score,
              scoring_method: 'ai',
              ai_feedback: feedback,
              xp_awarded: Math.round(score / 4),
            })
            .eq('id', (saved as BattleResponse).id)
            .select()
            .single();
          if (updated) setMyResponse(updated as BattleResponse);
        }
      } catch (e) {
        console.warn('[SagesseBattle] notation IA indisponible, note locale conservée', e);
      }

      setSubmitting(false);
      await load();
      return true;
    },
    [challenge, user, savePendingLocally, clearPending, load]
  );

  const toggleVote = useCallback(
    async (responseId: string) => {
      if (!user) throw new Error('Connectez-vous pour voter');
      const has = myVotes.includes(responseId);
      if (has) {
        const { error: delErr } = await supabase
          .from('battle_response_votes')
          .delete()
          .eq('response_id', responseId)
          .eq('user_id', user.id);
        if (delErr) throw new Error(delErr.message);
        setMyVotes((v) => v.filter((x) => x !== responseId));
        setResponses((r) => r.map((x) => (x.id === responseId ? { ...x, votes_count: Math.max(0, x.votes_count - 1) } : x)));
      } else {
        const { error: insErr } = await supabase
          .from('battle_response_votes')
          .insert({ response_id: responseId, user_id: user.id });
        if (insErr) throw new Error(insErr.message);
        setMyVotes((v) => [...v, responseId]);
        setResponses((r) => r.map((x) => (x.id === responseId ? { ...x, votes_count: x.votes_count + 1 } : x)));
      }
    },
    [user, myVotes]
  );

  const stats = {
    participants: responses.length,
    bestScore: responses.reduce((m, r) => Math.max(m, r.ai_score ?? r.local_score ?? 0), 0),
    totalVotes: responses.reduce((s, r) => s + r.votes_count, 0),
  };

  return {
    challenge,
    responses,
    myResponse,
    myVotes,
    history,
    stats,
    loading,
    submitting,
    error,
    submit,
    toggleVote,
    reload: load,
    readPending,
  };
}
