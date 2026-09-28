-- =====================================================================
-- FITILA Apprendre — contenu pédagogique centralisé (parité web ↔ Flutter)
--   * une source unique pour le contenu jusqu'ici embarqué séparément
--     dans les assets Flutter (apprendre_v2.json, scenes_v2.json) et
--     dans les fichiers TypeScript web (learningExercises.ts, etc.)
--   * le web lit ce contenu via la vue publique ; Flutter garde sa copie
--     embarquée comme secours hors-ligne (aucun changement Flutter ici)
--   * mise à jour uniquement par un administrateur, via la fonction
--     d'import ci-dessous (répliquée depuis tool/apprendre_content côté
--     web, ou depuis l'admin — voir ApprendreContentAdmin.tsx)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table de contenu (deux lignes : 'core' = apprendre_v2.json,
--    'scenes' = scenes_v2.json). Le contenu est stocké tel quel, au
--    même format JSON que les fichiers Flutter, pour que la logique
--    TypeScript qui le consomme puisse rester un portage fidèle des
--    algorithmes Dart plutôt qu'un modèle relationnel réinterprété.
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_module_content (
  id text PRIMARY KEY CHECK (id IN ('core', 'scenes')),
  content jsonb NOT NULL,
  content_version text NOT NULL,
  content_hash text NOT NULL,
  item_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.apprendre_content_audit (
  id bigserial PRIMARY KEY,
  content_id text NOT NULL,
  content_version text NOT NULL,
  content_hash text NOT NULL,
  item_count int NOT NULL,
  actor uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apprendre_module_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_content_audit ENABLE ROW LEVEL SECURITY;

-- Lecture publique du contenu final : quiconque ouvre l'appli web doit
-- pouvoir charger les cartes/scènes, comme Flutter les lit de son asset
-- embarqué sans authentification.
CREATE POLICY "Tout le monde lit le contenu Apprendre"
  ON public.apprendre_module_content FOR SELECT
  USING (true);

-- Grant explicite (les rôles anon/authenticated ont normalement un accès
-- SELECT par défaut sur les tables public de Supabase, mais on le rend
-- explicite ici pour ne pas dépendre d'un réglage de projet implicite).
GRANT SELECT ON public.apprendre_module_content TO anon, authenticated;

CREATE POLICY "Admin lit le journal de contenu"
  ON public.apprendre_content_audit FOR SELECT
  USING (public.apprendre_is_admin(auth.uid()));

-- Aucune policy INSERT/UPDATE : toute écriture passe par la fonction
-- SECURITY DEFINER ci-dessous (contrôle admin + calcul du hash/compte).

-- ---------------------------------------------------------------------
-- 2. Import (admin uniquement) — remplace intégralement le contenu
--    'core' ou 'scenes', journalise, et retourne un résumé de contrôle
--    (nombre d'éléments, hash) pour que l'appelant puisse vérifier
--    l'import contre le fichier JSON source avant de l'annoncer réussi.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apprendre_import_content(
  _id text,
  _content jsonb,
  _version text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
  _count int;
BEGIN
  IF NOT public.apprendre_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.';
  END IF;
  IF _id NOT IN ('core', 'scenes') THEN
    RAISE EXCEPTION 'id de contenu inconnu : %', _id;
  END IF;

  _hash := encode(digest(_content::text, 'sha256'), 'hex');
  _count := CASE
    WHEN _id = 'core' THEN COALESCE(jsonb_array_length(_content -> 'cards'), 0)
    ELSE COALESCE(jsonb_array_length(_content -> 'scenes'), 0)
  END;

  INSERT INTO public.apprendre_module_content (id, content, content_version, content_hash, item_count, updated_at, updated_by)
  VALUES (_id, _content, _version, _hash, _count, now(), auth.uid())
  ON CONFLICT (id) DO UPDATE SET
    content = excluded.content,
    content_version = excluded.content_version,
    content_hash = excluded.content_hash,
    item_count = excluded.item_count,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

  INSERT INTO public.apprendre_content_audit (content_id, content_version, content_hash, item_count, actor)
  VALUES (_id, _version, _hash, _count, auth.uid());

  RETURN jsonb_build_object('id', _id, 'version', _version, 'hash', _hash, 'item_count', _count);
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Vue publique légère (métadonnées seules, sans le contenu complet)
--    pour que l'admin puisse afficher l'état sans télécharger tout le
--    JSON — le contenu complet reste accessible via la table elle-même
--    (policy SELECT publique ci-dessus) pour l'appli web.
-- ---------------------------------------------------------------------
CREATE VIEW public.apprendre_module_content_status AS
  SELECT id, content_version, content_hash, item_count, updated_at
  FROM public.apprendre_module_content;

GRANT SELECT ON public.apprendre_module_content_status TO anon, authenticated;
