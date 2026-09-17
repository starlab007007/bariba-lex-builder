-- ═══════════════════════════════════════════════════════════════════
-- Migration : Handunia Wasa — « le monde vivant », socle technique réel
-- (16/09/2026). Remplace l'ancien écran vision (non fonctionnel) par
-- un module réellement branché, tout en conservant EXACTEMENT le
-- parcours en 4 écrans validé (portail → carte des lieux vivants →
-- présence dans un lieu généré → tissage d'un souvenir) :
--
--   • Les « lieux vivants » sont une liste éditoriale fixe (table
--     handunia_lieux), écrite une fois pour poser le décor du monde.
--   • Leur « densité » et la scène reconstituée pour chacun reflètent
--     désormais les souvenirs RÉELLEMENT tissés par la communauté
--     (table handunia_fragments) — jamais un chiffre ou un texte
--     fabriqué. Sans souvenir, la densité est à 0 et la scène le dit
--     honnêtement plutôt que d'inventer un contenu.
--   • « Tisser un souvenir » n'est volontairement PAS une publication
--     dans le fil (le geste est cadré comme un tissage collectif, pas
--     une publication individuelle) : le souvenir rejoint uniquement
--     la mémoire du lieu choisi.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Lieux vivants — décor fixe du monde, en lecture seule pour tous.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.handunia_lieux (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📍',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.handunia_lieux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read handunia lieux"
  ON public.handunia_lieux FOR SELECT
  USING (true);

INSERT INTO public.handunia_lieux (id, name, icon, description, sort_order) VALUES
  ('marche-nikki', 'Marché de Nikki', '🏮',
   'Le grand marché où l''on vient acheter, vendre, et surtout se raconter les nouvelles du pays.', 1),
  ('veillee-contes', 'Veillée de contes', '🔥',
   'Le cercle du soir où les anciens racontent, autour du feu, les récits qui se transmettent depuis toujours.', 2),
  ('intronisation', 'Intronisation', '👑',
   'Le jour solennel où un chef reçoit ses insignes devant toute la communauté rassemblée.', 3),
  ('recoltes', 'Récoltes', '🌾',
   'Le temps des champs, quand tout le village se retrouve pour rentrer la moisson ensemble.', 4),
  ('fete-gaani', 'Fête du Gaani', '🥁',
   'La grande fête annuelle, tambours et cavaliers en tête, qui rassemble familles et villages.', 5),
  ('puits-village', 'Puits du village', '💧',
   'Le point d''eau où l''on se croise chaque matin, et où circulent autant de seaux que d''histoires.', 6),
  ('chemin-caravanes', 'Chemin des caravanes', '🐫',
   'La vieille route empruntée par les marchands, où les voyageurs échangent nouvelles et récits de route.', 7)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 2. Souvenirs tissés par la communauté — la seule source de vérité
--    pour la densité des lieux et pour la mémoire collective.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.handunia_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lieu_id TEXT NOT NULL REFERENCES public.handunia_lieux(id),
  text TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.handunia_fragments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read handunia fragments (mémoire collective)"
  ON public.handunia_fragments FOR SELECT
  USING (true);

CREATE POLICY "Users weave their own fragments"
  ON public.handunia_fragments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own fragments"
  ON public.handunia_fragments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own fragments"
  ON public.handunia_fragments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_handunia_fragments_lieu
  ON public.handunia_fragments (lieu_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_handunia_fragments_user
  ON public.handunia_fragments (user_id, created_at DESC);
