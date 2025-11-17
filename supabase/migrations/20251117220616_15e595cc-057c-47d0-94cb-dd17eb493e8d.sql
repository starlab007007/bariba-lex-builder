-- Table pour le feedback utilisateur sur les entrées du dictionnaire
CREATE TABLE IF NOT EXISTS public.dictionary_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.dictionary_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('correction', 'missing_info', 'example_request', 'phonetic_correction', 'other')),
  field_name TEXT,
  suggested_value TEXT,
  notes TEXT,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_dictionary_feedback_entry_id ON public.dictionary_feedback(entry_id);
CREATE INDEX idx_dictionary_feedback_user_id ON public.dictionary_feedback(user_id);
CREATE INDEX idx_dictionary_feedback_validated ON public.dictionary_feedback(is_validated);

-- RLS policies
ALTER TABLE public.dictionary_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own dictionary feedback"
  ON public.dictionary_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own dictionary feedback"
  ON public.dictionary_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dictionary feedback"
  ON public.dictionary_feedback
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dictionary feedback"
  ON public.dictionary_feedback
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table pour stocker les enrichissements automatiques du dictionnaire
CREATE TABLE IF NOT EXISTS public.dictionary_enrichments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.dictionary_entries(id) ON DELETE CASCADE,
  enrichment_type TEXT NOT NULL CHECK (enrichment_type IN ('idiom_match', 'training_phrase', 'translation_feedback', 'ai_suggestion')),
  field_name TEXT NOT NULL,
  suggested_value TEXT,
  confidence_score NUMERIC(3,2),
  source_data JSONB,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_dictionary_enrichments_entry_id ON public.dictionary_enrichments(entry_id);
CREATE INDEX idx_dictionary_enrichments_type ON public.dictionary_enrichments(enrichment_type);

ALTER TABLE public.dictionary_enrichments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dictionary enrichments"
  ON public.dictionary_enrichments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view dictionary enrichments"
  ON public.dictionary_enrichments
  FOR SELECT
  USING (true);