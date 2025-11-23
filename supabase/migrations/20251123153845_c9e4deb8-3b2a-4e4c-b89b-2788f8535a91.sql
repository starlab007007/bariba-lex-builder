-- Table pour stocker les métriques de qualité SMT
CREATE TABLE IF NOT EXISTS public.smt_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  test_set_name TEXT NOT NULL,
  total_phrases INTEGER NOT NULL,
  bleu_score NUMERIC(5,2),
  precision_score NUMERIC(5,2),
  recall_score NUMERIC(5,2),
  f1_score NUMERIC(5,2),
  avg_confidence NUMERIC(5,2),
  avg_duration_ms INTEGER,
  test_results JSONB,
  model_version TEXT DEFAULT 'SMT-v1.0',
  tested_by UUID
);

-- Table pour logs d'initialisation SMT
CREATE TABLE IF NOT EXISTS public.smt_initialization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initialized_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  phrases_count INTEGER NOT NULL,
  dictionary_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  smt_ready BOOLEAN DEFAULT false,
  corrector_ready BOOLEAN DEFAULT false,
  trie_ready BOOLEAN DEFAULT false,
  cache_prewarmed BOOLEAN DEFAULT false,
  cache_preload_count INTEGER DEFAULT 0,
  source_stats JSONB,
  errors JSONB,
  performance_metrics JSONB
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_smt_quality_metrics_created_at ON public.smt_quality_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smt_init_logs_initialized_at ON public.smt_initialization_logs(initialized_at DESC);

-- RLS Policies
ALTER TABLE public.smt_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smt_initialization_logs ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout gérer
CREATE POLICY "Admins peuvent gérer métriques qualité"
  ON public.smt_quality_metrics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins peuvent gérer logs init"
  ON public.smt_initialization_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Lecture publique des métriques
CREATE POLICY "Lecture publique métriques qualité"
  ON public.smt_quality_metrics
  FOR SELECT
  USING (true);

CREATE POLICY "Lecture publique logs init"
  ON public.smt_initialization_logs
  FOR SELECT
  USING (true);