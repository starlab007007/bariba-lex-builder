# Contenu Apprendre dans Supabase

Objectif : que le web (fitila.bj) lise dans Supabase exactement le contenu
de Flutter `feat/apprendre-v2.4-build19-20260927` — 1847 mots, 10
fondations, 12 thèmes, 3 proverbes (`core`) et 44 scènes, 11 catégories
(`scenes`).

## Les fichiers

| Fichier | Rôle |
|---|---|
| `src/data/apprendre_v2.json` | Contenu `core`, copie octet pour octet de `fitila_flutter/assets/data/apprendre_v2.json` |
| `src/data/scenes_v2.json` | Contenu `scenes`, copie octet pour octet de `fitila_flutter/assets/data/scenes_v2.json` |
| `supabase/migrations/20260928090000_apprendre_module_content.sql` | Table, triggers (hash, comptage, journal), droits, fonction d'import admin, vue de statut. Rejouable sans erreur. |
| `tools/apprendre-content-import/build_import_sql.py` | Génère le SQL d'import de chaque bloc |
| `tools/apprendre-content-import/sync_supabase.py` | Migration + import + contrôles via l'API Management (utilisé par le workflow) |
| `tools/apprendre-content-import/import_apprendre_content.mjs` | Import manuel avec une clé `service_role` |
| `tools/apprendre-content-import/test_migration.mjs` | 28 contrôles dans un vrai PostgreSQL (PGlite) |
| `.github/workflows/apprendre-content-supabase.yml` | Automatisation |

## Deux projets Supabase distincts

- **Site web fitila.bj** : le projet défini par le secret GitHub
  `VITE_SUPABASE_URL` (le `.env` de `main` indique `pmrhezgnyffiskbaiudb`).
- **Appli Flutter** : `dvswhjawiooprghzeyol` (`.env` des branches Flutter).

Ils ne partagent pas de données. Le workflow importe le même contenu dans
les deux. Seul le projet web est lu aujourd'hui : Flutter lit toujours sa
copie embarquée.

## Voie automatique (recommandée)

Le workflow `Apprendre content to Supabase` tourne à chaque push sur `main`
qui touche la migration, les JSON ou ces outils (et à la main depuis
l'onglet Actions → *Run workflow*) :

1. **test** — rejoue migration + import dans PostgreSQL et vérifie droits,
   intégrité et idempotence.
2. **sync (web)** puis **sync (flutter)** — avec le secret
   `SUPABASE_ACCESS_TOKEN` de l'environnement `production` : vérifie
   l'accès au projet, applique la migration, importe `core` et `scenes`,
   contrôle 1847 / 44 en base, puis vérifie que la clé publique (anon)
   lit bien le contenu, comme le site.

Chaque étape laisse une annotation lisible dans le run. Si le jeton n'a pas
accès à un projet, le job le dit et n'écrit rien : passe alors à la voie
manuelle pour ce projet.

**Pour mettre à jour le contenu plus tard** : remplace les deux JSON dans
`src/data/` (copies des assets Flutter), pousse sur `main`. Le workflow
réimporte, et le site sert la nouvelle version sans redéploiement.

## Voie manuelle (si le workflow n'a pas accès au projet)

### 1. Appliquer la migration

Dans le **SQL Editor** du projet, colle et exécute
`supabase/migrations/20260928090000_apprendre_module_content.sql`.
Elle peut être relancée sans risque.

### 2. Importer le contenu

Clé `service_role` du projet : Dashboard → Project Settings → API (secrète :
jamais dans un fichier committé ni côté client).

```bash
cd tools/apprendre-content-import
npm install
SUPABASE_URL="https://TON-PROJET.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
npm run import
```

Le script relit la vue de statut et échoue si le nombre d'éléments ne
correspond pas.

Autre possibilité sans Node : `python3 build_import_sql.py core` et
`python3 build_import_sql.py scenes` produisent deux requêtes SQL à
exécuter dans le SQL Editor (fichiers volumineux : ~540 Ko et ~135 Ko).

Autre possibilité depuis le site : un compte admin peut appeler la fonction
`apprendre_import_content` (composant `ApContentImportPanel.tsx`).

### 3. Vérifier

```sql
select id, content_version, item_count, updated_at
from apprendre_module_content_status;
```

Attendu : `core` → 1847, `scenes` → 44, version `v2.4-build19-20260927`.

## Comportement du site

`src/lib/apprendre/contentLoader.ts` lit Supabase en premier et retombe sur
la copie embarquée si la table est absente, vide ou incomplète. Le site
fonctionne donc avant, pendant et après l'import.

## Tester la migration localement

```bash
cd tools/apprendre-content-import
npm install
npm test
```
