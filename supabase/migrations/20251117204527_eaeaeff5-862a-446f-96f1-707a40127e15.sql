-- Phase 4 du rapport: Système de feedback utilisateur
-- Permet aux utilisateurs de corriger les traductions et améliorer le modèle

-- Table pour stocker les idiomes baatonum (2000+ expressions)
CREATE TABLE IF NOT EXISTS public.idiomatic_expressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  french_expression TEXT NOT NULL,
  bariba_expression TEXT NOT NULL,
  category TEXT NOT NULL, -- ex: émotions, météo, vie quotidienne
  usage_context TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_idiomatic_french ON public.idiomatic_expressions(french_expression);
CREATE INDEX idx_idiomatic_bariba ON public.idiomatic_expressions(bariba_expression);
CREATE INDEX idx_idiomatic_category ON public.idiomatic_expressions(category);

-- RLS policies
ALTER TABLE public.idiomatic_expressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Idiomes visibles par tous"
ON public.idiomatic_expressions
FOR SELECT
USING (true);

CREATE POLICY "Admins peuvent insérer des idiomes"
ON public.idiomatic_expressions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins peuvent modifier des idiomes"
ON public.idiomatic_expressions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_idiomatic_expressions_updated_at
BEFORE UPDATE ON public.idiomatic_expressions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour la mémoire de traduction contextuelle (Phase 5)
-- Stocke l'historique des traductions pour cohérence dans une session
CREATE TABLE IF NOT EXISTS public.translation_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche par session
CREATE INDEX idx_translation_context_session ON public.translation_context(session_id, created_at DESC);
CREATE INDEX idx_translation_context_user ON public.translation_context(user_id, created_at DESC);

-- RLS policies
ALTER TABLE public.translation_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs peuvent voir leur contexte"
ON public.translation_context
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Utilisateurs peuvent créer du contexte"
ON public.translation_context
FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Amélioration de la table translation_feedback existante
-- Ajouter des colonnes pour le réentraînement automatique
ALTER TABLE public.translation_feedback
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS validated_by UUID,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS used_for_training BOOLEAN DEFAULT false;

-- Index pour le réentraînement
CREATE INDEX IF NOT EXISTS idx_feedback_validated ON public.translation_feedback(is_validated, used_for_training);

-- Insérer des idiomes de base (exemples du rapport)
INSERT INTO public.idiomatic_expressions (french_expression, bariba_expression, category, is_verified) VALUES
('avoir le cafard', 'nim kɛ mɔ kpɛm', 'émotions', true),
('il pleut des cordes', 'nim nɑ sõrõ deburu', 'météo', true),
('casser sa pipe', 'u ku sĩi', 'vie et mort', true),
('tomber dans les pommes', 'u yɔɔ tɔɔ', 'santé', true),
('avoir un chat dans la gorge', 'u gbee sɔ̃ɔ yùga ma', 'santé', true),
('coûter les yeux de la tête', 'u deburu gã kãrã', 'argent', true),
('poser un lapin', 'u bii yɔ̃ soko', 'relations', true),
('être dans la lune', 'u de sãwĩn ma', 'état d''esprit', true),
('avoir la main verte', 'u gbee kpɛɛ nɔɔra', 'compétences', true),
('jeter l''éponge', 'u bii kãyã', 'abandon', true)
ON CONFLICT DO NOTHING;