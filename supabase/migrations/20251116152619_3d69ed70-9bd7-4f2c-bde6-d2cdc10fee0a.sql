-- Phase 6: Database Migration for Model Testing and Performance Tracking

-- Create table for storing model test results
CREATE TABLE IF NOT EXISTS public.model_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_phrase TEXT NOT NULL,
  source_language TEXT NOT NULL CHECK (source_language IN ('french', 'bariba')),
  target_language TEXT NOT NULL CHECK (target_language IN ('french', 'bariba')),
  local_translation TEXT,
  api_translation TEXT,
  local_confidence NUMERIC,
  api_confidence NUMERIC,
  local_duration_ms INTEGER,
  api_duration_ms INTEGER,
  tested_by UUID,
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_test_results_tested_by ON public.model_test_results(tested_by);
CREATE INDEX IF NOT EXISTS idx_model_test_results_tested_at ON public.model_test_results(tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_test_results_languages ON public.model_test_results(source_language, target_language);

-- Enable RLS
ALTER TABLE public.model_test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage test results"
  ON public.model_test_results FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view test results"
  ON public.model_test_results FOR SELECT
  USING (true);

-- Add new columns to translation_logs for better tracking
ALTER TABLE public.translation_logs 
  ADD COLUMN IF NOT EXISTS translation_method TEXT CHECK (translation_method IN ('local', 'api', 'fallback')),
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Create index for translation_logs performance queries
CREATE INDEX IF NOT EXISTS idx_translation_logs_method ON public.translation_logs(translation_method);
CREATE INDEX IF NOT EXISTS idx_translation_logs_model_version ON public.translation_logs(model_version);

-- Add comment explaining the purpose
COMMENT ON TABLE public.model_test_results IS 'Stores results from admin model testing to compare local vs API translation performance';