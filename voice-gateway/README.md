# FITILA — passerelle vocale bariba (production)

Service de **production**, auto-hébergé sur le VPS fitila.bj, qui remplace
la dépendance aux Spaces Hugging Face gratuits pour la synthèse (TTS) et la
reconnaissance (STT) vocales bariba.

## Pourquoi ce service existe

Avant ce changement, `bariba-tts`/`bariba-stt` (edge functions Supabase)
appelaient en priorité un service Meta hébergé sur ce même VPS
(`experiments/bariba_voice_compare/service.py`) — mais ce service :

1. était documenté comme **expérimental, recherche uniquement**
   (`README.md` de ce dossier : *« pas activation automatique dans le
   produit »*) ;
2. n'était lié à **aucune route réseau publique** (ni Traefik, ni port
   exposé au-delà de `127.0.0.1`) — donc injoignable depuis les edge
   functions Supabase, qui tournent dans le cloud, pas sur le VPS ;
3. n'était déployé par **aucun pipeline CI/CD** — ni mis à jour, ni
   redémarré automatiquement en cas de panne au-delà du `restart` Docker.

Autrement dit : le « filet de sécurité » annoncé n'a probablement jamais
réellement intercepté le trafic de production. Ce service corrige les
trois points : une route publique (`voice.fitila.bj`), un déploiement
automatique à chaque changement de code (`.github/workflows/
voice-gateway-deploy.yml`), un health-check réel et une surveillance
continue (`.github/workflows/voice-gateway-watchdog.yml`).

## Moteurs

| Moteur | Modèle | Licence | Usage commercial |
|---|---|---|---|
| STT | `facebook/omniASR-CTC-300M` (Meta Omnilingual ASR) | Apache-2.0 | Oui, sans restriction connue |
| TTS | `facebook/mms-tts-bba` (Meta MMS, baatonum/bariba) | **CC-BY-NC-4.0** | **Non**, sauf accord explicite de Meta |

Ceci est la licence publiée par Meta, pas un avis juridique. FITILA utilise
`mms-tts-bba` en connaissance de cette restriction (choix produit déjà fait) ;
si FITILA facture ce service à des tiers, il reste à vérifier avec un
conseil juridique si l'usage entre dans le champ « non commercial » ou s'il
faut un accord avec Meta.

## Contrat HTTP (inchangé pour les edge functions)

```
POST /infer
Authorization: Bearer <FITILA_MODEL_API_TOKEN>

{"engine": "meta-mms-tts-bba", "text": "..."}
  -> {"engine", "audio_mime": "audio/wav", "audio_base64", "elapsed_seconds"}

{"engine": "meta-asr-300m", "audio_base64": "..."}
  -> {"engine", "transcript", "elapsed_seconds"}

GET /health
  -> {"status": "ok"|"degraded", "asr_loaded", "tts_loaded", "asr_error", "tts_error"}
```

`supabase/functions/_shared/meta-voice.ts` n'a besoin d'aucune
modification : même contrat qu'avant.

## Déploiement

1. Image construite et poussée sur GHCR par
   `.github/workflows/voice-gateway-deploy.yml` à chaque changement dans ce
   dossier (ou déclenchement manuel), puis déployée sur le VPS via les
   secrets `VPS_HOST`/`VPS_USER`/`SSH_PRIVATE_KEY` déjà utilisés par
   `deploy.yml`/`mirror-dunya-brain.yml`.
2. Le service est déclaré dans `docker-composer.yml` (racine du repo), donc
   il est aussi redémarré/rafraîchi par le déploiement web normal
   (`deploy.yml`) via `docker compose up -d`.
3. **Étapes manuelles ponctuelles (hors de ce que je peux faire depuis
   GitHub Actions) :**
   - Créer un enregistrement DNS `voice.fitila.bj` → IP du VPS (même IP que
     `fitila.bj`).
   - Confirmer que le VPS a assez de RAM libre pour ce service en plus de
     l'app web (prévoir ~3-4 Go : torch + deux modèles chargés en mémoire).

## Ce qui reste dans `experiments/bariba_voice_compare/`

Ce dossier reste pour la **comparaison/benchmark** des quatre moteurs
(Meta local vs. edge functions existantes) — un outil de R&D, pas une route
de production. Son `service.py` original n'est plus utilisé par
`meta-voice-gateway` ; voir la mise à jour de son `README.md`.
