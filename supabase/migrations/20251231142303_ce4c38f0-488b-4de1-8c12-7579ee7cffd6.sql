-- Create tamtam-media bucket for video/photo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('tamtam-media', 'tamtam-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for tamtam-media bucket
CREATE POLICY "Anyone can read tamtam-media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'tamtam-media');

CREATE POLICY "Authenticated users can upload to tamtam-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tamtam-media');

CREATE POLICY "Users can update their own tamtam-media files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tamtam-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own tamtam-media files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tamtam-media' AND auth.uid()::text = (storage.foldername(name))[1]);