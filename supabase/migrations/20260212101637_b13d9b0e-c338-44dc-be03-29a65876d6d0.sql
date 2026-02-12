
-- Character references for AI consistency
CREATE TABLE IF NOT EXISTS public.character_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_name TEXT NOT NULL UNIQUE,
  reference_image_url TEXT NOT NULL,
  style_keywords TEXT[] DEFAULT '{}',
  color_palette TEXT[] DEFAULT '{}',
  embedding_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.character_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Character references are viewable by everyone"
  ON public.character_references FOR SELECT USING (true);

-- Add quality columns to anime_scene_library
ALTER TABLE public.anime_scene_library
  ADD COLUMN IF NOT EXISTS character_reference_id UUID REFERENCES public.character_references(id),
  ADD COLUMN IF NOT EXISTS consistency_score DECIMAL(3,2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_character_ref ON public.anime_scene_library(character_reference_id);
CREATE INDEX IF NOT EXISTS idx_consistency ON public.anime_scene_library(consistency_score);
CREATE INDEX IF NOT EXISTS idx_quality ON public.anime_scene_library(quality_score);
