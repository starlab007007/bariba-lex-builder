-- Future approvals must reference a blob that the application successfully uploaded.
CREATE OR REPLACE FUNCTION public.classe_audio_require_playable_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND NEW.storage_available IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot approve Classe audio: Storage blob is not verified as available';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_classe_audio_require_playable_on_approval ON public.classe_content_audios;
CREATE TRIGGER trg_classe_audio_require_playable_on_approval
BEFORE INSERT OR UPDATE OF status
ON public.classe_content_audios
FOR EACH ROW
EXECUTE FUNCTION public.classe_audio_require_playable_on_approval();

REVOKE ALL ON FUNCTION public.classe_audio_require_playable_on_approval() FROM PUBLIC, anon, authenticated;
