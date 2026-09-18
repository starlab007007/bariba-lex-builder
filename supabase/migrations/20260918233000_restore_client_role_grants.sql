-- Restore the Data API grants that Supabase normally applies to tables
-- created through migrations. Row Level Security remains the authority for
-- deciding which rows each client role may read or mutate.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE
  public.learning_progress,
  public.learning_theme_mastery,
  public.learning_session_log,
  public.account_deletion_requests,
  public.battle_responses,
  public.battle_response_votes,
  public.corpus_contributions,
  public.handunia_lieux,
  public.handunia_fragments,
  public.handunia_fragment_likes,
  public.tamtam_live_chat_messages,
  public.tamtam_live_signals
TO anon, authenticated, service_role;

-- The SELECT policy on tamtam_live_signals calls this SECURITY DEFINER helper.
-- Anonymous requests have auth.uid() = NULL and therefore always receive false,
-- but still need EXECUTE to let PostgREST evaluate the RLS expression.
GRANT EXECUTE ON FUNCTION public.is_live_participant(UUID, UUID) TO anon;
