# Comparaison contrôlée des voix Baatɔnum — FITILA

**Statut : outil de recherche/benchmark isolé — pas une route de production.**

**Mise à jour (2026-10-24) :** les deux mêmes modèles Meta décrits ici
(`omniASR-CTC-300M` pour l'ASR, `mms-tts-bba` pour le TTS) sont désormais
aussi servis en **production**, auto-hébergés et surveillés, par
[`voice-gateway/`](../../voice-gateway/) — ce dossier-ci reste uniquement
pour la comparaison à quatre moteurs et les bancs d'essai qualité décrits
plus bas. Le `service.py` de ce dossier n'est plus appelé par
`meta-voice-gateway` ; voir `voice-gateway/README.md` pour le contexte
complet, y compris pourquoi l'ancienne affirmation « pas activation
automatique dans le produit » s'est révélée vraie en pratique (route jamais
exposée publiquement, aucun pipeline de déploiement) et comment c'est
corrigé.

## Modèles

- ASR: `facebook/omniASR-CTC-300M`, Apache-2.0, inférence serveur avec `omnilingual-asr` (fairseq2). Poids d'environ 1,3 Gio, VRAM annoncée ~2 Gio dans le model card ; prévoir de la RAM supplémentaire. L'identifiant de langue `bba_Latn` est un candidat à valider dans la version de la bibliothèque installée.
- TTS: `facebook/mms-tts-bba`, CC-BY-NC-4.0, inférence serveur avec Transformers/VITS. **Recherche/prototype non commercial uniquement ; pas de bascule automatique vers un produit payant.**
- Références FITILA: Edge Functions `bariba-stt` v3 et `bariba-tts` v4 via Supabase. Ce sont des wrappers vers des Spaces Hugging Face dont les checkpoints exacts ne sont pas attestés.

## Installation dans un environnement isolé

Prérequis : Linux/CPU ou GPU, Python 3.11, libsndfile, réseau au premier téléchargement et accès aux audios de recherche consentis. Ne pas installer les modèles dans Supabase Edge Functions ; ceux-ci ont des limites d'exécution et ne remplacent pas un serveur d'inférence ML dédié.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r experiments/bariba_voice_compare/requirements.txt
export FITILA_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
export FITILA_USER_ACCESS_TOKEN="<JWT-user>"
python experiments/bariba_voice_compare/compare.py \
  --dataset /chemin/prive/corpus/manifest.jsonl \
  --engine all --output /chemin/prive/resultats
```

Exemple **de structure seulement** (aucune phrase de test ni aucun score inventé) :

```json
{"id":"locuteur01_phrase01","audio":"audios/phrase01.wav","reference":"TRANSCRIPTION VERIFIEE PAR UN LOCUTEUR","text":"PHRASE BAATONUM VALIDEE"}
```

Les fichiers `audio` doivent être WAV accessibles localement. L'API Bariba-STT n'accepte pas nécessairement tous les formats : ce banc d'essai transmet WAV en base64.

## Tests et lecture des résultats

```bash
python -m unittest discover -s experiments/bariba_voice_compare -p 'test_*.py'
```

- `results.json` : transcription brute, statut et latence par moteur, erreurs explicites.
- `summary.json` : **WER** et **CER** pondérés par la taille du corpus, nombres de générations audio réussies, latence moyenne.
- **TTS** : les clips MMS sont sauvegardés en WAV ; les clips produits par le service de référence doivent être enregistrés et écoutés selon le protocole de test. La réussite HTTP n'est pas une mesure de naturalité.
- Organiser un test d'écoute aveugle A/B auprès de locuteurs natifs : prononciation, intelligibilité, prosodie et naturalité (MOS 1–5).
- Au moins 100 phrases validées, plusieurs locuteurs et conditions acoustiques avant d'interpréter les performances STT.
- Séparer les environnements recherche et production, obtenir consentement des voix, ne jamais publier audios privés, JWT, clés et artefacts vocaux du corpus.
- Aucun résultat d'inférence n'a été exécuté ou certifié par la seule création de ces scripts.
- Le code ne remplace **aucune** route FITILA de production, et ne charge pas les poids dans l'APK Flutter.

## Sécurité et licences

MMS Baatɔnum reste CC-BY-NC 4.0, y compris pour ses poids ; confirmer l'admissibilité de chaque scénario de prototype. Supabase expose uniquement une clé publishable au client ; le JWT ne doit pas apparaître dans les journaux ou fichiers de résultat. L'API de référence doit être appelée avec un jeton d'essai et un corpus approuvé.

Références :
- https://huggingface.co/facebook/mms-tts-bba
- https://huggingface.co/facebook/omniASR-CTC-300M
- https://github.com/facebookresearch/omnilingual-asr
