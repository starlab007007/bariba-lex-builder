-- Safe public manifest for validated/published Apprendre reference voices.
-- Only non-sensitive fields from active, approved, current-content takes are exposed.
CREATE OR REPLACE FUNCTION public.apprendre_audio_manifest()
RETURNS TABLE (
  audio_key text,
  voice text,
  variant text,
  storage_path text,
  duration_ms integer,
  speaker_name text,
  kind text,
  pack text,
  priority integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.audio_key,
    t.voice,
    t.variant,
    t.storage_path,
    t.duration_ms,
    CASE WHEN c.show_name THEN c.display_name ELSE NULL END AS speaker_name,
    i.kind,
    i.pack,
    i.priority
  FROM public.apprendre_audio_takes AS t
  JOIN public.apprendre_audio_items AS i
    ON i.audio_key = t.audio_key
   AND i.text_hash = t.text_hash
  JOIN public.apprendre_voice_consents AS c
    ON c.user_id = t.speaker_id
   AND c.withdrawn_at IS NULL
  WHERE t.status = 'approved'
    AND t.is_active = true
    AND i.in_content = true
  ORDER BY i.priority, t.audio_key, t.voice, t.variant;
$$;

REVOKE ALL ON FUNCTION public.apprendre_audio_manifest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_audio_manifest() TO anon, authenticated;

COMMENT ON FUNCTION public.apprendre_audio_manifest() IS
  'Public-safe manifest of active, approved Apprendre reference recordings. Exposes no speaker UUID or review metadata.';
