-- Reconcile Classe audio health metadata with the physical Storage catalog.
-- Historical health checks marked restored blobs as missing; learner playback must
-- reflect current physical presence, not stale audit metadata.

UPDATE public.classe_content_audios c
SET storage_available = true,
    storage_checked_at = now(),
    storage_error = null,
    updated_at = now()
WHERE c.status = 'approved'
  AND c.is_current = true
  AND EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'classe-audio'
      AND o.name = c.storage_path
  );

UPDATE public.classe_content_audios c
SET storage_available = false,
    storage_checked_at = now(),
    storage_error = 'NoSuchKey',
    updated_at = now()
WHERE c.status = 'approved'
  AND c.is_current = true
  AND NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'classe-audio'
      AND o.name = c.storage_path
  );
