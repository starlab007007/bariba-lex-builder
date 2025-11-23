-- Phase 1: Ajouter les contraintes UNIQUE pour permettre les upsert()

-- Étape 1: Nettoyer les doublons existants dans training_phrases
-- Garder uniquement l'entrée la plus récente pour chaque combinaison (french_text, bariba_text)
DELETE FROM public.training_phrases
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY french_text, bariba_text 
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) as rn
    FROM public.training_phrases
  ) t
  WHERE t.rn > 1
);

-- Étape 2: Nettoyer les doublons existants dans dictionary_entries
-- Garder uniquement l'entrée la plus récente pour chaque mot
DELETE FROM public.dictionary_entries
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY word 
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) as rn
    FROM public.dictionary_entries
  ) t
  WHERE t.rn > 1
);

-- Étape 3: Nettoyer les doublons existants dans idiomatic_expressions
-- Garder uniquement l'entrée la plus récente pour chaque expression française
DELETE FROM public.idiomatic_expressions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY french_expression 
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) as rn
    FROM public.idiomatic_expressions
  ) t
  WHERE t.rn > 1
);

-- Étape 4: Ajouter les contraintes UNIQUE
-- Sur training_phrases: combinaison (french_text, bariba_text) doit être unique
ALTER TABLE public.training_phrases
ADD CONSTRAINT training_phrases_french_bariba_unique 
UNIQUE (french_text, bariba_text);

-- Sur dictionary_entries: le mot Bariba doit être unique
ALTER TABLE public.dictionary_entries
ADD CONSTRAINT dictionary_entries_word_unique 
UNIQUE (word);

-- Sur idiomatic_expressions: l'expression française doit être unique
ALTER TABLE public.idiomatic_expressions
ADD CONSTRAINT idiomatic_expressions_french_unique 
UNIQUE (french_expression);

-- Créer des index pour améliorer les performances des upsert
CREATE INDEX IF NOT EXISTS idx_training_phrases_lookup 
ON public.training_phrases(french_text, bariba_text);

CREATE INDEX IF NOT EXISTS idx_dictionary_entries_word 
ON public.dictionary_entries(word);

CREATE INDEX IF NOT EXISTS idx_idiomatic_expressions_french 
ON public.idiomatic_expressions(french_expression);