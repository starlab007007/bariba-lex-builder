-- Handunia Wasa — consultation et protocole de mémoire.
-- Le fil ne lit plus les métriques de popularité.

ALTER TABLE public.handunia_lieux
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.handunia_fragments
  ADD COLUMN IF NOT EXISTS transcript_text TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS audio_codec TEXT NOT NULL DEFAULT 'opus',
  ADD COLUMN IF NOT EXISTS audio_bitrate_kbps INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS period_label TEXT,
  ADD COLUMN IF NOT EXISTS scope_level TEXT NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS seal_hash TEXT,
  ADD COLUMN IF NOT EXISTS sealed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lineage_key TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lacuna_filled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS synchronized_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'handunia_fragments_scope_level_check'
  ) THEN
    ALTER TABLE public.handunia_fragments
      ADD CONSTRAINT handunia_fragments_scope_level_check
      CHECK (scope_level IN ('elders', 'lineage', 'community', 'all'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_handunia_fragments_scope
  ON public.handunia_fragments (scope_level, lineage_key);
CREATE INDEX IF NOT EXISTS idx_handunia_fragments_memory_order
  ON public.handunia_fragments (lacuna_filled DESC, created_at DESC);

DROP POLICY IF EXISTS "Anyone can read handunia fragments (mémoire collective)"
  ON public.handunia_fragments;
DROP POLICY IF EXISTS "handunia_fragments_read"
  ON public.handunia_fragments;
DROP POLICY IF EXISTS "Handunia fragments visible by scope"
  ON public.handunia_fragments;

CREATE POLICY "Handunia fragments visible by scope"
  ON public.handunia_fragments
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      withdrawn_at IS NULL
      AND (
        scope_level IN ('community', 'all')
        OR (
          scope_level = 'lineage'
          AND lineage_key IS NOT NULL
          AND lineage_key = auth.jwt() -> 'user_metadata' ->> 'lineage_key'
        )
        OR (
          scope_level = 'elders'
          AND COALESCE(
            auth.jwt() -> 'user_metadata' ->> 'handunia_guardian',
            'false'
          ) = 'true'
        )
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.handunia_corroborations (
  fragment_id UUID NOT NULL
    REFERENCES public.handunia_fragments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (fragment_id, user_id)
);
ALTER TABLE public.handunia_corroborations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Handunia corroborations readable"
  ON public.handunia_corroborations;
CREATE POLICY "Handunia corroborations readable"
  ON public.handunia_corroborations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.handunia_fragments f
      WHERE f.id = fragment_id
    )
  );

DROP POLICY IF EXISTS "Handunia users corroborate as themselves"
  ON public.handunia_corroborations;
CREATE POLICY "Handunia users corroborate as themselves"
  ON public.handunia_corroborations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Handunia users remove own corroboration"
  ON public.handunia_corroborations;
CREATE POLICY "Handunia users remove own corroboration"
  ON public.handunia_corroborations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_handunia_corroborations_fragment_fresh
  ON public.handunia_corroborations (fragment_id, created_at DESC);

GRANT SELECT ON public.handunia_corroborations TO anon, authenticated;
GRANT INSERT, DELETE ON public.handunia_corroborations TO authenticated;

CREATE TABLE IF NOT EXISTS public.handunia_divergences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lieu_id TEXT NOT NULL REFERENCES public.handunia_lieux(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  version_a_id UUID REFERENCES public.handunia_fragments(id) ON DELETE SET NULL,
  version_b_id UUID REFERENCES public.handunia_fragments(id) ON DELETE SET NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'closed'))
);
ALTER TABLE public.handunia_divergences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Handunia divergences readable"
  ON public.handunia_divergences;
CREATE POLICY "Handunia divergences readable"
  ON public.handunia_divergences
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_handunia_divergences_open
  ON public.handunia_divergences (status, detected_at DESC);

GRANT SELECT ON public.handunia_divergences TO anon, authenticated;
