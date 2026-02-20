
# Anti Cold-Sleep : Ping automatique des HuggingFace Spaces

## Modeles HuggingFace utilises

| Modele | Fonction | URL du Space | Edge Function |
|--------|----------|-------------|---------------|
| ByT5 Expert (Traduction FR-BA) | Traduction francais-bariba | `https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space` | `byt5-bariba-translate` |
| Baatonum TTS (Text-to-Speech) | Synthese vocale bariba | `https://zimesongbian-baatonum-tts-api-v001.hf.space` | `bariba-tts` |
| Baatonum ASR/STT (Speech-to-Text) | Reconnaissance vocale bariba | `https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space` | `bariba-stt` |

Les 3 Spaces sont heberges sous le compte HuggingFace `zimesongbian`.

## Probleme

Les HuggingFace Spaces gratuits se mettent en veille ("cold sleep") apres environ 48h d'inactivite. Le premier appel apres le reveil prend 30-60 secondes, causant des timeouts et des erreurs 503 pour les utilisateurs.

## Solution proposee

Creer une edge function `hf-keep-alive` qui envoie un simple GET a chaque Space toutes les 30 minutes via un cron job PostgreSQL.

### Etape 1 : Creer `supabase/functions/hf-keep-alive/index.ts`

La fonction :
- Envoie un GET a chacun des 3 Spaces (endpoint `/gradio_api/config` qui est leger)
- Timeout de 15 secondes par Space
- Retourne le statut de chaque Space (awake/sleeping/error)
- Execution totale en moins de 20 secondes

```text
hf-keep-alive
    |
    +--> GET zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space/gradio_api/config
    +--> GET zimesongbian-baatonum-tts-api-v001.hf.space/gradio_api/config
    +--> GET zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space/gradio_api/config
    |
    +--> Retourne { byt5: "awake", tts: "awake", stt: "awake" }
```

### Etape 2 : Ajouter dans `supabase/config.toml`

```
[functions.hf-keep-alive]
verify_jwt = false
```

### Etape 3 : Configurer le cron job (pg_cron + pg_net)

Un cron PostgreSQL qui appelle la fonction toutes les 30 minutes :

```sql
-- Activer les extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Programmer le ping toutes les 30 minutes
SELECT cron.schedule(
  'hf-keep-alive-ping',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pmrhezgnyffiskbaiudb.supabase.co/functions/v1/hf-keep-alive',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcmhlemdueWZmaXNrYmFpdWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODgzNzAsImV4cCI6MjA3ODg2NDM3MH0.BRqdPly5tClRwhuQes1dckaTNQkbjIqZ5I8q6km_lZ4"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

## Details techniques

### Edge function `hf-keep-alive/index.ts`

- Ping les 3 Spaces en parallele (Promise.all) pour minimiser le temps d'execution
- Utilise `/gradio_api/config` comme endpoint de health check (reponse legere, ne declenche pas de calcul GPU)
- Log le statut de chaque Space pour le suivi
- Pas besoin de token HuggingFace pour le health check (les Spaces sont publics)

### Frequence : toutes les 30 minutes

- Les Spaces HuggingFace gratuits dorment apres ~48h d'inactivite
- Un ping toutes les 30 minutes est suffisant pour les garder eveilles
- Cout minimal : 48 appels/jour, chaque appel dure moins de 5 secondes

### Aucune modification sur les fonctions existantes

- `byt5-bariba-translate`, `bariba-tts`, `bariba-stt` restent inchanges
- `fitila-ia-chat` reste inchange
- Le traducteur (PhraseTranslator) reste inchange
