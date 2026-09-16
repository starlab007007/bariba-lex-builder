-- ═══════════════════════════════════════════════════════════════════
-- Migration : interactions sociales réelles du fil immersif — suivre,
-- republier, sauvegarder, commenter (16/09/2026).
--
-- Réutilise les tables tamtam_follows, tamtam_shares, tamtam_bookmarks
-- et tamtam_comments déjà créées pour le web et jusqu'ici inutilisées
-- côté Flutter, plutôt que d'en dupliquer de nouvelles. Leurs policies
-- RLS existantes couvrent déjà la lecture publique et l'écriture par
-- l'utilisateur authentifié concerné.
-- ═══════════════════════════════════════════════════════════════════

-- tamtam_comments a été conçue pour des commentaires vocaux uniquement
-- (audio_url NOT NULL). Le fil immersif ajoute un vrai commentaire
-- texte : on assouplit la contrainte et on ajoute la colonne dédiée,
-- sans rien retirer à l'existant.
ALTER TABLE public.tamtam_comments
  ALTER COLUMN audio_url DROP NOT NULL;
ALTER TABLE public.tamtam_comments
  ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Compteurs likes_count/comments_count/shares_count : tamtam_posts et
-- videos possèdent tous deux ces colonnes ; un post peut provenir de
-- l'une ou l'autre table selon la fonctionnalité qui l'a créé. Chaque
-- fonction met donc à jour les deux (l'UPDATE ciblant la mauvaise
-- table affecte simplement 0 ligne, sans erreur).
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tamtam_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
    UPDATE videos SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tamtam_posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
    UPDATE videos SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_post_comments_count ON public.tamtam_comments;
CREATE TRIGGER trg_update_post_comments_count
AFTER INSERT OR DELETE ON public.tamtam_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE OR REPLACE FUNCTION public.update_post_shares_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tamtam_posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = NEW.post_id;
    UPDATE videos SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tamtam_posts SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0) WHERE id = OLD.post_id;
    UPDATE videos SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_post_shares_count ON public.tamtam_shares;
CREATE TRIGGER trg_update_post_shares_count
AFTER INSERT OR DELETE ON public.tamtam_shares
FOR EACH ROW EXECUTE FUNCTION public.update_post_shares_count();

-- Le fil immersif affiche les commentaires en direct pendant qu'on les
-- lit (comme le chat du direct Live Griot IA) : tamtam_comments doit
-- donc être diffusée par Realtime (elle ne l'était pas encore).
ALTER PUBLICATION supabase_realtime ADD TABLE public.tamtam_comments;
-- Note : tamtam_follows, tamtam_bookmarks et tamtam_shares ne sont pas
-- ajoutées ici : tamtam_follows est déjà membre de la publication
-- depuis la migration du 13/12/2025, et les favoris/republications
-- sont des actions personnelles qui n'ont pas besoin d'être diffusées
-- en direct aux autres utilisateurs.
