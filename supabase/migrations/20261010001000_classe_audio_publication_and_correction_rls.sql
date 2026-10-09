-- Classe end-to-end integrity hardening.
-- 1) is_current now means the currently PUBLISHED approved recording.
--    Uploading a new draft/submitted take must never hide an older approved take.
-- 2) Students may read only teacher correction audio that is actually referenced
--    by an answer key or by one of their own answers.

-- Reconcile the existing publication state first.
UPDATE public.classe_content_audios
SET is_current = false
WHERE is_current = true;

WITH latest_approved AS (
  SELECT DISTINCT ON (content_key) id
  FROM public.classe_content_audios
  WHERE status = 'approved'
  ORDER BY content_key, version DESC, created_at DESC
)
UPDATE public.classe_content_audios AS c
SET is_current = true
FROM latest_approved AS p
WHERE c.id = p.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_classe_audio_published_per_key
  ON public.classe_content_audios(content_key)
  WHERE is_current = true;

CREATE OR REPLACE FUNCTION public.classe_content_audios_handle_versioning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  max_version integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(MAX(version), 0)
      INTO max_version
      FROM public.classe_content_audios
     WHERE content_key = NEW.content_key;

    NEW.version := max_version + 1;

    IF NEW.status = 'approved' THEN
      UPDATE public.classe_content_audios
         SET is_current = false, updated_at = now()
       WHERE content_key = NEW.content_key
         AND is_current = true;
      NEW.is_current := true;
    ELSE
      -- Drafts/submissions/rejections are workflow versions, not publications.
      NEW.is_current := false;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.classe_content_audios
         SET is_current = false, updated_at = now()
       WHERE content_key = NEW.content_key
         AND id <> NEW.id
         AND is_current = true;
      NEW.is_current := true;
    ELSIF OLD.status = 'approved' AND OLD.is_current AND NEW.status <> 'approved' THEN
      -- The AFTER trigger promotes the previous approved version once this
      -- row has safely relinquished the unique published slot.
      NEW.is_current := false;
    ELSIF NEW.status <> 'approved' THEN
      NEW.is_current := false;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.classe_content_audios_republish_previous()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'approved'
     AND OLD.is_current
     AND NEW.status <> 'approved' THEN
    UPDATE public.classe_content_audios
       SET is_current = true, updated_at = now()
     WHERE id = (
       SELECT id
         FROM public.classe_content_audios
        WHERE content_key = NEW.content_key
          AND id <> NEW.id
          AND status = 'approved'
        ORDER BY version DESC, created_at DESC
        LIMIT 1
     );
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cca_versioning ON public.classe_content_audios;
CREATE TRIGGER trg_cca_versioning
BEFORE INSERT OR UPDATE OF status
ON public.classe_content_audios
FOR EACH ROW
EXECUTE FUNCTION public.classe_content_audios_handle_versioning();

DROP TRIGGER IF EXISTS trg_cca_republish_previous ON public.classe_content_audios;
CREATE TRIGGER trg_cca_republish_previous
AFTER UPDATE OF status
ON public.classe_content_audios
FOR EACH ROW
WHEN (OLD.status = 'approved' AND OLD.is_current = true AND NEW.status <> 'approved')
EXECUTE FUNCTION public.classe_content_audios_republish_previous();

-- Generic correction audio: readable by a signed-in learner only when the path
-- is referenced by an answer key.
DROP POLICY IF EXISTS "Students read answer-key correction audio" ON storage.objects;
CREATE POLICY "Students read answer-key correction audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND EXISTS (
    SELECT 1
    FROM public.classe_answer_keys k
    WHERE k.teacher_audio_path = storage.objects.name
  )
);

-- Personal/generic teacher corrections attached to a student's own answer.
DROP POLICY IF EXISTS "Students read teacher correction audio on own answers" ON storage.objects;
CREATE POLICY "Students read teacher correction audio on own answers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND EXISTS (
    SELECT 1
    FROM public.classe_student_answers a
    WHERE a.user_id = auth.uid()
      AND (
        a.teacher_audio_path = storage.objects.name
        OR a.teacher_audio_personal_path = storage.objects.name
        OR a.teacher_audio_generic_path = storage.objects.name
      )
  )
);

COMMENT ON INDEX public.uq_classe_audio_published_per_key IS
  'At most one published/active approved Classe recording per content_key.';
