# Benchmark réel FITILA — corpus vocal privé

Ce workflow complète le laboratoire expérimental existant. Il **ne certifie aucune métrique avant son exécution**.

## Inventaire Supabase vérifié le 14 octobre 2026

- `bariba_voice_recordings` : 15 enregistrements, 13 marqués `validated=true`.
- Les 13 enregistrements validés possèdent un `phrase_id` lié à `bariba_corpus_phrases.text_bariba`, référence textuelle disponible.
- Bucket `bariba-voice-corpus` : **privé**.
- Les formats source incluent WAV, WebM, MP4 : transcodage mono 16 kHz par FFmpeg.
- `model_performance` : aucune mesure WER/CER pour les modèles comparés dans ce protocole.

## Exécution autorisée

1. Faire confirmer les droits d'évaluation et le consentement à l'utilisation des voix validées.
2. Dans GitHub, créer l'environnement **`fitila-research`**, avec approbation obligatoire et restrictions des branches autorisées à utiliser les secrets.
3. Configurer **`FITILA_BENCHMARK_SERVICE_KEY`** dans cet environnement. C'est une clé serveur privilégiée : ne jamais la mettre dans le code ou les logs.
4. Actions → **FITILA Bariba voice research A-B inference** → Run workflow.
5. Le runner extrait le corpus dans `RUNNER_TEMP`, installe les moteurs, exécute Meta ASR, MMS-TTS et les références Supabase. Aucun fichier vocal ni transcription brute n'est téléversé en artefact.
6. Le résumé contient WER et CER agrégés + latences ASR, réussites et temps de génération TTS.

### Interprétation

- WER/CER mesurent les substitutions, insertions et suppressions sur les transcriptions contre les textes de référence. La normalisation Unicode NFC conserve les lettres et tons Bariba.
- MMS-TTS ne peut être évalué commercialement sans vérifier les restrictions CC BY-NC 4.0.
- L'intelligibilité, la naturalité et la prononciation demandent **une écoute humaine à l'aveugle**, pas un score calculé à partir du succès d'une requête.
- Les 13 paires forment un pilote et ne justifient pas de conclusion scientifique générale.
- Supabase Edge Function ACTIVE n'implique pas que Hugging Face réponde et fournit une sortie valide.
- Les temps réseau de Bariba STT/TTS et les temps locaux CPU des modèles Meta doivent être distingués.

### Préconditions non satisfaites automatiquement

Le présent agent ne peut ni lire les secrets GitHub ni vérifier le consentement des contributeurs. Le workflow exige donc une configuration explicite et un lancement manuel. Un essai avec sortie vide est marqué comme échec, jamais comme performance de zéro erreur.

### Vérifications des librairies

Le modèle Omnilingual CTC n'utilise pas de langue conditionnée ; la fonction `transcribe()` est appelée sans `lang`. Les échantillons de plus de 40 secondes doivent être exclus ou segmentés avec un protocole documenté avant leur utilisation.
