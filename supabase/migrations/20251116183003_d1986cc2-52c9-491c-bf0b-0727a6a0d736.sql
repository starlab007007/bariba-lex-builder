-- Phase 1: Extension du schéma pour le dictionnaire Baatɔnum
-- Ajouter les colonnes pour les informations grammaticales complètes

-- Étendre la table dictionary_entries avec les nouvelles colonnes
ALTER TABLE dictionary_entries
ADD COLUMN IF NOT EXISTS nominal_class TEXT,
ADD COLUMN IF NOT EXISTS plural_form TEXT,
ADD COLUMN IF NOT EXISTS plural_class TEXT,
ADD COLUMN IF NOT EXISTS verb_root TEXT,
ADD COLUMN IF NOT EXISTS verb_radical TEXT,
ADD COLUMN IF NOT EXISTS accomplished_form TEXT,
ADD COLUMN IF NOT EXISTS negative_form TEXT,
ADD COLUMN IF NOT EXISTS verbal_group INTEGER,
ADD COLUMN IF NOT EXISTS verb_type TEXT,
ADD COLUMN IF NOT EXISTS benefactive_form TEXT,
ADD COLUMN IF NOT EXISTS derivational_suffixes TEXT[],
ADD COLUMN IF NOT EXISTS tone_pattern TEXT,
ADD COLUMN IF NOT EXISTS low_tone_optional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS adjective_forms JSONB,
ADD COLUMN IF NOT EXISTS cross_reference TEXT,
ADD COLUMN IF NOT EXISTS is_main_entry BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS grammatical_notes TEXT,
ADD COLUMN IF NOT EXISTS usage_context TEXT;

-- Créer une table pour les attributs des classes nominales
CREATE TABLE IF NOT EXISTS noun_class_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code TEXT NOT NULL UNIQUE,
  singular_subject TEXT,
  plural_subject TEXT,
  singular_determiner TEXT,
  plural_determiner TEXT,
  relative_pronoun TEXT,
  possessive_pattern TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insérer les données de base pour les classes nominales
INSERT INTO noun_class_attributes (class_code, singular_subject, plural_subject, singular_determiner, plural_determiner)
VALUES 
  ('b', 'be', 'bi', 'ba', 'bi'),
  ('g', 'ge', 'gi', 'ga', 'gi'),
  ('m', 'me', 'mi', 'ma', 'mi'),
  ('n', 'ne', 'ni', 'na', 'ni'),
  ('s', 'se', 'si', 'sa', 'si'),
  ('t', 'te', 'ni', 'ta', 'nu'),
  ('w', 'we', 'wi', 'wa', 'wi'),
  ('y', 'ye', 'yi', 'ya', 'yi')
ON CONFLICT (class_code) DO NOTHING;

-- Créer une table pour les patterns de conjugaison verbale
CREATE TABLE IF NOT EXISTS verbal_conjugations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verb_group INTEGER NOT NULL,
  person TEXT NOT NULL,
  tense_aspect TEXT NOT NULL,
  suffix TEXT,
  prefix TEXT,
  particle TEXT,
  example TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(verb_group, person, tense_aspect)
);

-- Ajouter des exemples de conjugaisons pour le groupe verbal 1
INSERT INTO verbal_conjugations (verb_group, person, tense_aspect, particle, example)
VALUES 
  (1, '1sg', 'future', 'u koo', 'u koo gere'),
  (1, '2sg', 'future', 'ga koo', 'ga koo gere'),
  (1, '3sg', 'future', 'u koo', 'u koo gere'),
  (1, '1pl', 'future', 'ta koo', 'ta koo gere'),
  (1, '2pl', 'future', 'ya koo', 'ya koo gere'),
  (1, '3pl', 'future', 'ba koo', 'ba koo gere'),
  (1, '1sg', 'accomplished', 'u', 'u gera'),
  (1, '1sg', 'inaccomplished', 'u', 'u gerumɔ')
ON CONFLICT (verb_group, person, tense_aspect) DO NOTHING;

-- Activer RLS sur les nouvelles tables
ALTER TABLE noun_class_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbal_conjugations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour noun_class_attributes
CREATE POLICY "Anyone can read noun class attributes"
ON noun_class_attributes
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage noun class attributes"
ON noun_class_attributes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Politiques RLS pour verbal_conjugations
CREATE POLICY "Anyone can read verbal conjugations"
ON verbal_conjugations
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage verbal conjugations"
ON verbal_conjugations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));