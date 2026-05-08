
# Diagnostic du crash "Fitila Bariba s'arrête systématiquement"

## Problèmes identifiés

### 1. Duplicate `release` buildType dans `build.gradle` (CRITIQUE)
Le fichier `android/app/build.gradle` contient **deux blocs `release`** (lignes 38-47). Le second écrase le premier, supprimant la config de signature. Cela peut causer des erreurs de build ou de runtime imprévisibles.

### 2. Boutons manquants dans le layout (CRASH POTENTIEL)
Le code Kotlin (`BaribaInputMethodService.kt`, lignes 136-152) référence `key_question` et `key_exclaim` pour les touches `?` et `!`, mais ces boutons **n'existent pas** dans `keyboard_bariba.xml`. Bien que le code gère le cas `resId == 0`, l'absence de ces touches réduit la fonctionnalité.

### 3. WeightSum incohérent dans Row 4
Row 4 a `weightSum="12"` mais la somme réelle des poids est : 6×1 (spéciaux) + 4 (espace) + 1 (point) + 1 (virgule) = 12. C'est correct, mais il manque `?` et `!` qui étaient probablement prévus.

### 4. Touche Enter/Return manquante
Il n'y a pas de touche Entrée/Retour dans le clavier, ce qui est essentiel pour la saisie dans les champs de texte.

## Corrections à appliquer

### A. Corriger `build.gradle` — supprimer le bloc `release` dupliqué
Fusionner les deux blocs `release` en un seul.

### B. Ajouter les touches manquantes dans `keyboard_bariba.xml`
- Ajouter `key_question` (?) et `key_exclaim` (!) dans Row 4
- Ajouter une touche `key_enter` (Entrée/↵)
- Ajuster le `weightSum` en conséquence
- Réorganiser Row 4 en deux sous-rangées pour mieux distribuer les touches

### C. Renforcer la gestion d'erreurs dans `BaribaInputMethodService.kt`
- Ajouter un try-catch global autour de `onCreateInputView`
- S'assurer que `currentInputConnection` n'est jamais null avant utilisation
- Ajouter des logs pour faciliter le debug futur

### D. Ajouter les touches de ponctuation manquantes dans le code Kotlin
- S'assurer que `key_question`, `key_exclaim`, et `key_enter` sont bien câblés

## Fichiers modifiés
- `android/app/build.gradle`
- `android/app/src/main/res/layout/keyboard_bariba.xml`
- `android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.kt`
- `android-native/res/layout/keyboard_bariba.xml` (miroir)
- `android-native/java/com/fitila/bariba/BaribaInputMethodService.kt` (miroir)
