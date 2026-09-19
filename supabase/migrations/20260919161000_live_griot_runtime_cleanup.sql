-- FITILA Live Griot IA — cleanup runtime state when a live ends.
-- Keeps chat history but removes ephemeral viewers/signals and resets count.

CREATE OR REPLACE FUNCTION public.cleanup_griot_live_runtime_on_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'live' AND NEW.status <> 'live' THEN
    DELETE FROM public.tamtam_live_signals
    WHERE live_id = NEW.id;

    DELETE FROM public.tamtam_live_viewers
    WHERE live_id = NEW.id;

    NEW.viewer_count := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_griot_live_runtime_on_end
  ON public.tamtam_lives;

CREATE TRIGGER cleanup_griot_live_runtime_on_end
BEFORE UPDATE OF status ON public.tamtam_lives
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.cleanup_griot_live_runtime_on_end();

-- Refresh the backend contract version for the Live lifecycle hardening.
CREATE OR REPLACE FUNCTION public.fitila_content_modules_schema_version()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT '20260919.3'::TEXT;
$$;

REVOKE ALL ON FUNCTION public.fitila_content_modules_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fitila_content_modules_schema_version() TO anon;
GRANT EXECUTE ON FUNCTION public.fitila_content_modules_schema_version() TO authenticated;
