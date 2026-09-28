-- Centralisation FITILA: aligner Sagesse Battle avec le frontend courant
-- sans supprimer les réponses historiques.

CREATE TABLE IF NOT EXISTS public.battle_challenges (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  challenge_date date NOT NULL DEFAULT CURRENT_DATE,
  prompt_fr text NOT NULL,
  prompt_ba text,
  proverb_fr text,
  proverb_ba text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS battle_challenges_date_idx
  ON public.battle_challenges (challenge_date);

ALTER TABLE public.battle_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS battle_challenges_read ON public.battle_challenges;
CREATE POLICY battle_challenges_read
  ON public.battle_challenges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS battle_challenges_admin_write ON public.battle_challenges;
CREATE POLICY battle_challenges_admin_write
  ON public.battle_challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.battle_challenges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.battle_challenges TO authenticated;
GRANT ALL ON public.battle_challenges TO service_role;

ALTER TABLE public.battle_responses
  ADD COLUMN IF NOT EXISTS response_text text,
  ADD COLUMN IF NOT EXISTS response_lang text NOT NULL DEFAULT 'bariba',
  ADD COLUMN IF NOT EXISTS ai_score integer,
  ADD COLUMN IF NOT EXISTS local_score integer,
  ADD COLUMN IF NOT EXISTS scoring_method text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS ai_feedback text,
  ADD COLUMN IF NOT EXISTS votes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.battle_responses
SET
  response_text = COALESCE(response_text, answer_text),
  local_score = COALESCE(local_score, score),
  scoring_method = CASE
    WHEN scoring_method IS NULL OR scoring_method = '' THEN 'legacy'
    ELSE scoring_method
  END
WHERE response_text IS NULL OR local_score IS NULL;

ALTER TABLE public.battle_responses
  ALTER COLUMN response_text SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS battle_responses_challenge_user_uidx
  ON public.battle_responses (challenge_id, user_id);

-- Reconstituer les défis historiques à partir des réponses existantes.
INSERT INTO public.battle_challenges (
  id, challenge_date, prompt_fr, prompt_ba, is_active, created_at
)
SELECT
  br.challenge_id,
  CASE
    WHEN br.challenge_id ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN br.challenge_id::date
    ELSE br.created_at::date
  END,
  COALESCE(NULLIF(br.prompt_francais, ''), 'Défi de sagesse'),
  NULLIF(br.prompt_bariba, ''),
  true,
  min(br.created_at)
FROM public.battle_responses br
GROUP BY br.challenge_id, br.prompt_francais, br.prompt_bariba, br.created_at::date
ON CONFLICT (id) DO NOTHING;

UPDATE public.battle_responses br
SET votes_count = COALESCE(v.cnt, 0)
FROM (
  SELECT response_id, count(*)::int AS cnt
  FROM public.battle_response_votes
  GROUP BY response_id
) v
WHERE br.id = v.response_id;

CREATE OR REPLACE FUNCTION public.battle_sync_votes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.battle_responses
    SET votes_count = votes_count + 1
    WHERE id = NEW.response_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.battle_responses
    SET votes_count = GREATEST(votes_count - 1, 0)
    WHERE id = OLD.response_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS battle_votes_count_sync_trg ON public.battle_response_votes;
CREATE TRIGGER battle_votes_count_sync_trg
AFTER INSERT OR DELETE ON public.battle_response_votes
FOR EACH ROW EXECUTE FUNCTION public.battle_sync_votes_count();

DROP TRIGGER IF EXISTS battle_responses_updated_at_trg ON public.battle_responses;
CREATE TRIGGER battle_responses_updated_at_trg
BEFORE UPDATE ON public.battle_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
