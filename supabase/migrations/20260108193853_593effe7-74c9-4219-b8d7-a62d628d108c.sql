-- Ensure template-assets bucket has proper public access policies
-- Create policy for public read access
CREATE POLICY "Public read access for template-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'template-assets');

-- Create policy for authenticated users to upload (for edge functions using service role)
CREATE POLICY "Authenticated upload for template-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'template-assets');

-- Create policy for service role full access
CREATE POLICY "Service role full access template-assets"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'template-assets')
WITH CHECK (bucket_id = 'template-assets');