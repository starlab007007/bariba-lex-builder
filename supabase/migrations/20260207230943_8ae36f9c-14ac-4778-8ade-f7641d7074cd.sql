
-- Add video support columns to anime_scene_library
ALTER TABLE public.anime_scene_library 
ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'photo',
ADD COLUMN video_url TEXT,
ADD COLUMN video_duration REAL;

-- Add index for filtering by asset_type
CREATE INDEX idx_anime_scene_library_asset_type ON public.anime_scene_library (asset_type);
