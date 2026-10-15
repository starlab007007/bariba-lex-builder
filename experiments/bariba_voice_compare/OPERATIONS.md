# FITILA Meta voice — exploitation

Chaîne : App web → `meta-voice-gateway` (Supabase canonique dvswhjawiooprghzeyol, JWT utilisateur requis)
→ service CPU `service.py` sur le VPS (`/infer`, jeton `FITILA_MODEL_API_TOKEN`) → modèles
`facebook/mms-tts-bba` et Omnilingual ASR CTC 300M.

Licence : MMS-TTS = CC BY-NC. Usage recherche/non commercial uniquement sans accord de Meta.

## 1. VPS
```sh
cd experiments/bariba_voice_compare
export FITILA_MODEL_API_TOKEN="$(openssl rand -hex 32)"   # garder dans un coffre, jamais dans git
export FITILA_SUPABASE_PUBLISHABLE_KEY=<clé publique>
docker compose up --build -d          # écoute 127.0.0.1:8090 uniquement
curl -s localhost:8090/health          # n'atteste PAS le chargement des poids
```
Exposer via reverse proxy HTTPS (Caddy/Nginx) — jamais le port 8090 en direct.
Test réel : `POST /infer` avec `{"engine":"meta-mms-tts-bba","text":"A ka bɔni"}` → `audio_base64` non vide.

## 2. Supabase canonique
Secrets (Dashboard → Edge Functions → Secrets) : `FITILA_VOICE_SERVICE_URL` (URL HTTPS du proxy),
`FITILA_MODEL_API_TOKEN` (même valeur que le VPS).
Déploiement : workflow « Deploy FITILA voice & translation functions » (nécessite un
`SUPABASE_ACCESS_TOKEN` GitHub valide) ou `supabase functions deploy meta-voice-gateway --project-ref dvswhjawiooprghzeyol`.
Contrôles : sans JWT → 401 ; secrets absents → 503 `not_configured` ; moteur inconnu → 400.

## 3. Feature flags (désactivés par défaut)
- Build : `VITE_FITILA_META_TTS=true`, `VITE_FITILA_META_ASR=true`.
- Par appareil (test/rollback) : `localStorage['fitila-flag-meta-tts'|'fitila-flag-meta-asr'] = '1' | '0'`.

Comportement :
- Apprendre : voix humaine publiée prioritaire ; sinon Meta TTS si flag ; sinon bouton grisé « voix indisponible ».
- Exercice « parler » : si flag ASR, transcription Meta modifiable affichée à côté du texte attendu ; la
  comparaison humaine (référence, « Ma voix », « Les deux ») reste inchangée. Audio envoyé à la passerelle, non stocké.
- DUNYA : ASR/TTS Meta si flag, sinon et en cas d'échec repli automatique sur `bariba-stt` / `bariba-tts`.

## 4. Rollback
Mettre les flags à `false`/`'0'` : l'app revient aux fonctions existantes sans redéploiement serveur.
Arrêt complet : `docker compose down` → la passerelle répond 503 et l'app se replie.

## Hors périmètre
Aucune voix n'est publiée automatiquement ; vidéos, médias TamTam, animations, Envato et audios de Classe non touchés.
