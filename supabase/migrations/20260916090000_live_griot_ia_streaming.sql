-- ═══════════════════════════════════════════════════════════════════
-- Migration : infrastructure de diffusion en direct pour Live Griot IA
-- (16/09/2026).
--
-- Architecture retenue : maillage WebRTC pair-à-pair (flutter_webrtc)
-- avec signalisation portée par de simples lignes Postgres
-- (tamtam_live_signals), livrées en temps réel via Supabase Realtime
-- (.stream()) — aucun service tiers, aucune clé API, aucun serveur
-- média à provisionner. Chaque ligne de signal est adressée à un
-- destinataire précis (to_user) et peut être purgée périodiquement ;
-- la découverte des directs actifs, les spectateurs et les messages
-- de chat sont eux conservés normalement.
--
-- Réutilise la table tamtam_lives déjà créée pour le web (migration
-- du 18/12/2025) au lieu d'en dupliquer une nouvelle : on lui ajoute
-- les colonnes nécessaires à la signalisation WebRTC et au module
-- Griot IA. Ses policies RLS existantes ("Lives are viewable by
-- everyone", "Users can manage their own lives") couvrent déjà la
-- lecture publique et l'écriture par le host.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.tamtam_lives
  ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE public.tamtam_lives
  ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tamtam_lives
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'Bariba + Français';
ALTER TABLE public.tamtam_lives
  ADD COLUMN IF NOT EXISTS source_module TEXT NOT NULL DEFAULT 'griot_ia';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tamtam_lives_room_name
  ON public.tamtam_lives (room_name)
  WHERE room_name IS NOT NULL;

-- Compteur de spectateurs mis à jour de façon atomique (évite les
-- pertes d'incréments/décréments concurrents entre plusieurs clients
-- qui rejoignent/quittent en même temps).
CREATE OR REPLACE FUNCTION public.adjust_live_viewer_count(
  p_live_id UUID,
  p_delta INTEGER
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tamtam_lives
  SET viewer_count = GREATEST(0, COALESCE(viewer_count, 0) + p_delta)
  WHERE id = p_live_id;
$$;

-- Chat texte en direct, propre au module Griot IA (le web utilise déjà
-- tamtam_live_reactions pour des réactions emoji ; ceci ajoute un
-- vrai fil de messages texte).
CREATE TABLE IF NOT EXISTS public.tamtam_live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.tamtam_lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.tamtam_live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live chat is viewable by everyone"
  ON public.tamtam_live_chat_messages FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users send live chat messages"
  ON public.tamtam_live_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_live_chat_live
  ON public.tamtam_live_chat_messages (live_id, created_at ASC);

-- Signalisation WebRTC (offres/réponses SDP, candidats ICE) portée
-- par de simples lignes insérées/lues en Realtime plutôt que par
-- l'API bas niveau "broadcast" — chaque pair ne voit que les signaux
-- qui lui sont destinés (colonne to_user), et l'auteur ne peut écrire
-- qu'en son propre nom.
CREATE TABLE IF NOT EXISTS public.tamtam_live_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.tamtam_lives(id) ON DELETE CASCADE,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'bye')),
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.tamtam_live_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read signals addressed to or sent by them"
  ON public.tamtam_live_signals FOR SELECT
  USING (auth.uid() = to_user OR auth.uid() = from_user);
CREATE POLICY "Users send signals as themselves"
  ON public.tamtam_live_signals FOR INSERT
  WITH CHECK (auth.uid() = from_user);
CREATE INDEX IF NOT EXISTS idx_tamtam_live_signals_recipient
  ON public.tamtam_live_signals (live_id, to_user, created_at ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tamtam_live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.tamtam_live_chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tamtam_live_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.tamtam_live_signals;
  END IF;
END;
$$;
-- Note : tamtam_lives et tamtam_live_viewers sont déjà membres de la
-- publication supabase_realtime depuis la migration du 18/12/2025 —
-- on ne les rajoute pas ici (ALTER PUBLICATION ... ADD TABLE échoue
-- si la table est déjà membre).
