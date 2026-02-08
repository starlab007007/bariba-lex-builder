
-- Add ai_metadata JSONB column to asset_imports for storing all AI-generated classification details
ALTER TABLE public.asset_imports 
ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT NULL;

-- Add ai_analysis_status to track whether AI analysis was performed
ALTER TABLE public.asset_imports 
ADD COLUMN IF NOT EXISTS ai_analysis_status TEXT DEFAULT 'pending';

-- Add ai_confidence score
ALTER TABLE public.asset_imports 
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC DEFAULT NULL;

-- Add index for querying by AI metadata fields
CREATE INDEX IF NOT EXISTS idx_asset_imports_ai_metadata ON public.asset_imports USING GIN(ai_metadata);

-- Add index for filtering by analysis status
CREATE INDEX IF NOT EXISTS idx_asset_imports_ai_status ON public.asset_imports(ai_analysis_status);

-- Add comment for documentation
COMMENT ON COLUMN public.asset_imports.ai_metadata IS 'Stores full AI-generated classification: style, emotion, scene_type, character_type, action, time_of_day, description_en, description_fr for images/videos; title, artist, category, mood, tags, description_fr for music';
COMMENT ON COLUMN public.asset_imports.ai_analysis_status IS 'Status of AI analysis: pending, completed, failed, skipped';
COMMENT ON COLUMN public.asset_imports.ai_confidence IS 'AI confidence score for the classification (0-1)';
