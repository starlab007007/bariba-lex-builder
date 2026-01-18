-- Create asset_imports table for tracking all imported assets
CREATE TABLE public.asset_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- File info
  original_name TEXT NOT NULL,
  target_name TEXT NOT NULL,
  category TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  
  -- Metadata
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'uploaded', 'converting', 'converted', 'failed')),
  error_message TEXT,
  
  -- Conversion info
  needs_conversion BOOLEAN DEFAULT FALSE,
  original_format TEXT,
  converted_format TEXT,
  conversion_progress INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX idx_asset_imports_category ON public.asset_imports(category);
CREATE INDEX idx_asset_imports_status ON public.asset_imports(status);
CREATE INDEX idx_asset_imports_created_at ON public.asset_imports(created_at DESC);
CREATE INDEX idx_asset_imports_user_id ON public.asset_imports(user_id);

-- Enable RLS
ALTER TABLE public.asset_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all imports"
ON public.asset_imports FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own imports"
ON public.asset_imports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imports"
ON public.asset_imports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imports"
ON public.asset_imports FOR UPDATE
USING (auth.uid() = user_id);

-- Update storage bucket configuration for envato-assets
-- Set file size limit to 500MB (524288000 bytes)
UPDATE storage.buckets 
SET file_size_limit = 524288000
WHERE id = 'envato-assets';

-- Create storage policy for all required MIME types if not exists
-- Drop existing restrictive policies first
DROP POLICY IF EXISTS "Restrict file types" ON storage.objects;

-- Allow all necessary file types for envato-assets bucket
CREATE POLICY "Allow all asset file types"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'envato-assets' AND (
    -- Videos
    (storage.extension(name) IN ('mov', 'mp4', 'webm')) OR
    -- Images  
    (storage.extension(name) IN ('png', 'webp', 'jpg', 'jpeg')) OR
    -- Audio
    (storage.extension(name) IN ('mp3', 'wav', 'ogg', 'm4a')) OR
    -- 3D Models
    (storage.extension(name) IN ('glb', 'gltf')) OR
    -- Fonts
    (storage.extension(name) IN ('ttf', 'otf', 'woff', 'woff2'))
  )
);