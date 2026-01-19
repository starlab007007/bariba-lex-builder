-- Politique RLS pour lecture publique des assets Envato
CREATE POLICY "Allow public read access to envato assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'envato-assets');