-- Persist physical Storage health separately from editorial approval.
-- A row can be approved/current while its underlying blob is missing.
ALTER TABLE public.classe_content_audios
  ADD COLUMN IF NOT EXISTS storage_available boolean,
  ADD COLUMN IF NOT EXISTS storage_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS storage_error text;

COMMENT ON COLUMN public.classe_content_audios.storage_available IS
  'True only when the classe-audio blob has been physically verified as readable. False means restore/rerecord; NULL means not yet audited.';
COMMENT ON COLUMN public.classe_content_audios.storage_checked_at IS
  'Last time the underlying Storage blob was checked.';
COMMENT ON COLUMN public.classe_content_audios.storage_error IS
  'Last Storage health error, e.g. NoSuchKey.';

CREATE INDEX IF NOT EXISTS idx_classe_content_audios_playable
  ON public.classe_content_audios(content_key)
  WHERE status='approved' AND is_current=true AND storage_available=true;
