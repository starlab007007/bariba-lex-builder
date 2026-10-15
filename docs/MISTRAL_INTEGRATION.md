# Mistral dans FITILA

Le fournisseur actif se choisit dans `/admin/settings`, comme décrit dans
[AI_PROVIDER_SELECTION.md](AI_PROVIDER_SELECTION.md). Lorsque Mistral est choisi,
les fonctions texte, vision et transcription française utilisent le secret
serveur `MISTRAL_API_KEY`, via le routeur commun puis `_shared/mistral.ts`.
Aucune clé Mistral n’est envoyée au navigateur. Les secrets se configurent dans les Edge Functions ; l’administration permet
ensuite de tester et d’activer Mistral ou Gemini sans exposer les clés.

## Configuration facultative côté serveur

| Variable | Valeur par défaut | Usage |
| --- | --- | --- |
| `MISTRAL_CHAT_MODEL` | `mistral-small-latest` | Assistants, génération, scénarios, traduction assistée |
| `MISTRAL_VISION_MODEL` | `pixtral-large-latest` | OCR, manuscrits, analyse d’images |
| `MISTRAL_TRANSCRIBE_MODEL` | `voxtral-mini-latest` | Transcription française dans `transcribe-audio` |
| `MISTRAL_MAX_OUTPUT_TOKENS` | `4096` | Plafond par réponse ; les limites plus basses des fonctions sont conservées |

Le transport n’accepte que les deux URL officielles de conversation et de
transcription. Il choisit le modèle vision quand une image est jointe, conserve
le JSON et le streaming SSE, borne chaque appel à 45 secondes et applique au
maximum une relance sur erreur réseau, 429 ou 5xx. Un `Retry-After` de plus de
deux secondes est renvoyé sans relance immédiate. Les corps d’erreur du fournisseur
ne sont pas journalisés par le transport.

## Couverture

- Conversation : `fitila-ia-chat`, DUNYA par cet intermédiaire,
  `fitila-tem-ia-chat`, `smart-assistant`, `agri-advisor`, `raconte-moi`.
- Langue : `ai-translate`, `refine-bariba`, `suggest-dictionary-fix`,
  `analyze-phrase-quality`. L’alias existant `ai-translate-lovable` délègue à
  `ai-translate` et profite de la même configuration.
- Mémoire et commerce : `handunia-memory-query`, `handunia-ai-create`,
  `aburu-fim-ai`, `super-ia-create`.
- Création : `generate-content`, `generate-content-stream`, `process-template`,
  `analyze-story`, `analyze-news`, parties texte de `generate-ai-templates`,
  `generate-template-assets`, `generate-anime-story`.
- Vision : `ocr-translate`, `espace-ocr`, `recognize-handwriting`,
  `analyze-asset`, `generate-image-animation` (vision et analyse émotionnelle).
- Audio français : `transcribe-audio` (Voxtral).

Les descriptions, suggestions et storyboards n’exigent plus la clé du générateur
d’images. Le découpage d’un conte utilise Mistral indépendamment de la génération
de ses illustrations. Les trois demandes de contenu d’un template sont effectuées
successivement pour éviter une rafale inutile contre le quota partagé.

## Services spécialisés

La voix bariba conserve Omnilingual pour l’ASR et Meta MMS pour la synthèse ; ByT5,
le corpus et les règles linguistiques conservent leur rôle dans la traduction.
Le navigateur peut assurer reconnaissance/synthèse française selon le parcours.
La génération d’images ou de vidéos nécessite toujours son service dédié
`FITILA_IMAGE_API_URL` / `FITILA_IMAGE_API_KEY`. Une clé de conversation Mistral
ne configure pas automatiquement ce service. Les traitements déterministes du
dictionnaire n’ajoutent pas d’appel facturé inutile.

## État vérifié le 15 octobre 2026

Le secret est présent en production : `fitila-ia-chat` atteint Mistral, qui répond
HTTP 429 « Rate limit exceeded ». Cela ne permet pas de valider une génération
réelle tant que les limites du compte ne permettent pas l’appel. Le transport et
les contrats d’application sont couverts par des tests avec réponses simulées.
Consulter les limites et l’usage dans la console Mistral pour identifier la limite
par seconde, par minute ou mensuelle concernée. Changer la clé seule peut laisser
la même limite d’organisation en place.

`fitila-ia-chat` renvoie maintenant `llm_rate_limited`, HTTP 429 et `Retry-After`.
La post-édition respecte la direction cible : aucun remplacement lexical bariba
n’est appliqué à la sortie française. Les correspondances attestées restent
prioritaires. Les changements de nombres, de négation française et les nouveaux
mots bariba absents du lexique sont rejetés. Le score est explicitement
`heuristic-unverified`, sans certification linguistique. ByT5 ne marque plus une
révision comme appliquée lorsque Mistral est indisponible. La révision des poids
HF est déclarée inconnue (`weightsRevisionVerified: false`) tant que le service
ne la fournit pas.

DUNYA expose `brain_rate_limited` avec un message lisible, sans produire une
réponse inventée. Les replis existants, lorsqu’ils existent, restent explicites.

## Vérification et déploiement

La CI `Validate FITILA Mistral integration` vérifie tous les points d’entrée qui
importent le transport, les contrats texte/vision/audio et les protections DUNYA.
Déployer chaque fonction avec son `index.ts`, le fichier partagé `mistral.ts` et
toutes ses dépendances relatives. Conserver les paramètres d’authentification de
production ; `supabase/config.toml` les explicite pour les fonctions concernées.
Après changement du secret ou des quotas, tester une seule demande réelle avant
de lancer des générations en série. Aucun diagnostic ne doit exposer la clé.

Références :
- https://docs.mistral.ai/api/endpoint/chat
- https://docs.mistral.ai/api/endpoint/audio/transcriptions
- https://help.mistral.ai/fr/articles/698531-pourquoi-est-ce-que-j-atteins-mes-limites-d-usage-api-et-comment-les-augmenter
