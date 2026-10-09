-- Additional Classe hardening found by Supabase advisors.
REVOKE ALL ON FUNCTION public.protect_teacher_fields_classe_answers() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_classe_content_audios_admin_id
  ON public.classe_content_audios(admin_id)
  WHERE admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classe_student_answers_graded_by
  ON public.classe_student_answers(graded_by)
  WHERE graded_by IS NOT NULL;
