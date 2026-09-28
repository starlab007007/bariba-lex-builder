# Contenu Apprendre — Supabase FITILA centralisé

Le projet unique de référence est **dvswhjawiooprghzeyol** (FITILA).

Le Web `fitila.bj` et Flutter utilisent désormais ce même projet pour les données partagées. Les JSON embarqués restent uniquement un secours hors-ligne / de build.

## Contenu canonique
- `src/data/apprendre_v2.json` : core — 1847 cartes, 10 fondations, 12 thèmes, 3 proverbes.
- `src/data/scenes_v2.json` : 44 scènes, 11 catégories.
- Version : `v2.4-build19-20260927`.

## Automatisation
Le workflow `.github/workflows/apprendre-content-supabase.yml` teste la migration puis synchronise le projet FITILA unique.

Si `SUPABASE_ACCESS_TOKEN` renvoie 401, le job échoue explicitement : il ne masque plus l'échec.

## Import manuel
1. Appliquer `supabase/migrations/20260928090000_apprendre_module_content.sql`.
2. Utiliser l'onglet admin `/admin/apprendre-content`, ou :
```bash
cd tools/apprendre-content-import
npm install
SUPABASE_URL="https://dvswhjawiooprghzeyol.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
npm run import
```

## Vérification
```sql
select id, content_version, item_count, updated_at
from apprendre_module_content_status;
```

Attendu :
- core → 1847
- scenes → 44
- version → v2.4-build19-20260927

Le web lit Supabase en premier puis utilise les JSON embarqués seulement si la base est indisponible ou incomplète.
