# FITILA — recette terrain hors connexion (Baatɔnum)

**Important :** un WAV produit par la CI ne suffit pas pour certifier la langue.

## Conditions
- Tester un APK signé (version identifiée, checksum) avec `bj.fitila.fitila_native`.
- Téléphones physiques Android avec 2, 3, 4 et 6 Go de RAM, architectures armv7/arm64.
- Générer et signer le pack MMS seul ; transférer sa version approuvée via câble/SD/Quick Share.
- Ne pas publier des candidats non certifiés : leurs manifestes indiquent `quality_certified=false`.

## Matrice de recette
1. Lancer FITILA sans connexion, sans aucun modèle : le dictionnaire et les leçons demeurent lisibles.
2. Importer `dunya-voice-bba-v1.zip` par le gestionnaire DUNYA, sans compte.
3. Redémarrer l'appareil, activer le mode avion, puis lancer le dictionnaire : la
   lecture MMS du mot et de la phrase fonctionne sans réseau.
4. Module Apprendre : lecture human-first (si fichier publié) ; sinon MMS ONNX ;
   vérifier qu'aucune requête réseau n'est émise.
5. Traducteur : une traduction déjà disponible dans le dictionnaire local
   doit pouvoir être écoutée, même sans ByT5.
6. DUNYA texte : synthèse de ses réponses locales ; l'ASR vocal n'est pas
   présenté comme installé lorsqu'on ne possède que le pack MMS.
7. Installer `dunya-asr-omni-v1.zip` par carte SD puis répéter le test de
   reconnaissance vocale sans Internet.
8. Tester coupure 30 % et 70 % du téléchargement, reprise HTTP 206,
   serveur ignorant Range (200), réponse 416, fichier modifié, ZIP endommagé,
   peu d'espace disponible, retrait et restauration de pack.
9. Mesurer cold-start, médiane/P95 génération WAV, pic RSS, batterie, stockage,
   volume et prononciation des lettres ɔ, ɛ, tons, noms et nombres.
10. Tester cinq locuteurs Baatɔnum au minimum, trois villages, trente textes
    distincts, cinq évaluations par texte ; enregistrer les réponses anonymisées
    dans le CSV du gate `quality_gate.py`.
11. Vérifier licence CC BY-NC 4.0 dans l'application et dans l'archive sans réseau.

## Collecte
`python tools/dunya_packs/quality_gate.py /chemin/evaluations.csv --report qa.json`

Le seuil indicatif de publication est : >=90 % de compréhension correcte,
note tonale >=4/5 et naturalité >=4/5. Aucun résultat n'est prérempli.

## Déploiement
Ne marquer `tested=true` et `quality_certified=true` dans le sidecar de
publication que si la QA réelle, la licence et le déploiement HTTPS/CDN sont
tous vérifiés. Conserver les SHA-256 épinglés dans l'APK pour éviter les
substitutions de fichiers. Le ZIP historique reste compatible.
