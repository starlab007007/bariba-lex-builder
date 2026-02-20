
-- 1. Ajouter is_ai_profile à tamtam_profiles
ALTER TABLE public.tamtam_profiles ADD COLUMN IF NOT EXISTS is_ai_profile boolean NOT NULL DEFAULT false;

-- 2. Ajouter ai_generated à tamtam_posts  
ALTER TABLE public.tamtam_posts ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;

-- 3. Politique RLS: permettre l'insertion de posts IA (via service role)
CREATE POLICY "Service can insert AI posts"
ON public.tamtam_posts
FOR INSERT
WITH CHECK (ai_generated = true);

-- 4. Permettre la lecture publique des profils IA
CREATE POLICY "AI profiles are viewable by everyone"
ON public.tamtam_profiles
FOR SELECT
USING (is_ai_profile = true);
