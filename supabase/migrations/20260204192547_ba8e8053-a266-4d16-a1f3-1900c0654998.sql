-- Create anime_scene_library table for pre-generated images
CREATE TABLE public.anime_scene_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Classification fields
  style TEXT NOT NULL CHECK (style IN ('manga', 'chibi', 'fantasy', 'african')),
  emotion TEXT NOT NULL CHECK (emotion IN ('joy', 'sadness', 'wonder', 'fear', 'excitement', 'peace', 'tension')),
  scene_type TEXT NOT NULL CHECK (scene_type IN ('village', 'forest', 'river', 'mountain', 'market', 'home', 'night', 'journey', 'gathering', 'spirit')),
  character_type TEXT CHECK (character_type IN ('child_boy', 'child_girl', 'elder', 'animal', 'spirit', 'group')),
  action TEXT CHECK (action IN ('standing', 'walking', 'talking', 'dancing', 'working', 'sleeping', 'running', 'discovering')),
  time_of_day TEXT CHECK (time_of_day IN ('dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night')),
  weather TEXT CHECK (weather IN ('clear', 'cloudy', 'rain', 'storm', 'fog')),
  
  -- Descriptions and tags
  description_fr TEXT,
  description_en TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Image storage
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  
  -- Usage statistics
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_anime_library_style ON public.anime_scene_library(style);
CREATE INDEX idx_anime_library_emotion ON public.anime_scene_library(emotion);
CREATE INDEX idx_anime_library_scene_type ON public.anime_scene_library(scene_type);
CREATE INDEX idx_anime_library_composite ON public.anime_scene_library(style, emotion, scene_type);

-- Enable RLS
ALTER TABLE public.anime_scene_library ENABLE ROW LEVEL SECURITY;

-- Anyone can read the library (public access for matching)
CREATE POLICY "Anyone can read anime library"
ON public.anime_scene_library
FOR SELECT
USING (true);

-- Only admins can modify the library
CREATE POLICY "Admins can manage anime library"
ON public.anime_scene_library
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_anime_library_updated_at
BEFORE UPDATE ON public.anime_scene_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for anime library images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('anime-library', 'anime-library', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for anime-library bucket
CREATE POLICY "Anime library images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'anime-library');

CREATE POLICY "Admins can upload anime library images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'anime-library' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update anime library images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'anime-library' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete anime library images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'anime-library' AND has_role(auth.uid(), 'admin'::app_role));