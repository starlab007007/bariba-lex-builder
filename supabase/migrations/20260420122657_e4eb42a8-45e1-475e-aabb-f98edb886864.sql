-- 1. Allow the 'alphabet' module
ALTER TABLE public.classe_content_audios DROP CONSTRAINT IF EXISTS classe_content_audios_module_check;
ALTER TABLE public.classe_content_audios ADD CONSTRAINT classe_content_audios_module_check
  CHECK (module IN ('lang','calcul','eval','gestion','grammaire','textprod','alphabet'));

-- 2. Personalized teacher audio per student answer
ALTER TABLE public.classe_student_answers
  ADD COLUMN IF NOT EXISTS teacher_audio_path text,
  ADD COLUMN IF NOT EXISTS teacher_audio_duration numeric;