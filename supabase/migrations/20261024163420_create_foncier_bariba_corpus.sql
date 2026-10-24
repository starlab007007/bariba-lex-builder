CREATE TABLE IF NOT EXISTS public.foncier_bariba_corpus (
  id integer PRIMARY KEY,
  number text NOT NULL,
  content text NOT NULL,
  bonu text,
  baeru text,
  gari_wiru text,
  page integer
);

COMMENT ON TABLE public.foncier_bariba_corpus IS 'Corpus statique des 207 articles du Code foncier bariba (Loi 2013-01), utilisé par la fonction fitila-tem-ia-chat pour le retrieval en ligne. Même contenu que src/data/foncier_bariba_corpus.json (hors ligne) — stocké en table plutôt qu''en fichier statique pour permettre son chargement fiable lors du déploiement de la fonction edge.';

ALTER TABLE public.foncier_bariba_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foncier_bariba_corpus_public_read" ON public.foncier_bariba_corpus
  FOR SELECT
  USING (true);
