-- Drop if previously created (idempotent)
DROP POLICY IF EXISTS "Teachers upload personal correction audio" ON storage.objects;
DROP POLICY IF EXISTS "Teachers delete personal correction audio" ON storage.objects;

CREATE POLICY "Teachers upload personal correction audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classe-answers-audio'
  AND (storage.foldername(name))[1] = 'teacher-personal'
  AND public.is_teacher_or_admin(auth.uid())
);

CREATE POLICY "Teachers delete personal correction audio"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND (storage.foldername(name))[1] = 'teacher-personal'
  AND public.is_teacher_or_admin(auth.uid())
);