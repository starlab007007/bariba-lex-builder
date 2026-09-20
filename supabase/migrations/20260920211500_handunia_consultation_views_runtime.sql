-- Handunia Wasa — consultation étendue (écrans 2 à 8).
-- Structures additives, sans suppression des données existantes.

ALTER TABLE public.handunia_fragments
  ADD COLUMN IF NOT EXISTS period_year INTEGER,
  ADD COLUMN IF NOT EXISTS witness_gender TEXT,
  ADD COLUMN IF NOT EXISTS theme_key TEXT,
  ADD COLUMN IF NOT EXISTS source_fragment_id UUID
    REFERENCES public.handunia_fragments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transcript_reviewed_by_guardian BOOLEAN
    NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'handunia_fragments_witness_gender_check'
  ) THEN
    ALTER TABLE public.handunia_fragments
      ADD CONSTRAINT handunia_fragments_witness_gender_check
      CHECK (
        witness_gender IS NULL
        OR witness_gender IN ('female', 'male', 'mixed', 'unspecified')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_handunia_fragments_lieu_period
  ON public.handunia_fragments (lieu_id, period_year, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handunia_fragments_theme
  ON public.handunia_fragments (lieu_id, theme_key);
CREATE INDEX IF NOT EXISTS idx_handunia_fragments_source
  ON public.handunia_fragments (source_fragment_id, created_at);

CREATE TABLE IF NOT EXISTS public.handunia_memory_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragment_id UUID NOT NULL REFERENCES public.handunia_fragments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  path_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.handunia_memory_paths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Handunia paths readable by owner" ON public.handunia_memory_paths;
CREATE POLICY "Handunia paths readable by owner"
  ON public.handunia_memory_paths FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Handunia users create own paths" ON public.handunia_memory_paths;
CREATE POLICY "Handunia users create own paths"
  ON public.handunia_memory_paths FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Handunia users delete own paths" ON public.handunia_memory_paths;
CREATE POLICY "Handunia users delete own paths"
  ON public.handunia_memory_paths FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.handunia_guardian_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  divergence_id UUID NOT NULL REFERENCES public.handunia_divergences(id) ON DELETE CASCADE,
  guardian_user_id UUID NOT NULL,
  opinion TEXT NOT NULL CHECK (char_length(opinion) BETWEEN 1 AND 5000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.handunia_guardian_opinions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Handunia guardian opinions readable" ON public.handunia_guardian_opinions;
CREATE POLICY "Handunia guardian opinions readable"
  ON public.handunia_guardian_opinions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.handunia_guardians (
  user_id UUID PRIMARY KEY,
  designated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  designated_by_community BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.handunia_guardians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Handunia guardians readable" ON public.handunia_guardians;
CREATE POLICY "Handunia guardians readable"
  ON public.handunia_guardians FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.handunia_village_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_type TEXT NOT NULL CHECK (return_type IN ('booklet', 'radio', 'wall_map')),
  title TEXT NOT NULL,
  resource_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.handunia_village_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Handunia village returns readable" ON public.handunia_village_returns;
CREATE POLICY "Handunia village returns readable"
  ON public.handunia_village_returns FOR SELECT USING (active = true);

GRANT SELECT, INSERT, DELETE ON public.handunia_memory_paths TO authenticated;
GRANT SELECT ON public.handunia_guardian_opinions TO anon, authenticated;
GRANT SELECT ON public.handunia_guardians TO anon, authenticated;
GRANT SELECT ON public.handunia_village_returns TO anon, authenticated;
