-- Table pour stocker les templates générés par IA
CREATE TABLE IF NOT EXISTS public.ai_generated_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  
  -- Métadonnées de base
  emoji TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  label_ba TEXT,
  description_fr TEXT NOT NULL,
  description_ba TEXT,
  family TEXT NOT NULL,
  collection TEXT,
  color TEXT NOT NULL,
  
  -- Contenu généré par IA
  ai_voice_description_fr TEXT,
  ai_voice_description_ba TEXT,
  ai_enhanced_description TEXT,
  ai_storyboard JSONB,
  ai_preview_image_url TEXT,
  ai_preview_image_base64 TEXT,
  ai_analysis JSONB,
  
  -- Configuration technique
  inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  supported_durations TEXT[] NOT NULL DEFAULT ARRAY['15s'],
  output_ratios TEXT[] NOT NULL DEFAULT ARRAY['9:16'],
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  voice_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  kse_engine JSONB,
  
  -- Statistiques
  usage_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  rating_average NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  -- État
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  generation_status TEXT DEFAULT 'pending',
  last_generated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_ai_templates_family ON public.ai_generated_templates(family);
CREATE INDEX IF NOT EXISTS idx_ai_templates_collection ON public.ai_generated_templates(collection);
CREATE INDEX IF NOT EXISTS idx_ai_templates_status ON public.ai_generated_templates(generation_status);
CREATE INDEX IF NOT EXISTS idx_ai_templates_active ON public.ai_generated_templates(is_active);

-- Trigger pour updated_at
CREATE TRIGGER update_ai_templates_updated_at
  BEFORE UPDATE ON public.ai_generated_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ai_generated_templates ENABLE ROW LEVEL SECURITY;

-- Policies RLS (lecture publique)
CREATE POLICY "Templates lisibles par tous" ON public.ai_generated_templates
  FOR SELECT USING (true);

-- Politique pour insert/update (authentifié)
CREATE POLICY "Templates modifiables par utilisateurs authentifiés" ON public.ai_generated_templates
  FOR ALL USING (auth.uid() IS NOT NULL);