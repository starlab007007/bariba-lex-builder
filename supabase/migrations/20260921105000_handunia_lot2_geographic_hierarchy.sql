-- Handunia Wasa Lot 2 — ancrage géographique unifié.
-- Les colonnes sont additives afin de préserver tous les lieux historiques.
ALTER TABLE public.handunia_lieux
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS commune TEXT,
  ADD COLUMN IF NOT EXISTS arrondissement TEXT,
  ADD COLUMN IF NOT EXISTS village_quartier TEXT,
  ADD COLUMN IF NOT EXISTS osm_id TEXT,
  ADD COLUMN IF NOT EXISTS osm_type TEXT,
  ADD COLUMN IF NOT EXISTS geo_provider TEXT,
  ADD COLUMN IF NOT EXISTS geo_verified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_handunia_lieux_department
  ON public.handunia_lieux (department);
CREATE INDEX IF NOT EXISTS idx_handunia_lieux_commune
  ON public.handunia_lieux (commune);
CREATE INDEX IF NOT EXISTS idx_handunia_lieux_arrondissement
  ON public.handunia_lieux (arrondissement);
CREATE INDEX IF NOT EXISTS idx_handunia_lieux_village_quartier
  ON public.handunia_lieux (village_quartier);
CREATE INDEX IF NOT EXISTS idx_handunia_lieux_geo
  ON public.handunia_lieux (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.handunia_lieux.department IS
  'Département résolu par le fournisseur cartographique, à valider par la communauté si nécessaire.';
COMMENT ON COLUMN public.handunia_lieux.commune IS
  'Commune résolue depuis les données cartographiques ouvertes.';
COMMENT ON COLUMN public.handunia_lieux.arrondissement IS
  'Arrondissement résolu depuis les données cartographiques ouvertes.';
COMMENT ON COLUMN public.handunia_lieux.village_quartier IS
  'Village ou quartier résolu depuis les données cartographiques ouvertes.';
