-- Créer le bucket pour les assets des templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-assets', 'template-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy pour accès public en lecture
CREATE POLICY "Template assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-assets');

-- Policy pour insertion via service role
CREATE POLICY "Service role can manage template assets"
ON storage.objects FOR ALL
USING (bucket_id = 'template-assets');

-- Ajouter les colonnes pour les visuels générés
ALTER TABLE public.ai_generated_templates
ADD COLUMN IF NOT EXISTS preview_image_url TEXT,
ADD COLUMN IF NOT EXISTS icon_url TEXT,
ADD COLUMN IF NOT EXISTS demo_video_url TEXT,
ADD COLUMN IF NOT EXISTS storyboard_frames JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS visual_generation_status TEXT DEFAULT 'pending';