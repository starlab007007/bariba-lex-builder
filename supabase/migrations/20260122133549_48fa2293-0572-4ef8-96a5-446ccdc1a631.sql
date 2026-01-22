-- Create videos table for published content
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  template_id TEXT,
  template_name TEXT,
  duration_seconds INTEGER,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public videos are viewable by everyone"
ON public.videos FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can view their own videos"
ON public.videos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos"
ON public.videos FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own videos"
ON public.videos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
ON public.videos FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for videos bucket
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for videos
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;