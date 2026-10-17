# DUNYA hybride — contrat d'exécution (FITILA 1.8.22+33)

## Moteurs vocaux retenus
- **Reconnaissance** : Meta Omnilingual ASR. Sur Internet, endpoint `dunya-voice-turn` (moteur `meta-asr-300m`). Sans Internet, pack `dunya-voice-core` et sherpa-onnx `OfflineOmnilingualAsrCtcModelConfig`.
- **Parole en Baatɔnum** : **Meta MMS-TTS Baatɔnum** (`facebook/mms-tts-bba`). En ligne, le serveur retourne le WAV MMS ; hors ligne, le pack MMS/VITS est exécuté localement avec sherpa-onnx.
- **Parole française** : TTS du système ou pack de secours français.
- **Important :** `facebook/mms-tts-bba` est sous licence **CC BY-NC 4.0**, examiner le droit de redistribution/usage commercial avant une publication à vocation commerciale.

## Choix d'exécution
| Choix | Texte Flutter | Voix Flutter | BYT5 |
|---|---|---|---|
| Auto (défaut) | `fitila-ia-chat` en ligne, Gemma installé en repli, outils déterministes sinon | Omnilingual/MMS serveur ; si erreur et pack installé, voie vocale locale | Mémoire exacte ; local/serveur selon disponibilité |
| En ligne | `fitila-ia-chat` sans modèle à télécharger | Omnilingual/MMS côté serveur | API FITILA ; aucun téléchargement |
| Hors ligne | Gemma déjà installé ou outils déterministes | Omnilingual/MMS local **si leurs packs sont installés** | Mémoire locale + ByT5 local **si pack exporté et installé** |

**Confidentialité :** hors ligne ne doit jamais invoquer `cloudBrain` ni `DunyaTranslator.online`. En ligne et Auto, les demandes sont traitées à distance ; les conversations privées ne doivent pas être téléversées silencieusement après une bascule forcée en hors ligne.

## Packs séparés
- `gemma-4-e2b` : fichier LiteRT-LM ~2,59 Go, optionnel, SHA-256 dans `dunya_brain.dart`.
- `dunya-voice-core` : Meta Omnilingual ASR et MMS-TTS Baatɔnum ; modèle(s), tokens, voix.
- `dunya-voice-fr` : voix française de secours optionnelle.
- `dunya-translate-byt5` : `byt5/encoder.onnx`, `byt5/decoder.onnx`, `byt5/config.json`, manifest et SHA-256 par fichier.

Le même pack ByT5 doit pouvoir être installé depuis Wi-Fi, carte SD ou fichier ZIP `dunya-pack/1` non compressé. **Un code de chargement n'est pas un modèle**. Tant que les vrais poids finetunés n'ont pas été exportés et publiés, l'option reste non disponible ; la mémoire et l'API en ligne continuent à fonctionner.

## Procédure pour ByT5 embarqué (à exécuter avec le vrai checkpoint)
1. Identifier la révision exacte du checkpoint FR–Baatɔnum, config, direction et jeu de référence.
2. Évaluer ce checkpoint **avant** export par `scripts/dunya_translate/eval_translation.py --backend hf --model <checkpoint>`.
3. Exporter : `python scripts/dunya_translate/export_mobile_onnx.py --model <checkpoint> --out dist/dunya-byt5 --quantize-int8`.
4. Exécuter des inférences FR→BA et BA→FR sur ONNX **avant** toute publication ; comparer avec les références après quantification.
5. Contrôler RAM, stockage, latence médiane et P95 sur Android 3/4/6/8 Go de RAM. En cas de résultats faibles, ne pas publier.
6. Publier `dunya-translate-byt5-v1.zip` et `dunya-translate-byt5-v1.manifest.json` sur `https://fitila.bj/dunya-packs/v1/`, après restauration de l'accès VPS/CDN.
7. Vérifier le téléchargement sur vrai téléphone, SHA-256, installation hors ligne, puis un second test téléphone **mode avion**.
8. Finaliser l'usage partagé de l'instance modèle par le Traducteur, DUNYA et le clavier natif, sans doubler le stockage ni allonger la latence de saisie du clavier.

### Limites à ne pas masquer
- Web PC/mobile : sans Internet, **recherche documentaire locale**, pas de LLM/ASR/TTS local téléchargé. Les navigateurs ne sont pas équivalents à Android.
- Le serveur peut être marqué `ACTIVE` sans que son modèle amont soit disponible à chaque requête.
- Le port SSH 22 du VPS a expiré sur `Deploy React App` (runs 38973479535 et 38964175146). Ne jamais annoncer Web en production avant restauration SSH et succès du déploiement.
- Le canal ONNX Android utilise un décodeur sans cache : premier prototype CPU, pas de garantie de performance/qualité sans tests d'appareil et corpus d'or.
- Le canal ByT5 est Android pour l'instant : le portage iOS est un lot distinct.

## Validation avant publication
- Flutter analyze, tests Flutter, tests natifs Android, test réel sur émulateur/physique.
- Simulation perte réseau et refus de service dans Auto, En ligne, Hors ligne ; vérifier absence d'envoi en mode Hors ligne.
- Web PC + Web mobile npm build, design et contexte de langue.
- Avant toute annonce de disponibilité hors ligne complète, couper Wi-Fi et données mobiles et effectuer **voix Baatɔnum → Omnilingual → ByT5 local → MMS-TTS Baatɔnum**.
