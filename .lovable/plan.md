## Cause racine confirmée

Le diagnostic est exact : `BaribaInputMethodService` est **absent du DEX**, d'où le `ClassNotFoundException` qui crash le clavier à l'activation.

**Pourquoi la classe est absente** : le fichier service est en **Kotlin** (`BaribaInputMethodService.kt`), mais le projet Android Capacitor **n'a aucun plugin Kotlin configuré** :

- `android/build.gradle` (racine) : pas de `classpath kotlin-gradle-plugin`
- `android/app/build.gradle` : pas de `apply plugin: 'kotlin-android'`, pas de `kotlin-stdlib`

Résultat : Gradle compile uniquement les `.java` (donc `BaribaKeyboardPlugin.java` ✅), et ignore silencieusement le `.kt`. Le service déclaré au Manifest n'existe donc pas dans l'APK → crash à 100% reproductible.

Le `safeInflater`, le thème, le XML, etc. ne sont pas en cause — la classe n'est même pas chargée.

## Solution recommandée : convertir le service en Java

Plutôt qu'ajouter toute la toolchain Kotlin (plugin Gradle + stdlib + ~1.5 Mo dans l'APK + risque de conflit de versions avec AGP 8.13), on convertit `BaribaInputMethodService.kt` → `BaribaInputMethodService.java`. C'est :

- minimal (zéro nouvelle dépendance),
- compatible immédiatement avec la config Capacitor existante,
- aligné avec `BaribaKeyboardPlugin.java` (même langage),
- élimine définitivement la classe d'erreurs « .kt non compilé ».

(Alternative possible si tu préfères garder Kotlin : ajouter le plugin Kotlin partout — je peux le faire à la place, dis-le moi.)

## Plan

### 1. Convertir le service IME en Java

Pour chacun des 4 emplacements suivants :
- `android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.kt`
- `android-native/java/com/fitila/bariba/BaribaInputMethodService.kt`
- `bariba-lex-builder/android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.kt`
- `bariba-lex-builder/android-native/java/com/fitila/bariba/BaribaInputMethodService.kt`

→ Supprimer le `.kt` et créer `BaribaInputMethodService.java` équivalent, en gardant :
- construction **programmatique** (LinearLayout + TextView, pas d'inflation XML, pas de `Button` framework),
- `ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault)`,
- `try/catch` autour de `onCreateInputView` + vue fallback,
- logs `BaribaIME` sur `onCreate / onBindInput / onCreateInputView / onStartInput`,
- nouveau `BUILD_TAG = "fitila-ime-2026-05-12-java-v5"`,
- aucune dépendance à AppCompat / Kotlin / androidx.

### 2. Mettre à jour `scripts/install-native-keyboard.sh`

Remplacer la copie du `.kt` par la copie du `.java` (dans les 2 copies du script : racine + `bariba-lex-builder/`).

### 3. Mettre à jour `scripts/verify-apk.sh`

Mettre à jour `EXPECTED_TAG` vers `fitila-ime-2026-05-12-java-v5` (dans les 2 copies).

### 4. Vérification post-build

Documenter dans `DEPLOY_KEYBOARD.md` la commande de contrôle :

```
unzip -p apk-output/*.apk classes*.dex | strings | grep BaribaInputMethodService
unzip -p apk-output/*.apk classes*.dex | strings | grep fitila-ime-2026-05-12-java-v5
```

Si les deux apparaissent → la correction est embarquée, le crash disparaît.

### Étapes côté utilisateur après le push

1. Le workflow GitHub Actions (déjà patché précédemment avec `git reset --hard` + `git clean -fd`) doit passer sans le blocage `local changes would be overwritten`.
2. Sur VPS rien à faire de spécial — le workflow déploie le web. L'APK se rebuild via `bash scripts/build-release-apk.sh` (local Android Studio ou CI APK).
3. **Désinstaller** l'ancienne app du téléphone, installer le nouveau `.apk`, réactiver « Clavier Bariba Fitila » dans Paramètres → Langue et saisie. Le crash doit disparaître.

## Détails techniques (référence)

| Élément | Avant (KO) | Après (OK) |
|---|---|---|
| Langage service | Kotlin `.kt` | Java `.java` |
| Plugin Gradle Kotlin | Absent | Toujours absent (inutile) |
| Présence dans DEX | ❌ ClassNotFoundException | ✅ Classe chargée |
| BUILD_TAG | `…safeInflater-v4` | `…java-v5` |
| UI | Programmatique | Programmatique (inchangé) |
| Thème | DeviceDefault.InputMethod | DeviceDefault.InputMethod (inchangé) |
| Manifest | Inchangé | Inchangé |
| Layouts XML | Présents mais non utilisés par le service | Idem (construction programmatique) |
