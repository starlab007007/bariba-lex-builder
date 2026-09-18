-- Correctifs d'exploitation détectés lors de l'audit Android 1.8.1+12.

-- Le compteur communautaire de Sasara IA doit compter les contributions de
-- tous les membres sans exposer leurs textes aux autres utilisateurs.
CREATE OR REPLACE FUNCTION public.corpus_contribution_count_this_month()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)
  FROM public.corpus_contributions
  WHERE created_at >= date_trunc('month', now());
$$;

REVOKE ALL ON FUNCTION public.corpus_contribution_count_this_month() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.corpus_contribution_count_this_month() TO authenticated;

-- Un spectateur qui rejoint de nouveau le même direct ne doit pas faire
-- échouer toute la connexion sur une contrainte d'unicité.
DELETE FROM public.tamtam_live_viewers a
USING public.tamtam_live_viewers b
WHERE a.live_id = b.live_id
  AND a.user_id = b.user_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tamtam_live_viewers_live_user
  ON public.tamtam_live_viewers (live_id, user_id);

-- L'ancien RPC acceptait tout live_id. Limiter la mise à jour aux directs
-- auxquels l'appelant participe empêche de modifier le compteur d'un autre
-- direct arbitrairement tout en gardant l'opération atomique.
CREATE OR REPLACE FUNCTION public.adjust_live_viewer_count(
  p_live_id UUID,
  p_delta INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tamtam_live_viewers
    WHERE live_id = p_live_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'viewer membership required';
  END IF;

  UPDATE public.tamtam_lives
  SET viewer_count = GREATEST(0, COALESCE(viewer_count, 0) + p_delta)
  WHERE id = p_live_id;
END;
$$;
