-- Trigger helpers must not be directly executable through the exposed API.
REVOKE ALL ON FUNCTION public.classe_content_audios_handle_versioning() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classe_content_audios_republish_previous() FROM PUBLIC, anon, authenticated;
