-- Add audio fields to student answers
ALTER TABLE public.classe_student_answers
  ADD COLUMN IF NOT EXISTS answer_audio_path text,
  ADD COLUMN IF NOT EXISTS answer_audio_duration numeric;

-- Add audio fields to teacher answer keys
ALTER TABLE public.classe_answer_keys
  ADD COLUMN IF NOT EXISTS teacher_audio_path text,
  ADD COLUMN IF NOT EXISTS teacher_audio_duration numeric;

-- Create private bucket for answer audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('classe-answers-audio', 'classe-answers-audio', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: students can manage their own audio under {user_id}/...
CREATE POLICY "Students upload own answer audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'classe-answers-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students read own answer audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students delete own answer audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Teachers/admins can read all answer audio
CREATE POLICY "Teachers read all answer audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND public.is_teacher_or_admin(auth.uid())
);

-- Teachers/admins can upload teacher correction audio under teacher/...
CREATE POLICY "Teachers upload teacher audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'classe-answers-audio'
  AND (storage.foldername(name))[1] = 'teacher'
  AND public.is_teacher_or_admin(auth.uid())
);

CREATE POLICY "Teachers delete teacher audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND (storage.foldername(name))[1] = 'teacher'
  AND public.is_teacher_or_admin(auth.uid())
);