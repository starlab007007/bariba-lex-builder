-- ═══════════════════════════════════════════════════════════════════
-- Migration : Sagesse Battle devient un vrai jeu à trou noté par l'IA
-- (16/09/2026). Le défi reste le même proverbe quotidien (banque
-- embarquée, disponible hors-ligne), mais :
--   • Chaque réponse peut désormais être votée par la communauté
--     ("j'aime" réel, comme Handunia Wasa) — c'est ce qui manquait
--     pour que la « chaîne communautaire » soit réellement sociale.
--   • Le nombre de participants et la « meilleure réponse actuelle »
--     affichés dans l'app viennent d'une vraie requête sur les
--     réponses déjà déposées pour le défi du jour — jamais un chiffre
--     fabriqué.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.battle_response_votes (
  response_id UUID NOT NULL REFERENCES public.battle_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (response_id, user_id)
);

ALTER TABLE public.battle_response_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read battle response votes"
  ON public.battle_response_votes FOR SELECT
  USING (true);

CREATE POLICY "Users vote as themselves"
  ON public.battle_response_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove their own battle vote"
  ON public.battle_response_votes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_battle_response_votes_response
  ON public.battle_response_votes (response_id);
