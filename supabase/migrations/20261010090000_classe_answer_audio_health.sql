-- Physical health registry for private student / teacher answer audio.
-- Keeps historical paths for possible restoration while preventing broken players.
CREATE TABLE IF NOT EXISTS public.classe_answer_audio_health (
  path text PRIMARY KEY,
  available boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now(),
  error text
);

COMMENT ON TABLE public.classe_answer_audio_health IS
  'Physical Storage health for paths in the private classe-answers-audio bucket.';
COMMENT ON COLUMN public.classe_answer_audio_health.available IS
  'True only after a successful upload/audit. False means the blob is unavailable and must be restored or rerecorded.';

ALTER TABLE public.classe_answer_audio_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users read Classe answer audio health" ON public.classe_answer_audio_health;
CREATE POLICY "Authorized users read Classe answer audio health"
ON public.classe_answer_audio_health
FOR SELECT TO authenticated
USING (
  split_part(path, '/', 1) = auth.uid()::text
  OR public.is_teacher_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.classe_answer_keys k
    WHERE k.teacher_audio_path = classe_answer_audio_health.path
  )
  OR EXISTS (
    SELECT 1 FROM public.classe_student_answers a
    WHERE a.user_id = auth.uid()
      AND (
        a.answer_audio_path = classe_answer_audio_health.path
        OR a.teacher_audio_path = classe_answer_audio_health.path
        OR a.teacher_audio_personal_path = classe_answer_audio_health.path
        OR a.teacher_audio_generic_path = classe_answer_audio_health.path
      )
  )
);

CREATE OR REPLACE FUNCTION public.classe_mark_answer_audio_available(_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF coalesce(_path, '') = '' THEN
    RAISE EXCEPTION 'Audio path required';
  END IF;
  IF split_part(_path, '/', 1) <> _uid::text
     AND NOT public.is_teacher_or_admin(_uid) THEN
    RAISE EXCEPTION 'Not allowed to publish this audio path';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'classe-answers-audio'
      AND o.name = _path
  ) THEN
    RAISE EXCEPTION 'Audio object metadata not found';
  END IF;

  INSERT INTO public.classe_answer_audio_health(path, available, checked_at, error)
  VALUES (_path, true, now(), NULL)
  ON CONFLICT (path) DO UPDATE
    SET available = true, checked_at = now(), error = NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.classe_mark_answer_audio_available(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classe_mark_answer_audio_available(text) TO authenticated;

-- The complete 2026-10-10 server audit found every currently referenced legacy
-- classe-answers-audio blob physically absent (46 student + 5 answer-key paths).
-- Preserve paths but mark them unavailable.
WITH refs AS (
  SELECT answer_audio_path AS path FROM public.classe_student_answers WHERE answer_audio_path IS NOT NULL
  UNION
  SELECT teacher_audio_path FROM public.classe_student_answers WHERE teacher_audio_path IS NOT NULL
  UNION
  SELECT teacher_audio_personal_path FROM public.classe_student_answers WHERE teacher_audio_personal_path IS NOT NULL
  UNION
  SELECT teacher_audio_generic_path FROM public.classe_student_answers WHERE teacher_audio_generic_path IS NOT NULL
  UNION
  SELECT teacher_audio_path FROM public.classe_answer_keys WHERE teacher_audio_path IS NOT NULL
)
INSERT INTO public.classe_answer_audio_health(path, available, checked_at, error)
SELECT path, false, now(), 'Not found'
FROM refs
WHERE path IS NOT NULL
ON CONFLICT (path) DO UPDATE
  SET available = false, checked_at = now(), error = 'Not found';

CREATE INDEX IF NOT EXISTS idx_classe_answer_audio_health_available
  ON public.classe_answer_audio_health(available, checked_at);
