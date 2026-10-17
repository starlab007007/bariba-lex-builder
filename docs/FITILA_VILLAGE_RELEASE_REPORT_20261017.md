# FITILA Villages — rapport de livraison contrôlée
Date : 17 octobre 2026. PR : https://github.com/starlab007007/bariba-lex-builder/pull/109

**Statut : candidat préproduction ; ne pas annoncer une version publique stable.**
Branche parent initiale : PR #107, fusionnée dans `main` le 17 octobre. La PR #109 cible désormais directement `main`.
Aucun redéploiement FITILA Web/Flutter/Supabase production dans ce lot.

## Travaux réalisés
| Lot | Code / preuve | État |
| --- | --- | --- |
| Audit ancien pack ONNX | `dunya-voice-core-v1.zip`, VITS et Omnilingual présents | validé par inspection et hash |
| Packs indépendants | Script `tools/dunya_packs/split_voice_core.py` | 114 306 539 / 366 721 784 octets ; CI verte |
| Synthèse CPU réelle | `tools/dunya_packs/smoke_tts.py` | trois WAV 16 kHz produits par sherpa |
| Flutter partagé | `core/offline_bba_voice.dart`, Apprendre/Dictionnaire/Traducteur/DUNYA | code intégré, Flutter analyzer/tests ciblés verts |
| Mode village | ZIP local/SD, HTTP Range testé avec 206/200/416 et échecs, sauvegarde de l'ancienne version, contrôle d'espace Android | intégré ; essais réseau/téléphone à faire |
| Web faible réseau | Workbox StaleWhileRevalidate sur lexique/Apprendre/i18n **publics** | build PWA vert |
| Quantification INT8 | `tools/dunya_packs/quantize_candidate.py` | essai réel : réduction de 1,89 % (modèle expérimental non retenu) |
| Qualité Baatɔnum | `tools/dunya_packs/quality_gate.py` + tests des règles | aucune évaluation humaine fournie |
| APK final | workflow `flutter-build24-dunya-voice-apk.yml` | recette complète encore requise |
| Distribution publique | miroir `/dunya-packs/v1` et signature APK | bloquée tant qu'il manque QA réelle/validation de déploiement |

## Mesures vérifiées
- MMS : 114 306 539 octets ; SHA-256
  `6c047ac26f83f0f4a90cdfeb72615b0514afcd7cd7892d2a041e9074be5398bf`.
- ASR : 366 709 617 octets ; SHA-256
  `11dd459506f8b67ab407cb023bc60c8137078c5341242c38f591dfe4fd8f6ba7`.
- Sources : pack historiquement publié `dunya-voice-pack-v1`; extrait sans réécrire les poids.
- CPU runner : `A kua` 0,536 s de calcul pour 0,573 s WAV;
  `N kua weru` 0,548/0,716 s; `Bɛɛ ka weru` 0,429/0,896 s.
  Ces valeurs ne sont ni un benchmark Android ni une validation linguistique.
- CI : https://github.com/starlab007007/bariba-lex-builder/actions/runs/39020622279
  (packs/ONNX); https://github.com/starlab007007/bariba-lex-builder/actions/runs/39021642310
  (Flutter); https://github.com/starlab007007/bariba-lex-builder/actions/runs/39021795665 (PWA).

## Vérifications strictement requises avant fusion/promotion
1. CI Flutter/Android complète verte, APK ARMv7+ARM64 signé et test d'IME.
2. Vérifier **sur téléphone réel en mode avion** MMS seul dans Dictionnaire, Apprendre,
   Traducteur et DUNYA; ensuite ASR facultatif; mesures appareils 2/3/4/6 Go.
3. Fournir un corpus de prononciation validé et les évaluations anonymisées de
   locuteurs Baatɔnum ; seuils documentés dans `FITILA_VILLAGE_ANDROID_RECETTE.md`.
4. Confirmer l'utilisation non commerciale CC BY-NC 4.0 avec avis dans les archives
   et l'application. Ne pas présenter une voix synthétique comme une voix humaine validée.
5. Réviser les manifestes `tested`/`quality_certified` seulement après vraie QA,
   fixer SHA-256 de **l'archive finale** dans un APK signé; aucun manifeste ne peut
   s'auto-certifier.
6. Préparer la release des ZIP et la publication vers `fitila.bj`; corriger d'abord
   l'accès SSH VPS dont le dernier déploiement Web `main` avait échoué.
7. PR #107 est fusionnée. Fusionner PR #109 uniquement avec les contraintes fonctionnelles,
   juridiques, CI et sur appareils toutes respectées.

## Dernière recommandation ByT5
FITILA référence `zimesongbian/modele_byt5_bariba_expert_api_v03_improve`.
Le Hub le présente comme un **Space Gradio**, pas comme un modèle HF du même nom.
Le routeur/runtimes ByT5 Android ONNX dans PR #107 ne suffisent pas : pour mettre
ByT5 hors ligne il faut retrouver le **checkpoint finetuné réel**, la révision,
le tokenizer et le corpus de référence; exporter et mesurer FR↔Baatɔnum avant publication.
Aucun checkpoint n'est inventé ni publié artificiellement.

## Blocages sans possibilité de contournement par le seul code
- Tests de locuteurs natifs et téléphones physiques absents de cet environnement.
- Licence/usage commercial distinct si le modèle économique évolue.
- Accès SSH du VPS / publication CDN à rétablir ; CI système vocale historique
  distincte signale des échecs et doit être réexaminée.
- Modèle local ByT5 non attesté en l'absence de ses poids véritables.

## Analyse expérimentale INT8
La quantification CPU a ramené le poids ONNX de 114 303 014 à 112 143 811 octets (gain de 1,89 %). Le format reste lisible mais aucune qualité phonétique n'est certifiée. Ne pas substituer ce modèle expérimental aux poids de référence. Résultat : https://github.com/starlab007007/bariba-lex-builder/actions/runs/39022413633.

## Compléments de sûreté (17 octobre)
- PR #109 retargetée sur main après fusion #107.
- Les actifs ZIP MMS, ASR et historiques sont épinglés par SHA-256 dans Flutter.
- La reprise HTTP Range a des tests automatisés sur reprise 206, serveur répondant 200, 416, contenu corrompu, interruptions et réutilisation cache vérifié.
- La nouvelle archive ASR inclut désormais la licence Apache-2.0 intégrale et une notice de provenance (nouvelle empreinte ci-dessus).
- Les archives sont des candidats ; elles ne sont pas annoncées au public comme validées linguistiquement.
