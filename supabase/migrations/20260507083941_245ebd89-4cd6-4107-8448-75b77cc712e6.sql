-- Revoke anon EXECUTE on security-sensitive functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_teacher_or_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_phone(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_level(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_contribution_points() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_post_likes_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_phrase_recordings_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_teacher_fields_classe_answers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_tamtam_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.classe_content_audios_handle_versioning() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_market_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;