-- ═══════════════════════════════════════════════════════════════════
-- Migration : 6 fonctionnalités de création de contenu IA validées le
-- 15/09/2026 (Echo Sɔ̃ɔ, Live Griot IA, Sagesse Battle, Aburu Fim IA,
-- Sasara IA, Handunia Wasa) — uniquement les tables réellement
-- nécessaires. Echo Sɔ̃ɔ, Live Griot IA et Aburu Fim IA réutilisent
-- entièrement tamtam_posts / tamtam_products déjà en production.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Sagesse Battle — défi proverbe quotidien (réponse texte réelle,
--    scoring local, fil communautaire des réponses)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.battle_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id TEXT NOT NULL,
  prompt_bariba TEXT NOT NULL,
  prompt_francais TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.battle_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read battle responses (fil communautaire)"
  ON public.battle_responses FOR SELECT
  USING (true);
CREATE POLICY "Users create their own battle responses"
  ON public.battle_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own battle responses"
  ON public.battle_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own battle responses"
  ON public.battle_responses FOR DELETE
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_battle_responses_challenge
  ON public.battle_responses (challenge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_responses_user
  ON public.battle_responses (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 2. Sasara IA — corpus vocal/texte communautaire, strictement opt-in
--    (consentement explicite requis avant toute écriture)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.corpus_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.corpus_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own corpus contributions"
  ON public.corpus_contributions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_corpus_contributions_user
  ON public.corpus_contributions (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 3. Handunia Wasa — écran vision uniquement (aucune capacité
--    fonctionnelle aujourd'hui) : un simple indicateur d'intérêt,
--    stocké dans les préférences déjà existantes (aucune table).
-- ─────────────────────────────────────────────────────────────────
-- (préférences.handunia_wasa_interested géré via tamtam_profiles.preferences JSONB,
--  colonne déjà créée par la migration du 15/09/2026 précédente)
