# Choix global Gemini / Mistral

L’administrateur dispose du panneau **Moteur IA de FITILA** dans
`/admin/settings`. Deux actions sont proposées pour chaque fournisseur :
**Tester** et **Activer**. L’activation vérifie d’abord une réponse réelle et
n’enregistre le changement que si le fournisseur répond. Une erreur de clé,
de quota ou de réseau conserve le moteur précédent. Le choix s’applique aux
prochaines requêtes de tous les utilisateurs, y compris DUNYA.

## Configuration

Les secrets sont définis dans les Edge Functions du projet
`dvswhjawiooprghzeyol` :

| Fournisseur | Secret | Modèle par défaut |
| --- | --- | --- |
| Mistral | `MISTRAL_API_KEY` | `mistral-small-latest` ; vision `pixtral-large-latest` ; ASR français Voxtral |
| Gemini | `GEMINI_API_KEY` | `gemini-3.1-flash-lite` pour texte, vision et audio français |

`GOOGLE_API_KEY` et `GOOGLE_AI_API_KEY` sont acceptés comme alias serveur de la
clé Gemini. `GEMINI_MODEL` permet un remplacement explicite du modèle côté
serveur. Les variables Mistral existantes restent prises en charge.

Gemini 3.1 Flash-Lite est retenu pour son coût inférieur à 3.5 Flash-Lite parmi
les modèles encore accessibles aux nouveaux projets. Au 15 octobre 2026, Google
réserve les modèles 2.5 aux projets qui les utilisaient déjà. Le modèle 3.1 est
annoncé disponible jusqu’au moins mai 2027. La consommation et les quotas
restent ceux du compte du fournisseur ; l’application ne peut pas augmenter
ces limites.

La clé n’est jamais enregistrée dans la base, le navigateur ou les réponses
d’administration. Le panneau affiche uniquement sa présence. Après ajout d’un
secret, utiliser **Actualiser**, puis **Tester** et **Activer**.

## Architecture et autorisation

- `public.fitila_ai_settings` contient une ligne : fournisseur, version, date
  et identifiant du dernier administrateur. La migration démarre sur Mistral.
- La table est protégée par RLS. Les administrateurs peuvent la lire, mais
  aucun client `anon` ou `authenticated` ne peut la modifier directement.
- `ai-provider-settings` valide le JWT auprès d’Auth et vérifie `has_role` sur
  `user_roles`. Il n’utilise jamais `user_metadata` pour autoriser une action.
- L’écriture exige la version lue : une activation concurrente ou obsolète
  retourne HTTP 409 et ne remplace pas le choix d’un autre administrateur.
- `_shared/ai-provider.ts` lit le réglage au démarrage de chaque appel IA.
  Aucun cache inter-fonctions ne peut maintenir un ancien fournisseur.
- Le fournisseur actif est utilisé strictement : une clé absente ou une erreur
  ne déclenche pas de transfert automatique des données vers l’autre fournisseur
  ou le routeur Hugging Face.

Les contrats des fonctions restent compatibles : JSON, réponses textuelles,
flux SSE, images pour OCR/vision et transcription française. Les réponses
conversationnelles et traces serveur indiquent le véritable modèle/fournisseur.
Gemini reçoit les appels texte/vision via son API compatible chat et l’audio
français via `generateContent`. La transcription retourne `words: []` lorsque
des horodatages de mots n’ont pas été mesurés.

La voix bariba utilise Omnilingual et Meta MMS. ByT5, le corpus et les règles
conservent leur rôle dans la traduction. La révision contrôlée utilise le
fournisseur actif. La génération d’illustrations, de vidéos ou de musique
conserve ses services spécialisés : Flash-Lite n’est pas un générateur d’images.

## Vérification

La CI **Validate FITILA AI providers** vérifie les points d’entrée et teste
les deux fournisseurs, la clé unique de chacun, les contrats texte/vision/audio,
le streaming, la confidentialité des clés, les erreurs de quota, les droits
d’administration et les activations concurrentes. Les tests Chromium couvrent
le panneau à 375 et 1280 pixels, la persistance après rechargement, l’absence
de clé et une activation refusée.

Déployer les fonctions qui importent `aiFetch` avec leurs dépendances relatives,
dont `ai-provider.ts` et `mistral.ts`. Déployer aussi `ai-provider-settings` avec
`verify_jwt = false` : son contrôle Auth et de rôle est effectué dans la fonction
pour prendre en charge les clés publiables. Les autres paramètres JWT sont
conservés.

Les tests simulés prouvent les contrats et les protections, pas la qualité
linguistique des modèles. Une clé Gemini valide est nécessaire au test réel et
à son activation. Les correspondances attestées ne constituent pas une
certification de précision/naturalité générale en Baatɔnum.

Références consultées le 15 octobre 2026 :
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/deprecations
- https://ai.google.dev/gemini-api/docs/openai
- https://ai.google.dev/gemini-api/docs/audio
