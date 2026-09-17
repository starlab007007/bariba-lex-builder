-- ═══════════════════════════════════════════════════════════════════
-- Migration : Handunia Wasa devient dynamique et social (16/09/2026).
-- Ne se limite plus aux 7 lieux éditoriaux de départ : n'importe quel
-- utilisateur connecté peut tisser un nouveau lieu. Chaque souvenir
-- porte désormais son auteur réel et peut être aimé par la communauté,
-- pour un fonctionnement réseau social à part entière.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Lieux vivants — ouverts à la création communautaire.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.handunia_lieux
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Les 7 lieux seedés initialement n'ont pas d'auteur identifiable :
-- created_by reste NULL pour eux, c'est attendu et normal.

-- Un seul lieu par nom (insensible à la casse) pour éviter les doublons
-- accidentels ; l'app vérifie déjà côté client avant de tenter la
-- création et propose d'ouvrir le lieu existant le cas échéant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_handunia_lieux_name_unique
  ON public.handunia_lieux (lower(name));

DROP POLICY IF EXISTS "Anyone can read handunia lieux" ON public.handunia_lieux;
CREATE POLICY "Anyone can read handunia lieux"
  ON public.handunia_lieux FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users create new lieux"
  ON public.handunia_lieux FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_handunia_lieux_created_at
  ON public.handunia_lieux (created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 2. Souvenirs aimés par la communauté — brique sociale de base.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.handunia_fragment_likes (
  fragment_id UUID NOT NULL REFERENCES public.handunia_fragments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (fragment_id, user_id)
);

ALTER TABLE public.handunia_fragment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read handunia fragment likes"
  ON public.handunia_fragment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users like as themselves"
  ON public.handunia_fragment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove their own like"
  ON public.handunia_fragment_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_handunia_fragment_likes_fragment
  ON public.handunia_fragment_likes (fragment_id);
