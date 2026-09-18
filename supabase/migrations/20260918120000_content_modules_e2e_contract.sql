-- Contrat backend final des six modules de création de contenu FITILA.
-- Cette migration rend les opérations Live atomiques, resserre les RLS et
-- expose une version de schéma vérifiable par la CI avant toute release.

-- ---------------------------------------------------------------------------
-- Sagesse Battle : une seule réponse active par joueur et par défi.
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY challenge_id, user_id
           ORDER BY created_at DESC, id DESC
         ) AS row_number
  FROM public.battle_responses
)
DELETE FROM public.battle_responses response
USING ranked
WHERE response.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_battle_responses_challenge_user
  ON public.battle_responses (challenge_id, user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'battle_responses_score_range'
      AND conrelid = 'public.battle_responses'::regclass
  ) THEN
    ALTER TABLE public.battle_responses
      ADD CONSTRAINT battle_responses_score_range CHECK (
        score BETWEEN 0 AND 100 AND xp_awarded BETWEEN 0 AND 100
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'battle_responses_content_length'
      AND conrelid = 'public.battle_responses'::regclass
  ) THEN
    ALTER TABLE public.battle_responses
      ADD CONSTRAINT battle_responses_content_length CHECK (
        char_length(answer_text) BETWEEN 1 AND 1000
        AND char_length(challenge_id) BETWEEN 1 AND 64
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Corpus Sasara et Handunia : bornes empêchant les charges vides/démesurées.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'corpus_contributions_content_length'
      AND conrelid = 'public.corpus_contributions'::regclass
  ) THEN
    ALTER TABLE public.corpus_contributions
      ADD CONSTRAINT corpus_contributions_content_length CHECK (
        char_length(source_text) BETWEEN 1 AND 10000
        AND char_length(translated_text) BETWEEN 1 AND 10000
        AND char_length(source_lang) BETWEEN 2 AND 16
        AND char_length(target_lang) BETWEEN 2 AND 16
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'handunia_lieux_content_length'
      AND conrelid = 'public.handunia_lieux'::regclass
  ) THEN
    ALTER TABLE public.handunia_lieux
      ADD CONSTRAINT handunia_lieux_content_length CHECK (
        char_length(name) BETWEEN 1 AND 120
        AND char_length(description) <= 2000
        AND char_length(icon) BETWEEN 1 AND 32
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'handunia_fragments_content_length'
      AND conrelid = 'public.handunia_fragments'::regclass
  ) THEN
    ALTER TABLE public.handunia_fragments
      ADD CONSTRAINT handunia_fragments_content_length CHECK (
        char_length(text) BETWEEN 1 AND 5000
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Live Griot IA : appartenance vérifiée par le serveur et compteur exact.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can join/leave lives" ON public.tamtam_live_viewers;
DROP POLICY IF EXISTS "Users join lives as themselves" ON public.tamtam_live_viewers;
DROP POLICY IF EXISTS "Users leave their own live membership" ON public.tamtam_live_viewers;

CREATE POLICY "Users join lives as themselves"
  ON public.tamtam_live_viewers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tamtam_lives live
      WHERE live.id = live_id AND live.status = 'live'
    )
  );

CREATE POLICY "Users leave their own live membership"
  ON public.tamtam_live_viewers FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_live_viewer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_live_id UUID;
BEGIN
  target_live_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.live_id
    ELSE NEW.live_id
  END;
  UPDATE public.tamtam_lives
  SET viewer_count = (
    SELECT count(*)::INTEGER
    FROM public.tamtam_live_viewers viewer
    WHERE viewer.live_id = target_live_id
  )
  WHERE id = target_live_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_live_viewer_count_after_change
  ON public.tamtam_live_viewers;
CREATE TRIGGER sync_live_viewer_count_after_change
AFTER INSERT OR DELETE ON public.tamtam_live_viewers
FOR EACH ROW EXECUTE FUNCTION public.sync_live_viewer_count();

UPDATE public.tamtam_lives live
SET viewer_count = (
  SELECT count(*)::INTEGER
  FROM public.tamtam_live_viewers viewer
  WHERE viewer.live_id = live.id
);

-- L'ancien RPC n'est plus appelé par l'application. Il reste présent pour
-- compatibilité, mais aucun client public ne peut modifier le compteur.
REVOKE ALL ON FUNCTION public.adjust_live_viewer_count(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_live_viewer_count(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.adjust_live_viewer_count(UUID, INTEGER) FROM authenticated;

CREATE OR REPLACE FUNCTION public.is_live_participant(
  p_live_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tamtam_lives live
    WHERE live.id = p_live_id
      AND live.status = 'live'
      AND (
        live.host_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.tamtam_live_viewers viewer
          WHERE viewer.live_id = p_live_id AND viewer.user_id = p_user_id
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_live_participant(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_live_participant(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users send live chat messages"
  ON public.tamtam_live_chat_messages;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tamtam_live_chat_message_length'
      AND conrelid = 'public.tamtam_live_chat_messages'::regclass
  ) THEN
    ALTER TABLE public.tamtam_live_chat_messages
      ADD CONSTRAINT tamtam_live_chat_message_length CHECK (
        char_length(message) BETWEEN 1 AND 2000
      );
  END IF;
END;
$$;

CREATE POLICY "Live participants send chat messages"
  ON public.tamtam_live_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_live_participant(live_id, auth.uid())
    AND char_length(message) BETWEEN 1 AND 2000
  );

DROP POLICY IF EXISTS "Users read signals addressed to or sent by them"
  ON public.tamtam_live_signals;
DROP POLICY IF EXISTS "Users send signals as themselves"
  ON public.tamtam_live_signals;
DROP POLICY IF EXISTS "Recipients delete consumed live signals"
  ON public.tamtam_live_signals;

CREATE POLICY "Live participants read their own signals"
  ON public.tamtam_live_signals FOR SELECT
  USING (
    (auth.uid() = to_user OR auth.uid() = from_user)
    AND public.is_live_participant(live_id, auth.uid())
  );

CREATE POLICY "Live participants signal each other"
  ON public.tamtam_live_signals FOR INSERT
  WITH CHECK (
    auth.uid() = from_user
    AND from_user <> to_user
    AND public.is_live_participant(live_id, from_user)
    AND public.is_live_participant(live_id, to_user)
    AND octet_length(payload::TEXT) <= 65536
  );

CREATE POLICY "Recipients delete consumed live signals"
  ON public.tamtam_live_signals FOR DELETE
  USING (auth.uid() = to_user);

-- Réappliquer l'ajout Realtime sans échouer si la table y figure déjà.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tamtam_live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.tamtam_live_chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tamtam_live_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.tamtam_live_signals;
  END IF;
END;
$$;

-- Contrat public minimal : la CI peut confirmer que l'ensemble exact des
-- migrations de ces modules est déployé sans lire de données utilisateur.
CREATE OR REPLACE FUNCTION public.fitila_content_modules_schema_version()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT '20260918.2'::TEXT;
$$;

REVOKE ALL ON FUNCTION public.fitila_content_modules_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fitila_content_modules_schema_version() TO anon;
GRANT EXECUTE ON FUNCTION public.fitila_content_modules_schema_version() TO authenticated;
