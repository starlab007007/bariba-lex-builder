# FITILA Villages — MMS-TTS Baatɔnum hors Internet

Statut : **packs candidats et recette terrain obligatoires avant publication**.

## Source réelle, sans recréer les poids
- FITILA fournit déjà le pack `dunya-voice-core-v1.zip` dans la release privée `dunya-voice-pack-v1`.
- Le modèle VITS/MMS est **déjà au format ONNX** dans `tts-bba/model.onnx`.
- Le programme `tools/dunya_packs/split_voice_core.py` extrait les octets inchangés vers
  `dunya-voice-bba-v1.zip` et `dunya-asr-omni-v1.zip`; l'ancien pack reste compatible.
- L'export PyTorch → ONNX n'est donc pas nécessaire pour ce lot. Pour réexporter
  un checkpoint, se référer à sherpa-onnx MMS, vérifier la révision, les phonèmes
  et conserver la qualité FP32 avant toute quantification.
- Aucune taille cible INT8 ni amélioration de la voix n'est revendiquée sans mesure.

## Accès en milieu rural
1. Téléchargement reprenable depuis FITILA (Wi-Fi occasionnel) des **packs distincts**.
2. Installation du ZIP depuis une carte SD, USB ou un transfert de téléphone à téléphone.
3. Usage en mode avion de MMS seul pour la lecture du dictionnaire/Apprendre.
4. ASR local, ByT5 local, Gemma local : packs optionnels et **indépendants**.
5. L'ancien `dunya-voice-core` garde sa priorité en repli si présent.

## Attribution / licence
`facebook/mms-tts-bba` : CC BY-NC 4.0, usage éducatif non commercial FITILA ;
ne pas intégrer à une offre commerciale sans autorisation. Conserver le modèle
d'origine, l'attribution, le lien de licence et l'indication de conversion.
Les notices du pack doivent accompagner la redistribution.
Les utilisateurs conservent les droits accordés par la licence source.

## Portes de recette avant publication
- [ ] Candidats ZIP générés par GitHub Actions ; checksums et source validés.
- [ ] ONNX TTS : produire WAV réel à partir de `A kua` et d'un corpus tonal;
      contrôler les phonèmes et la naturalité avec des locuteurs Baatɔnum.
- [ ] Démarrer app Android sans connexion, importer pack voix seul,
      prononcer mots + phrases sans ASR, puis ajouter ASR séparément.
- [ ] Android 2/3/4/6 Go : RAM, latence médiane/P95, autonomie et stockage.
- [ ] Reprise réseau à 30/70 %, refus HTTP Range, SHA erroné,
      manque d'espace, ZIP invalide, compatibilité anciens packs.
- [ ] Choix de licence, liens et crédits accessibles sans Internet.
- [ ] Publication officielle uniquement après contrôle juridique/qualité
      et succès de la livraison SSH/CDN. **Le workflow candidat ne publie pas.**
