-- Allow anonymous (public, unauthenticated) users to read approved current audios
-- so learners can listen to all lessons N1/N2 without an account.

-- 1. Table policy
DROP POLICY IF EXISTS "Public can view approved current audios" ON public.classe_content_audios;
CREATE POLICY "Public can view approved current audios"
ON public.classe_content_audios
FOR SELECT
TO anon, authenticated
USING (status = 'approved' AND is_current = true);

-- 2. Storage policy: allow signed URL creation on approved audio files in classe-audio bucket
DROP POLICY IF EXISTS "Public read approved classe audio" ON storage.objects;
CREATE POLICY "Public read approved classe audio"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'classe-audio'
  AND EXISTS (
    SELECT 1 FROM public.classe_content_audios cca
    WHERE cca.storage_path = storage.objects.name
      AND cca.status = 'approved'
      AND cca.is_current = true
  )
);