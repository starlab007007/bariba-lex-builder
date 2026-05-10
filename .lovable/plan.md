# Plan de correction du clavier Bariba sur Android

## Objectif
Rendre le clavier Bariba Fitila activable, sélectionnable et utilisable après installation de l’APK, puis confirmer que la cause du bug est bien éliminée.

## Diagnostic déjà confirmé
- Le projet contient plusieurs copies du code natif Android (`android/`, `android-native/`, `bariba-lex-builder/android/`, `bariba-lex-builder/android-native/`).
- Le script de build copie les fichiers depuis `android-native/` vers `android/app/src/main/...` juste avant `cap sync` et la génération de l’APK.
- Donc, même si `android/app/src/main/AndroidManifest.xml` a été corrigé, un build peut réinjecter une version native plus ancienne si `android-native/` ou le script restent divergents.
- L’APK fourni contient `keyboard_bariba.xml`, mais l’inspection du paquet ne montre pas la signature attendue du correctif du service clavier. Cela indique fortement que l’APK installé n’a pas été généré avec la bonne version finale du clavier.
- La cause la plus probable du crash reste l’initialisation du clavier dans un contexte `InputMethodService` avec une config native non homogène entre les différentes copies du projet.

## Ce que je vais faire

### 1. Unifier la vraie source native du clavier
- Choisir une seule source de vérité pour le clavier Android natif.
- Aligner les 4 emplacements concernés pour éviter qu’un ancien fichier soit recopié pendant le build.
- Corriger la divergence entre les copies `android-native` et `android/app/src/main`.

### 2. Sécuriser le service IME
- Vérifier et corriger définitivement la déclaration du service clavier dans le manifest natif réellement utilisé au build.
- Garantir que le service IME utilise un thème compatible avec `InputMethodService`.
- Vérifier que le layout du clavier n’utilise pas de composants susceptibles de provoquer une inflation incompatible dans le contexte IME.

### 3. Durcir l’implémentation du clavier
- Renforcer `BaribaInputMethodService.kt` pour éviter tout crash lors de l’ouverture, de la sélection du clavier et de la frappe.
- Ajouter des garde-fous autour de `currentInputConnection`, des touches spéciales, suppression, entrée, suggestions et fallback d’affichage.
- Vérifier que les caractères Bariba spéciaux sont bien injectés dans les champs texte Android.

### 4. Corriger le pipeline de build APK
- Mettre à jour `install-native-keyboard.sh` pour qu’il ne réintroduise jamais une version incomplète du service IME.
- Vérifier que le script de génération APK reconstruit toujours depuis les fichiers corrigés.
- Éviter toute régénération partielle qui laisse un manifest ou un service obsolète.

### 5. Validation technique complète
- Vérifier statiquement les fichiers natifs finaux après synchronisation.
- Contrôler que le manifest final, le layout final et le service final sont cohérents.
- Confirmer que la sélection du clavier, l’affichage des touches et la saisie ne reposent pas sur une copie périmée du code.

### 6. Résultat attendu
- Le clavier Bariba pourra être activé dans Android.
- Il pourra être sélectionné sans faire planter l’application.
- Il pourra être utilisé dans un champ de texte avec les touches standard et les caractères Bariba.
- Le prochain APK généré sera prêt pour un test réel sur appareil.

## Détails techniques
- Fichiers à traiter en priorité :
  - `android-native/java/com/fitila/bariba/BaribaInputMethodService.kt`
  - `android-native/res/layout/keyboard_bariba.xml`
  - `android/app/src/main/AndroidManifest.xml`
  - `scripts/install-native-keyboard.sh`
  - duplicatas équivalents dans `bariba-lex-builder/...`
- Point critique identifié : le build peut écraser des corrections locales avec la copie depuis `android-native/`.
- Vérification APK déjà faite : l’APK joint ressemble à un build non totalement aligné avec les correctifs présents dans l’arbre courant.

## Livrable
- Correctif du clavier Android natif.
- Pipeline APK fiabilisé.
- Validation finale claire avec la cause exacte du bug et la solution appliquée.