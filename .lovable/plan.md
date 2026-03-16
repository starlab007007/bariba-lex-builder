

## Diagnostic complet : HuggingFace Spaces & APIs payantes

### 1. HuggingFace Spaces utilisés

| # | Space | URL | Fonction | Usage |
|---|-------|-----|----------|-------|
| 1 | **ByT5 Expert (Traduction)** | `zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space` | `byt5-bariba-translate` | Traduction Français ↔ Bariba |
| 2 | **Bariba TTS** | `zimesongbian-baatonum-tts-api-v001.hf.space` | `bariba-tts` | Synthèse vocale Bariba |
| 3 | **Bariba STT** | `zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space` | `bariba-stt` | Reconnaissance vocale Bariba |

**Statut actuel** : Ces 3 Spaces sont sur le plan **gratuit HuggingFace** et passent en mode **sleeping** (hibernation) après ~48h d'inactivité. Un mécanisme `hf-keep-alive` existe mais ne suffit pas (pas d'auth, pas de scheduling fiable).

---

### 2. APIs payantes utilisées dans la plateforme

| Service | Secret | Endpoint | Usage | Coût |
|---------|--------|----------|-------|------|
| **Mistral AI** | `MISTRAL_API_KEY` | `api.mistral.ai/v1/audio/transcriptions` | Transcription audio français (Voxtral Mini) | **Payant** - facturation à l'usage |
| **ElevenLabs** | `ELEVENLABS_API_KEY` | API ElevenLabs | Voice cloning / TTS avancé (AIServicesHub) | **Payant** - quota mensuel |
| **AIML API** | `AIML_API_KEY` | API AIML | Services AI divers | **Payant** |
| **Lovable AI** | `LOVABLE_API_KEY` | `ai.gateway.lovable.dev` | Fallback traduction, transcription Gemini, OCR | **Inclus** dans Lovable (crédits limités) |

> Note : `HUGGING_FACE_API_TOKEN` est gratuit (authentification Spaces privés).

---

### 3. Plan pour garder les HF Spaces toujours actifs

#### Option A : Keep-alive renforcé (gratuit)
- **Corriger `hf-keep-alive`** : ajouter le header `Authorization: Bearer HUGGING_FACE_API_TOKEN` sur tous les pings
- **Scheduler fiable** : configurer un job `pg_cron` qui appelle `hf-keep-alive` **toutes les 10 minutes** (au lieu de 30 min actuellement)
- **Ping plus agressif** : tester `/gradio_api/config` puis fallback `/` si erreur 404
- **Limitation** : sur le plan gratuit HF, les Spaces dorment quand même après inactivité prolongée. Le keep-alive réduit le problème mais ne le résout pas à 100%

#### Option B : HuggingFace "Always-on" (payant, recommandé)
- Activer l'option **"Always-on"** sur chaque Space dans HuggingFace (nécessite un abonnement HF Pro ~$9/mois ou un upgrade du Space)
- Cela garantit que les Spaces ne dorment **jamais**
- C'est la seule solution fiable à 100%

#### Option C : Pré-réveil intelligent (gratuit, complémentaire)
- Au chargement de l'app, appeler `hf-keep-alive` en arrière-plan (pre-warm)
- Quand l'utilisateur navigue vers Traducteur/Dictionnaire, déclencher un wake-up ciblé du Space concerné
- Ajouter retry exponentiel (3 tentatives, délai 5s/10s/20s) dans les edge functions

#### Plan d'implémentation recommandé (Option A + C)

| Étape | Action | Fichier |
|-------|--------|---------|
| 1 | Ajouter auth header dans `hf-keep-alive` | `supabase/functions/hf-keep-alive/index.ts` |
| 2 | Créer job `pg_cron` toutes les 10 min | Migration SQL (insert via SQL, pas migration) |
| 3 | Ajouter pre-warm au mount de l'app | `src/App.tsx` ou hook dédié |
| 4 | Retry exponentiel dans `byt5-bariba-translate` et `bariba-stt` | Edge functions concernées |
| 5 | Fallback automatique vers Lovable AI si HF down | Déjà partiellement en place, renforcer |

### 4. Résumé des coûts obligatoires

Pour une plateforme 100% fonctionnelle :
- **Mistral API** : seul service payant externe actuellement actif (transcription français). Alternative gratuite : remplacer par Lovable AI Gemini Flash (déjà en fallback)
- **ElevenLabs** : si voice cloning utilisé. Alternative : désactiver ou utiliser le TTS Bariba HF gratuit
- **AIML API** : vérifier si encore utilisé activement
- **Lovable AI** : inclus dans l'abonnement Lovable, pas de coût supplémentaire
- **HuggingFace** : gratuit tant que les Spaces restent sur le plan free (avec hibernation)

> **Recommandation** : remplacer Mistral par Lovable AI (Gemini Flash) pour la transcription français afin d'éliminer le seul coût externe critique. ElevenLabs et AIML peuvent être désactivés si non essentiels.

