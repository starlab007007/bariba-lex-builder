-- Create ai_training_context table
CREATE TABLE public.ai_training_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  dictionary_count INTEGER NOT NULL DEFAULT 0,
  phrases_count INTEGER NOT NULL DEFAULT 0,
  training_data JSONB,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create translation_memory table
CREATE TABLE public.translation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  context JSONB,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create translation_feedback table
CREATE TABLE public.translation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_log_id UUID REFERENCES public.translation_logs(id),
  user_id UUID REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'correction')),
  suggested_translation TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance (skip existing ones)
CREATE INDEX IF NOT EXISTS idx_translation_memory_source ON public.translation_memory(source_text);
CREATE INDEX IF NOT EXISTS idx_translation_memory_target ON public.translation_memory(target_text);
CREATE INDEX IF NOT EXISTS idx_translation_memory_languages ON public.translation_memory(source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_keywords ON public.dictionary_entries USING GIN(french_keywords);
CREATE INDEX IF NOT EXISTS idx_training_phrases_validated ON public.training_phrases(is_validated);

-- Enable RLS
ALTER TABLE public.ai_training_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_training_context
CREATE POLICY "Admins can manage training context"
ON public.ai_training_context
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read training context"
ON public.ai_training_context
FOR SELECT
USING (true);

-- RLS Policies for translation_memory
CREATE POLICY "Admins can manage translation memory"
ON public.translation_memory
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read translation memory"
ON public.translation_memory
FOR SELECT
USING (true);

-- RLS Policies for translation_feedback
CREATE POLICY "Users can insert their own feedback"
ON public.translation_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.translation_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.translation_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updating translation_memory updated_at
CREATE TRIGGER update_translation_memory_updated_at
BEFORE UPDATE ON public.translation_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();