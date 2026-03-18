

## Plan d'implémentation : Stabilisation HF Spaces (Option A + C)

### Constat actuel
- `hf-keep-alive` : ping SANS header `Authorization` -- les Spaces privés ne répondent pas correctement
- Pas de job `pg_cron` configuré pour appeler `hf-keep-alive` automatiquement
- Pas de pre-warm au chargement de l'app
- Pas de retry exponentiel dans `byt5-bariba-translate` ni `bariba-stt`

### Etapes d'implémentation

**1. Corriger `hf-keep-alive` avec auth header**
- Fichier : `supabase/functions/hf-keep-alive/index.ts`
- Ajouter `Authorization: Bearer HUGGING_FACE_API_TOKEN` sur chaque ping
- Tester `/gradio_api/config` puis fallback sur `/` si 404
- Retourner un statut plus détaillé par Space

**2. Créer le job pg_cron (toutes les 10 min)**
- SQL insert (pas migration) pour appeler `hf-keep-alive` via `net.http_post` toutes les 10 minutes
- Nécessite les extensions `pg_cron` et `pg_net`

**3. Ajouter un hook `useHFPreWarm`**
- Nouveau fichier : `src/hooks/useHFPreWarm.ts`
- Appelle `hf-keep-alive` une fois au mount de l'app (non-bloquant, silencieux)
- Intégré dans `FitilaApp.tsx` (layout principal)

**4. Retry exponentiel dans `byt5-bariba-translate`**
- Fichier : `supabase/functions/byt5-bariba-translate/index.ts`
- Wrapper autour de `callGradioTranslate` : 3 tentatives avec délai 3s/8s/15s
- Si les 3 échouent, retourner 503 avec message clair

**5. Retry exponentiel dans `bariba-stt`**
- Fichier : `supabase/functions/bariba-stt/index.ts`
- Wrapper autour du pipeline `transcribeBariba` : 2 tentatives avec délai 5s/15s (STT est plus lent)
- Gestion spéciale de l'erreur `SPACE_SLEEPING` (attendre 30s avant retry)

### Fichiers modifiés
| Fichier | Action |
|---------|--------|
| `supabase/functions/hf-keep-alive/index.ts` | Ajouter auth + fallback routes |
| `src/hooks/useHFPreWarm.ts` | Nouveau -- pre-warm au mount |
| `src/pages/fitila/FitilaApp.tsx` | Intégrer `useHFPreWarm` |
| `supabase/functions/byt5-bariba-translate/index.ts` | Ajouter retry exponentiel |
| `supabase/functions/bariba-stt/index.ts` | Ajouter retry exponentiel |
| SQL insert (pg_cron) | Job toutes les 10 min |

