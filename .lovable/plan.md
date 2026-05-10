# Plan pour éliminer le crash persistant du clavier Bariba Fitila

## Ce que j’ai constaté
- Le correctif de thème IME est bien présent dans le code source actuel :
  - `android/app/src/main/AndroidManifest.xml`
  - `android-native/.../BaribaInputMethodService.kt`
  - `scripts/install-native-keyboard.sh`
- Le service utilise déjà un `safeInflater()` avec un thème système non-AppCompat.
- Le vrai risque restant est **le décalage entre le code corrigé et l’APK réellement installé**.
- Le projet contient **plusieurs copies Android** (`android/`, `android-native/`, `bariba-lex-builder/android/`, `bariba-lex-builder/android-native/`). Si Android Studio, le VPS, ou le script de build pointe vers le mauvais dossier, le téléphone reçoit un ancien build.

## Pourquoi le crash peut encore arriver
1. **APK obsolète installé sur le téléphone** : le dernier correctif n’est pas dans l’APK que tu testes.
2. **Mauvais dossier construit** : tu peux lancer Android Studio sur un dossier différent de celui poussé sur Git.
3. **Build cache Gradle/Android Studio** : il réutilise des artefacts anciens.
4. **`npx cap sync` non rejoué après mise à jour web/native** : le code natif final n’est pas resynchronisé.
5. **Le téléphone garde une ancienne version de l’app/clavier** : l’IME déjà installé n’est pas remplacé proprement.
6. **Le crash réel n’est plus AppCompat mais une autre exception runtime** : sans `adb logcat`, on ne peut pas confirmer la nouvelle cause exacte.

## Ce que je propose d’implémenter
### 1) Verrouiller la source de vérité Android
- Déterminer et documenter **un seul dossier build officiel**.
- Empêcher les builds depuis un doublon non voulu.
- Vérifier que `scripts/build-release-apk.sh` et Android Studio utilisent le même projet.

### 2) Ajouter une preuve visible de version dans le natif
- Injecter un marqueur simple de build/version dans le service clavier et/ou dans l’app.
- Permettre de confirmer visuellement et via logs que l’APK installé contient bien le dernier correctif.

### 3) Durcir encore le service IME
- Ajouter davantage de logs natifs autour de :
  - `onCreateInputView()`
  - inflation du layout
  - clic sur touches
  - `currentInputConnection`
- Ajouter des garde-fous pour éviter qu’une exception silencieuse masque le vrai problème.

### 4) Fiabiliser le pipeline de mise à jour
- Renforcer les scripts pour que le flux soit toujours :
  `git pull` -> nettoyage -> `install-native-keyboard` -> `npx cap sync` -> build
- Éviter que le script réinjecte une version partielle ou qu’Android Studio compile des sources non synchronisées.

### 5) Préparer une procédure de validation locale reproductible
- Définir la séquence exacte pour tester sur téléphone :
  - désinstaller l’ancienne app
  - installer le nouvel APK
  - activer le clavier
  - le sélectionner
  - saisir du texte
  - capturer `adb logcat`
- Ajouter une checklist “prêt à tester / prêt à déployer”.

## Étapes VPS que je vais formaliser
1. Se placer dans le bon repo.
2. Vérifier la branche et le dernier commit.
3. `git pull`
4. Nettoyer les artefacts Android / web.
5. Réinstaller les dépendances si nécessaire.
6. Relancer la synchronisation Capacitor.
7. Rebuild APK depuis le script officiel.
8. Vérifier que l’APK généré contient bien le service IME attendu.
9. Archiver l’APK avec un nom versionné pour éviter toute confusion.

## Étapes Android Studio local que je vais formaliser
1. Ouvrir **le bon dossier projet**.
2. `Git Pull` dans Android Studio ou terminal.
3. Vérifier le hash du dernier commit.
4. Lancer `npx cap sync android` depuis le root correct.
5. Faire `Clean Project` / `Rebuild Project`.
6. Si besoin : `Invalidate Caches / Restart`.
7. Désinstaller l’ancienne app du téléphone.
8. Installer la nouvelle build.
9. Tester : Paramètres -> Langue et saisie -> activer -> sélectionner -> saisir.
10. En cas de crash : capturer `adb logcat` filtré sur `BaribaKeyboard` et `FATAL EXCEPTION`.

## Livrables
- Diagnostic consolidé sur la cause la plus probable du crash persistant.
- Pipeline de build/mise à jour rendu non ambigu.
- Checklist VPS.
- Checklist Android Studio/local.
- Procédure de validation finale du clavier avant déploiement.

## Détails techniques
```text
Source actuelle observée:
- Manifest IME: OK (Theme.DeviceDefault.InputMethod)
- Service IME: OK (safeInflater avec thème système)
- Script d’installation: OK côté copie + patch manifest

Risque principal restant:
- mauvaise cible de build
- cache local
- ancien APK encore installé
- crash runtime différent de l’AppCompat crash initial
```

## Résultat attendu
Après cette passe, tu auras :
- une seule procédure fiable pour mettre à jour sur VPS
- une seule procédure fiable pour prendre en compte les changements dans Android Studio
- un moyen sûr de prouver que la dernière version est bien celle installée
- la capacité d’identifier précisément le crash s’il persiste encore