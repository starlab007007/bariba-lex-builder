-- Create storage bucket for Envato assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'envato-assets', 
  'envato-assets', 
  true,
  52428800, -- 50MB max
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/webm', 'video/mp4', 'audio/mpeg', 'audio/mp3', 'model/gltf-binary', 'font/ttf', 'font/otf', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for envato-assets bucket
CREATE POLICY "Public read access for envato-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'envato-assets');

CREATE POLICY "Authenticated users can upload to envato-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'envato-assets');

CREATE POLICY "Authenticated users can update envato-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'envato-assets');

CREATE POLICY "Authenticated users can delete from envato-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'envato-assets');