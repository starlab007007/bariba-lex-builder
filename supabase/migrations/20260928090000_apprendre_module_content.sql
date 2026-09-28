-- =====================================================================
-- FITILA Apprendre — contenu pédagogique centralisé (parité web ↔ Flutter)
--   * une source unique pour le contenu jusqu'ici embarqué séparément
--     dans les assets Flutter (apprendre_v2.json, scenes_v2.json) et
--     dans le bundle web (src/data/*.json, gardé comme secours)
--   * le web lit ce contenu via la table (lecture publique) ; Flutter
--     garde sa copie embarquée comme secours hors-ligne
--   * écriture : fonction admin apprendre_import_content() (panneau
--     ApContentImportPanel.tsx), workflow
--     .github/workflows/apprendre-content-supabase.yml, ou script
--     tools/apprendre-content-import (clé service_role)
--   * hash, comptage et journal d'audit sont calculés PAR LA BASE
--     (triggers), donc identiques quel que soit le chemin d'écriture
--
-- Idempotente : peut être rejouée sans erreur. Ne dépend que de
-- public.has_role / public.app_role (présents sur tous les projets
-- FITILA) ; le hash utilise sha256() natif de Postgres (pas de pgcrypto).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apprendre_module_content (
  id text PRIMARY KEY CHECK (id IN ('core', 'scenes')),
  content jsonb NOT NULL,
  content_version text NOT NULL,
  content_hash text NOT NULL DEFAULT '',
  item_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.apprendre_content_audit (
  id bigserial PRIMARY KEY,
  content_id text NOT NULL,
  content_version text NOT NULL,
  content_hash text NOT NULL,
  item_count int NOT NULL,
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apprendre_module_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_content_audit ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Triggers : hash + comptage (avant écriture), journal (après)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apprendre_module_content_fill()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.content_hash := encode(pg_catalog.sha256(convert_to(NEW.content::text, 'UTF8')), 'hex');
  NEW.item_count := CASE
    WHEN NEW.id = 'core' THEN COALESCE(jsonb_array_length(NEW.content -> 'cards'), 0)
    ELSE COALESCE(jsonb_array_length(NEW.content -> 'scenes'), 0)
  END;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apprendre_module_content_log()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.apprendre_content_audit (content_id, content_version, content_hash, item_count, actor)
  VALUES (NEW.id, NEW.content_version, NEW.content_hash, NEW.item_count, NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apprendre_module_content_fill ON public.apprendre_module_content;
CREATE TRIGGER apprendre_module_content_fill
  BEFORE INSERT OR UPDATE ON public.apprendre_module_content
  FOR EACH ROW EXECUTE FUNCTION public.apprendre_module_content_fill();

DROP TRIGGER IF EXISTS apprendre_module_content_log ON public.apprendre_module_content;
CREATE TRIGGER apprendre_module_content_log
  AFTER INSERT OR UPDATE ON public.apprendre_module_content
  FOR EACH ROW EXECUTE FUNCTION public.apprendre_module_content_log();

-- ---------------------------------------------------------------------
-- 3. Droits de lecture
-- ---------------------------------------------------------------------
-- Lecture publique du contenu : quiconque ouvre l'appli web doit pouvoir
-- charger les cartes/scènes, comme Flutter lit son asset embarqué.
DROP POLICY IF EXISTS "Tout le monde lit le contenu Apprendre" ON public.apprendre_module_content;
CREATE POLICY "Tout le monde lit le contenu Apprendre"
  ON public.apprendre_module_content FOR SELECT
  USING (true);
GRANT SELECT ON public.apprendre_module_content TO anon, authenticated;

DROP POLICY IF EXISTS "Admin lit le journal de contenu" ON public.apprendre_content_audit;
CREATE POLICY "Admin lit le journal de contenu"
  ON public.apprendre_content_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT ON public.apprendre_content_audit TO authenticated;

-- Aucune policy INSERT/UPDATE/DELETE : les écritures applicatives passent
-- par la fonction SECURITY DEFINER ci-dessous (contrôle admin).

-- ---------------------------------------------------------------------
-- 4. Import (admin uniquement) — remplace intégralement 'core' ou
--    'scenes' et retourne un résumé de contrôle.
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
  _row public.apprendre_module_content;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.';
  END IF;
  IF _id NOT IN ('core', 'scenes') THEN
    RAISE EXCEPTION 'id de contenu inconnu : %', _id;
  END IF;

  INSERT INTO public.apprendre_module_content (id, content, content_version)
  VALUES (_id, _content, _version)
  ON CONFLICT (id) DO UPDATE SET
    content = excluded.content,
    content_version = excluded.content_version
  RETURNING * INTO _row;

  RETURN jsonb_build_object('id', _row.id, 'version', _row.content_version,
                            'hash', _row.content_hash, 'item_count', _row.item_count);
END;
$$;

REVOKE ALL ON FUNCTION public.apprendre_import_content(text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apprendre_import_content(text, jsonb, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Vue publique légère (métadonnées seules), en security_invoker :
--    elle applique la policy de lecture de la table.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.apprendre_module_content_status
  WITH (security_invoker = true) AS
  SELECT id, content_version, content_hash, item_count, updated_at
  FROM public.apprendre_module_content;
GRANT SELECT ON public.apprendre_module_content_status TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
