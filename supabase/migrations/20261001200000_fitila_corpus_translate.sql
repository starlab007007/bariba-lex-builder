-- =====================================================================
-- FITILA — traduction de secours à partir du corpus (sans IA)
--
-- Depuis fin septembre 2026, aucun moteur de traduction automatique ne
-- répond en production : l'espace Hugging Face ByT5 n'existe plus sous son
-- adresse (404) et MISTRAL_API_KEY n'est pas configuré pour ai-translate.
-- Le traducteur web et Flutter échouait alors avec « function error ».
--
-- fitila_corpus_translate() traduit avec les données bilingues déjà en
-- base, du plus fiable au moins fiable :
--   1. phrase identique (expressions idiomatiques, mémoire de traduction,
--      phrases d'entraînement, corpus de phrases)  → corpus-exact
--   2. un ou deux mots : sens court du dictionnaire  → dictionary
--   3. phrase très proche (trigrammes ≥ 0,6, longueur comparable)  → corpus-similar
--   4. glose mot à mot, si ≥ 50 % des mots sont connus  → dictionary-gloss
--      (approximative : signalée comme telle, confiance basse)
-- Lecture seule, appelable par anon/authenticated (comme le traducteur).
-- Utilisée par les fonctions edge byt5-bariba-translate et ai-translate
-- quand leur moteur IA est indisponible.
-- =====================================================================

-- Forme de comparaison : minuscules, sans diacritiques ni ponctuation,
-- espaces normalisés (ɛ, ɔ, ŋ… sont conservés).
CREATE OR REPLACE FUNCTION public.fitila_norm(t text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(
             regexp_replace(lower(normalize(coalesce(t, ''), NFD)), '[̀-ͯ]', '', 'g'),
             '[[:punct:]«»“”‘’…]+', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

-- Premier sens d'une définition du dictionnaire (stockée en liste JSON).
CREATE OR REPLACE FUNCTION public.fitila_first_sense(def text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $$
BEGIN
  IF def IS NULL THEN RETURN NULL; END IF;
  IF left(btrim(def), 1) = '[' THEN
    RETURN btrim(regexp_replace((def::jsonb) ->> 0, '^\s*\d+\)\s*', ''));
  END IF;
  RETURN btrim(regexp_replace(split_part(def, ';', 1), '^\s*\d+\)\s*', ''));
EXCEPTION WHEN others THEN
  RETURN btrim(regexp_replace(split_part(def, ';', 1), '^\s*\d+\)\s*', ''));
END;
$$;

-- Index de recherche (égalité et trigrammes) sur les formes normalisées.
CREATE INDEX IF NOT EXISTS training_phrases_fr_norm_trgm ON public.training_phrases USING gin (public.fitila_norm(french_text) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS training_phrases_ba_norm_trgm ON public.training_phrases USING gin (public.fitila_norm(bariba_text) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS bariba_corpus_fr_norm_trgm ON public.bariba_corpus_phrases USING gin (public.fitila_norm(text_french) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS bariba_corpus_ba_norm_trgm ON public.bariba_corpus_phrases USING gin (public.fitila_norm(text_bariba) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS dictionary_entries_word_norm ON public.dictionary_entries (public.fitila_norm(word));
CREATE INDEX IF NOT EXISTS dictionary_entries_sense_norm ON public.dictionary_entries (public.fitila_norm(public.fitila_first_sense(definition)));

-- Glose d'un mot isolé : sens court du dictionnaire (fr→ba : mot bariba dont
-- un sens vaut ce mot français ; ba→fr : premier sens court du mot bariba).
CREATE OR REPLACE FUNCTION public.fitila_dictionary_word(p_token text, p_fr_to_ba boolean)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT x FROM (
    SELECT word AS x, 1 AS rank, coalesce(is_main_entry, false) AS main, coalesce(quality_score, 0) AS q, length(word) AS len
      FROM dictionary_entries
     WHERE p_fr_to_ba AND public.fitila_norm(public.fitila_first_sense(definition)) = p_token
    UNION ALL
    SELECT word, 2, coalesce(is_main_entry, false), coalesce(quality_score, 0), length(word)
      FROM dictionary_entries d
     WHERE p_fr_to_ba AND left(btrim(definition), 1) = '[' AND pg_input_is_valid(definition, 'jsonb')
       AND EXISTS (SELECT 1
                     FROM jsonb_array_elements_text(
                            CASE WHEN pg_input_is_valid(d.definition, 'jsonb') AND jsonb_typeof(d.definition::jsonb) = 'array'
                                 THEN d.definition::jsonb ELSE '[]'::jsonb END) e,
                          regexp_split_to_table(e, '[;,]') piece
                    WHERE length(e) <= 60
                      AND public.fitila_norm(regexp_replace(piece, '^\s*\d+\)\s*', '')) = p_token)
    UNION ALL
    SELECT public.fitila_first_sense(definition), 1, coalesce(is_main_entry, false), coalesce(quality_score, 0),
           length(public.fitila_first_sense(definition))
      FROM dictionary_entries
     WHERE NOT p_fr_to_ba AND public.fitila_norm(word) = p_token
       AND length(public.fitila_first_sense(definition)) BETWEEN 1 AND 40
  ) c
  ORDER BY rank, main DESC, q DESC, len
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.fitila_corpus_translate(p_text text, p_source text, p_target text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  fr_to_ba boolean := coalesce(p_source, 'french') = 'french' AND coalesce(p_target, 'bariba') = 'bariba';
  q text := public.fitila_norm(left(coalesce(p_text, ''), 500));
  q_words int;
  hit record;
  tok text;
  tr text;
  out_words text[] := '{}';
  found int := 0;
  total int := 0;
  -- Mots grammaticaux français sans équivalent mot à mot en bariba.
  fr_stop constant text[] := ARRAY['le','la','les','l','un','une','des','de','du','d','et','au','aux','a','en','y'];
BEGIN
  IF q = '' THEN RETURN NULL; END IF;
  q_words := array_length(string_to_array(q, ' '), 1);

  -- 1. Phrase ou expression identique, par ordre de fiabilité des sources.
  FOR hit IN
    SELECT s, t FROM (
      SELECT 1 AS prio, CASE WHEN fr_to_ba THEN french_expression ELSE bariba_expression END AS s,
                        CASE WHEN fr_to_ba THEN bariba_expression ELSE french_expression END AS t
        FROM idiomatic_expressions
      UNION ALL
      SELECT 2, source_text, target_text FROM translation_memory
       WHERE source_language = CASE WHEN fr_to_ba THEN 'french' ELSE 'bariba' END
         AND target_language = CASE WHEN fr_to_ba THEN 'bariba' ELSE 'french' END
      UNION ALL
      SELECT 3, CASE WHEN fr_to_ba THEN french_text ELSE bariba_text END,
                CASE WHEN fr_to_ba THEN bariba_text ELSE french_text END
        FROM training_phrases
       WHERE public.fitila_norm(CASE WHEN fr_to_ba THEN french_text ELSE bariba_text END) = q
      UNION ALL
      SELECT 4, CASE WHEN fr_to_ba THEN text_french ELSE text_bariba END,
                CASE WHEN fr_to_ba THEN text_bariba ELSE text_french END
        FROM bariba_corpus_phrases
       WHERE coalesce(is_active, true)
         AND public.fitila_norm(CASE WHEN fr_to_ba THEN text_french ELSE text_bariba END) = q
    ) c
    WHERE public.fitila_norm(c.s) = q AND coalesce(btrim(c.t), '') <> ''
    ORDER BY prio
    LIMIT 1
  LOOP
    RETURN jsonb_build_object('translation', btrim(hit.t), 'method', 'corpus-exact', 'confidence', 92,
                              'matched_source', hit.s, 'coverage', 1);
  END LOOP;

  -- 2. Un ou deux mots : le dictionnaire d'abord.
  IF q_words <= 2 THEN
    tr := public.fitila_dictionary_word(q, fr_to_ba);
    IF tr IS NOT NULL THEN
      RETURN jsonb_build_object('translation', tr, 'method', 'dictionary', 'confidence', 80, 'coverage', 1);
    END IF;
  END IF;

  -- 3. Phrase très proche (trigrammes) et de longueur comparable.
  IF length(q) >= 4 THEN
    PERFORM set_config('pg_trgm.similarity_threshold', '0.45', true);
    FOR hit IN
      SELECT s, t, sim FROM (
        SELECT CASE WHEN fr_to_ba THEN french_text ELSE bariba_text END AS s,
               CASE WHEN fr_to_ba THEN bariba_text ELSE french_text END AS t,
               similarity(public.fitila_norm(CASE WHEN fr_to_ba THEN french_text ELSE bariba_text END), q) AS sim
          FROM training_phrases
         WHERE (fr_to_ba AND public.fitila_norm(french_text) % q) OR (NOT fr_to_ba AND public.fitila_norm(bariba_text) % q)
        UNION ALL
        SELECT CASE WHEN fr_to_ba THEN text_french ELSE text_bariba END,
               CASE WHEN fr_to_ba THEN text_bariba ELSE text_french END,
               similarity(public.fitila_norm(CASE WHEN fr_to_ba THEN text_french ELSE text_bariba END), q)
          FROM bariba_corpus_phrases
         WHERE coalesce(is_active, true)
           AND ((fr_to_ba AND public.fitila_norm(text_french) % q) OR (NOT fr_to_ba AND public.fitila_norm(text_bariba) % q))
      ) c
      WHERE coalesce(btrim(c.t), '') <> ''
        AND array_length(string_to_array(public.fitila_norm(c.s), ' '), 1) BETWEEN ceil(q_words * 0.7) AND greatest(q_words, floor(q_words * 1.5))
      ORDER BY sim DESC
      LIMIT 1
    LOOP
      IF hit.sim >= 0.6 THEN
        RETURN jsonb_build_object('translation', btrim(hit.t), 'method', 'corpus-similar',
                                  'confidence', round(50 + hit.sim * 40), 'matched_source', hit.s,
                                  'similarity', round(hit.sim::numeric, 2), 'coverage', 1);
      END IF;
    END LOOP;
  END IF;

  -- 4. Glose mot à mot (approximative), seulement si au moins la moitié
  --    des mots porteurs de sens sont connus ; mots inconnus entre crochets.
  FOR tok IN SELECT unnest(string_to_array(q, ' ')) LOOP
    CONTINUE WHEN tok = '' OR (fr_to_ba AND tok = ANY (fr_stop));
    total := total + 1;
    tr := public.fitila_dictionary_word(tok, fr_to_ba);
    IF tr IS NOT NULL THEN
      found := found + 1;
      out_words := out_words || tr;
    ELSE
      out_words := out_words || ('[' || tok || ']');
    END IF;
  END LOOP;

  IF total = 0 OR found = 0 OR found::numeric / total < 0.5 THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('translation', array_to_string(out_words, ' '), 'method', 'dictionary-gloss',
                            'confidence', round(20 + 30 * found::numeric / total),
                            'coverage', round(found::numeric / total, 2));
END;
$$;

REVOKE ALL ON FUNCTION public.fitila_corpus_translate(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fitila_corpus_translate(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fitila_norm(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fitila_first_sense(text) TO anon, authenticated, service_role;
-- Interne : appelée uniquement par fitila_corpus_translate (SECURITY DEFINER).
REVOKE ALL ON FUNCTION public.fitila_dictionary_word(text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fitila_dictionary_word(text, boolean) TO service_role;
