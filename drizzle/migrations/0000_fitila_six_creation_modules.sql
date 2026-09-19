-- ============ SAGESSE BATTLE ============
CREATE TABLE IF NOT EXISTS public.battle_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt_fr TEXT NOT NULL,
  prompt_ba TEXT,
  proverb_fr TEXT,
  proverb_ba TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS battle_challenges_date_idx ON public.battle_challenges (challenge_date);
GRANT SELECT ON public.battle_challenges TO authenticated, anon;
GRANT ALL ON public.battle_challenges TO service_role;
ALTER TABLE public.battle_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_challenges_read" ON public.battle_challenges FOR SELECT USING (true);
CREATE POLICY "battle_challenges_admin_write" ON public.battle_challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.battle_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.battle_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  response_lang TEXT NOT NULL DEFAULT 'bariba',
  audio_url TEXT,
  ai_score INTEGER,
  local_score INTEGER,
  scoring_method TEXT NOT NULL DEFAULT 'pending',
  ai_feedback TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS battle_responses_challenge_idx ON public.battle_responses (challenge_id);
GRANT SELECT, INSERT, UPDATE ON public.battle_responses TO authenticated;
GRANT SELECT ON public.battle_responses TO anon;
GRANT ALL ON public.battle_responses TO service_role;
ALTER TABLE public.battle_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_responses_read" ON public.battle_responses FOR SELECT USING (true);
CREATE POLICY "battle_responses_insert_own" ON public.battle_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "battle_responses_update_own" ON public.battle_responses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER battle_responses_updated_at BEFORE UPDATE ON public.battle_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.battle_response_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.battle_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (response_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.battle_response_votes TO authenticated;
GRANT ALL ON public.battle_response_votes TO service_role;
ALTER TABLE public.battle_response_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_votes_read" ON public.battle_response_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "battle_votes_insert_own" ON public.battle_response_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "battle_votes_delete_own" ON public.battle_response_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.battle_update_votes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.battle_responses SET votes_count = votes_count + 1 WHERE id = NEW.response_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.battle_responses SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = OLD.response_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER battle_votes_count_trg AFTER INSERT OR DELETE ON public.battle_response_votes
  FOR EACH ROW EXECUTE FUNCTION public.battle_update_votes_count();

-- ============ CORPUS (SASARA IA) ============
CREATE TABLE IF NOT EXISTS public.corpus_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  audio_url TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  origin TEXT NOT NULL DEFAULT 'sasara',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS corpus_contributions_user_idx ON public.corpus_contributions (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.corpus_contributions TO authenticated;
GRANT ALL ON public.corpus_contributions TO service_role;
ALTER TABLE public.corpus_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corpus_select_own" ON public.corpus_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "corpus_insert_own" ON public.corpus_contributions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND consent_given = true);

CREATE OR REPLACE FUNCTION public.corpus_contribution_count_this_month()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.corpus_contributions
  WHERE user_id = auth.uid() AND created_at >= date_trunc('month', now());
$$;
GRANT EXECUTE ON FUNCTION public.corpus_contribution_count_this_month() TO authenticated;

-- ============ HANDUNIA WASA ============
CREATE TABLE IF NOT EXISTS public.handunia_lieux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  description TEXT,
  region TEXT,
  created_by UUID,
  fragments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS handunia_lieux_norm_idx ON public.handunia_lieux (name_normalized);
GRANT SELECT, INSERT ON public.handunia_lieux TO authenticated;
GRANT SELECT ON public.handunia_lieux TO anon;
GRANT ALL ON public.handunia_lieux TO service_role;
ALTER TABLE public.handunia_lieux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handunia_lieux_read" ON public.handunia_lieux FOR SELECT USING (true);
CREATE POLICY "handunia_lieux_insert" ON public.handunia_lieux FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.handunia_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lieu_id UUID NOT NULL REFERENCES public.handunia_lieux(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content_fr TEXT,
  content_ba TEXT,
  audio_url TEXT,
  ai_assisted BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS handunia_fragments_lieu_idx ON public.handunia_fragments (lieu_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handunia_fragments TO authenticated;
GRANT SELECT ON public.handunia_fragments TO anon;
GRANT ALL ON public.handunia_fragments TO service_role;
ALTER TABLE public.handunia_fragments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handunia_fragments_read" ON public.handunia_fragments FOR SELECT USING (true);
CREATE POLICY "handunia_fragments_insert_own" ON public.handunia_fragments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "handunia_fragments_update_own" ON public.handunia_fragments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "handunia_fragments_delete_own" ON public.handunia_fragments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.handunia_fragment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragment_id UUID NOT NULL REFERENCES public.handunia_fragments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fragment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.handunia_fragment_likes TO authenticated;
GRANT ALL ON public.handunia_fragment_likes TO service_role;
ALTER TABLE public.handunia_fragment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handunia_likes_read" ON public.handunia_fragment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "handunia_likes_insert_own" ON public.handunia_fragment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "handunia_likes_delete_own" ON public.handunia_fragment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handunia_counts_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'handunia_fragments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.handunia_lieux SET fragments_count = fragments_count + 1 WHERE id = NEW.lieu_id;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.handunia_lieux SET fragments_count = GREATEST(fragments_count - 1, 0) WHERE id = OLD.lieu_id;
      RETURN OLD;
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      UPDATE public.handunia_fragments SET likes_count = likes_count + 1 WHERE id = NEW.fragment_id;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.handunia_fragments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.fragment_id;
      RETURN OLD;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER handunia_fragments_count_trg AFTER INSERT OR DELETE ON public.handunia_fragments
  FOR EACH ROW EXECUTE FUNCTION public.handunia_counts_sync();
CREATE TRIGGER handunia_likes_count_trg AFTER INSERT OR DELETE ON public.handunia_fragment_likes
  FOR EACH ROW EXECUTE FUNCTION public.handunia_counts_sync();

-- ============ LIVE GRIOT: CHAT + SIGNALING ============
CREATE TABLE IF NOT EXISTS public.tamtam_live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.tamtam_lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_chat_live_idx ON public.tamtam_live_chat_messages (live_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.tamtam_live_chat_messages TO authenticated;
GRANT ALL ON public.tamtam_live_chat_messages TO service_role;
ALTER TABLE public.tamtam_live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_chat_read" ON public.tamtam_live_chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_chat_insert_own" ON public.tamtam_live_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_chat_delete_own" ON public.tamtam_live_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.tamtam_live_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.tamtam_lives(id) ON DELETE CASCADE,
  from_user UUID NOT NULL,
  to_user UUID,
  signal_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_signals_live_idx ON public.tamtam_live_signals (live_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.tamtam_live_signals TO authenticated;
GRANT ALL ON public.tamtam_live_signals TO service_role;
ALTER TABLE public.tamtam_live_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_signals_read_involved" ON public.tamtam_live_signals FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR to_user IS NULL OR auth.uid() = to_user);
CREATE POLICY "live_signals_insert_own" ON public.tamtam_live_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);
CREATE POLICY "live_signals_delete_own" ON public.tamtam_live_signals FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- Viewers must be able to join/leave a live
DROP POLICY IF EXISTS "live_viewers_insert_own" ON public.tamtam_live_viewers;
CREATE POLICY "live_viewers_insert_own" ON public.tamtam_live_viewers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "live_viewers_delete_own" ON public.tamtam_live_viewers;
CREATE POLICY "live_viewers_delete_own" ON public.tamtam_live_viewers FOR DELETE TO authenticated USING (auth.uid() = user_id);
GRANT SELECT, INSERT, DELETE ON public.tamtam_live_viewers TO authenticated;

-- ============ ABURU: lien publication <-> produit ============
ALTER TABLE public.tamtam_posts ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.tamtam_products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tamtam_posts_product_idx ON public.tamtam_posts (product_id);

-- Realtime
ALTER TABLE public.tamtam_live_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.tamtam_live_signals REPLICA IDENTITY FULL;
ALTER TABLE public.tamtam_live_viewers REPLICA IDENTITY FULL;
