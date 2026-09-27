-- FITILA Apprendre v2.4 — security hardening
-- Keep the published voice view subject to caller permissions/RLS and remove
-- implicit PUBLIC execution from SECURITY DEFINER helpers and actions.

ALTER VIEW public.apprendre_audio_published
  SET (security_invoker = true);

REVOKE ALL ON FUNCTION public.apprendre_is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_can_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_can_speak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apprendre_is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_can_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_can_speak(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.apprendre_takes_version() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apprendre_items_text_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apprendre_audit(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apprendre_activate_internal(uuid, boolean) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.apprendre_sign_consent(text, boolean, boolean, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_withdraw_consent() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_submit_take(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_review_take(uuid, text, int, int, int, int, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_activate_take(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_import_catalog(jsonb, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apprendre_audio_stats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.apprendre_sign_consent(text, boolean, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_withdraw_consent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_submit_take(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_review_take(uuid, text, int, int, int, int, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_activate_take(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_import_catalog(jsonb, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_audio_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.apprendre_is_active_audio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apprendre_is_active_audio(text) TO anon, authenticated;
