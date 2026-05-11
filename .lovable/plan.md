# Plan d’intervention

Je vais traiter les 5 prompts dans l’ordre, avec un audit natif Android focalisé sur le vrai point de crash: l’activation/sélection du service IME avant saisie.

## Point de départ déjà confirmé
- Le service IME est bien déclaré dans `android/app/src/main/AndroidManifest.xml` avec `android:theme="@android:style/Theme.DeviceDefault.InputMethod"`.
- Le build tag est présent dans `BaribaInputMethodService.kt`.
- Le crash survient au moment de l’activation/sélection du clavier, donc avant la logique de frappe normale.
- Les zones les plus suspectes à ce stade sont la création de vue IME, le thème réel du contexte d’inflation, les widgets `Button` dans un contexte IME OEM, et les plantages système hors du `try/catch` de `onCreateInputView()`.

## Étape 1 — Audit IME Android complet
Je vais produire un diagnostic senior-level centré sur :
- lifecycle `InputMethodService`
- séquence exacte avant affichage (`bind`, création fenêtre IME, thème, inflation, attachement vue)
- causes possibles avant même `setupKeys()`
- compatibilité Android 12/13/14/15 et comportements OEM (Samsung/Xiaomi/Pixel)
- causes système spécifiques IME: rejet du thème, erreur d’inflation, crash pendant `InputMethodManagerService`, process kill, ressources non résolues, incompatibilités framework

### Résultat attendu
- causes probables classées par probabilité
- lignes exactes suspectes
- correctifs exacts à appliquer
- distinction claire entre crash applicatif, crash service IME, et kill système

## Étape 2 — Audit expert du fichier Kotlin
Je vais analyser ligne par ligne `android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.kt` avec focus sur :
- `safeInflater()`
- `ContextThemeWrapper`
- `inflate(layoutId, null)`
- `resources.getIdentifier()`
- `setupKeys()`
- listeners `Button`
- usage de `currentInputConnection`
- `currentInputEditorInfo`
- `suggestionsBar`
- fallback view
- `try/catch Throwable`

### Ce que je vais produire
- ce qui est sûr
- ce qui est risqué
- ce qui peut casser seulement sur certains téléphones
- ce qui peut provoquer un `AndroidRuntime` fatal
- ce qui peut tuer le process IME avant affichage
- une version Kotlin “production-grade stable” sans patterns fragiles

## Étape 3 — Audit XML/layout/style IME
Je vais auditer :
- `android/app/src/main/res/layout/keyboard_bariba.xml`
- `android/app/src/main/res/values/styles_keyboard.xml`
- `android/app/src/main/res/drawable/key_background.xml`

### Vérifications prévues
- erreurs XML silencieuses
- problèmes de mesure/layout dans un conteneur IME
- usage de `Button` framework dans un clavier système
- `layout_weight` + `0dp` + `match_parent`
- backgrounds/custom drawables potentiellement sensibles sur OEM
- tailles fixes pouvant casser sur certains densités/hauteurs IME
- attributs compatibles ou fragiles sur Android 13/14/15

### Résultat attendu
- toutes les lignes suspectes
- corrections exactes
- version XML robuste et stable en production

## Étape 4 — Procédure adb/logcat ultra approfondie
Je vais préparer une procédure de debug Android Studio professionnelle pour capturer le vrai crash IME, avec :
- commandes `adb logcat` exactes
- filtres pour `AndroidRuntime`, `InputMethodManager`, `InputMethodManagerService`, `WindowManager`, `ActivityManager`, `system_server`, `BaribaKeyboard`
- commandes `adb shell ime`, `adb shell dumpsys input_method`, `adb shell dumpsys activity services`, `adb shell am crash`, `adb bugreport` si nécessaire
- méthode Android Studio Logcat pour suivre uniquement le process IME
- stratégie pour détecter crash avant affichage, ANR, binder failure, inflation failure, resource failure, process kill bas niveau

### Livrable
- une checklist de capture reproductible
- les logs précis à me renvoyer si le crash persiste

## Étape 5 — Refactor complet production-grade
Après l’audit, je proposerai un refactor complet et stable du clavier IME, en touchant uniquement la couche native Android concernée.

### Changements prévus
- durcir `BaribaInputMethodService` contre les crashes de création de vue
- supprimer les points fragiles d’inflation dynamique et de lookup via `getIdentifier()` au profit de références directes sûres
- utiliser un contexte/thème IME cohérent de bout en bout
- rendre la vue fallback réellement sûre même si l’inflation XML échoue
- réduire les dépendances implicites au thème AppCompat
- neutraliser les patterns fragiles liés aux `Button` et aux listeners au démarrage
- améliorer les logs natifs au niveau lifecycle IME
- standardiser la source Android native officielle pour éviter qu’un vieux dossier soit packagé par erreur

### Fichiers visés
- `android-native/java/com/fitila/bariba/BaribaInputMethodService.kt`
- `android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.kt`
- `android-native/res/layout/keyboard_bariba.xml`
- `android/app/src/main/res/layout/keyboard_bariba.xml`
- `android-native/res/values/styles_keyboard.xml`
- `android/app/src/main/res/values/styles_keyboard.xml`
- `android-native/res/drawable/key_background.xml`
- `android/app/src/main/res/drawable/key_background.xml`
- documentation de debug/déploiement si nécessaire

## Détails techniques
1. Remplacer les résolutions dynamiques `resources.getIdentifier()` par `R.layout`, `R.id`, `R.drawable`.
2. Revoir `safeInflater()` pour utiliser un thème IME système cohérent, sans AppCompat implicite.
3. Revoir `inflate(layoutId, null)` pour une inflation plus sûre dans un contexte IME.
4. Isoler la phase d’initialisation visuelle de la phase d’attachement des listeners.
5. Limiter l’usage d’API pouvant échouer silencieusement au moment critique d’attachement de la vue.
6. Réduire les risques OEM liés aux `Button` framework et aux styles trop agressifs.
7. Ajouter des logs structurés sur `onCreate`, `onBindInput`, `onStartInput`, `onStartInputView`, `onCreateInputView`, `onFinishInputView`, `onDestroy`.
8. Préparer une version compatible Android 10 à 15, sans dépendre d’AppCompat dans l’IME.

## Définition de terminé
Le travail sera considéré prêt quand j’aurai fourni :
- l’audit expert des causes probables classées
- l’analyse Kotlin détaillée
- l’analyse XML détaillée
- la procédure adb/logcat avancée
- le refactor complet Kotlin/XML proposé pour stabiliser l’IME en production