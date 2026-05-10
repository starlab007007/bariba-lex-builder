# Déploiement et mise à jour du clavier Bariba Fitila

Ce document décrit la **seule procédure officielle** pour pousser un correctif
natif (clavier IME) jusqu’à un APK installé et fonctionnel.

## 0. Source de vérité

- Repo officiel = dossier racine `bariba-lex-builder` (celui poussé sur Git).
- Le dossier root du projet contient une copie miroir utilisée par certains
  builds — **ne pas builder depuis deux endroits différents**.
- Toujours vérifier le commit Git avant de builder :
  ```bash
  git log -1 --oneline
  ```
- Le service IME contient un `BUILD_TAG` (voir
  `android-native/java/com/fitila/bariba/BaribaInputMethodService.kt`).
  Ce tag doit apparaître dans `adb logcat` après installation. Sinon,
  l’APK installé n’est PAS la dernière version.

---

## 1. Mise à jour sur le VPS

```bash
# 1. Aller dans le repo officiel
cd /chemin/vers/bariba-lex-builder

# 2. Vérifier la branche
git status
git branch --show-current

# 3. Tirer la dernière version
git fetch --all
git pull

# 4. Confirmer le commit
git log -1 --oneline

# 5. Nettoyer les artefacts précédents
rm -rf dist node_modules/.vite
rm -rf android/app/build android/build

# 6. Réinstaller les dépendances (Node 22 requis)
nvm use 22 || true
npm install --legacy-peer-deps

# 7. Build web
npm run build

# 8. Réinjecter le clavier natif (idempotent)
bash scripts/install-native-keyboard.sh

# 9. Synchroniser Capacitor
npx cap sync android

# 10. Vérifier que le manifest contient bien le thème IME
grep -A1 "BaribaInputMethodService" android/app/src/main/AndroidManifest.xml \
  | grep "Theme.DeviceDefault.InputMethod" \
  && echo "OK theme IME" || (echo "KO: theme IME manquant" && exit 1)

# 11. Vérifier que le BUILD_TAG est bien présent dans le source utilisé
grep BUILD_TAG android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.kt

# 12. Build APK
bash scripts/build-release-apk.sh

# 13. Archiver l’APK avec date + hash commit
COMMIT=$(git log -1 --format=%h)
STAMP=$(date +%Y%m%d-%H%M)
cp apk-output/fitila-bariba-release-*.apk \
   apk-output/fitila-bariba-${STAMP}-${COMMIT}.apk
ls -lh apk-output/
```

Distribuer **uniquement** ce fichier `fitila-bariba-${STAMP}-${COMMIT}.apk`
pour éviter toute confusion avec un ancien APK.

---

## 2. Mise à jour locale via Android Studio

1. Ouvrir Android Studio sur le **dossier officiel** (`bariba-lex-builder`).
2. Terminal Android Studio :
   ```bash
   git pull
   git log -1 --oneline
   npm install --legacy-peer-deps
   npm run build
   bash scripts/install-native-keyboard.sh
   npx cap sync android
   ```
3. Dans Android Studio :
   - **Build → Clean Project**
   - **Build → Rebuild Project**
   - Si rien ne change : **File → Invalidate Caches / Restart…**
4. Sur le téléphone, **désinstaller** l’ancienne app Fitila :
   - Paramètres → Applications → Fitila Bariba → Désinstaller
   - Et désactiver l’ancien clavier dans : Paramètres → Langue et saisie
     → Claviers à l’écran → Gérer les claviers.
5. **Run** depuis Android Studio (téléphone branché en USB, débogage activé)
   ou installer l’APK fraîchement signé :
   ```bash
   adb install -r apk-output/fitila-bariba-<date>-<commit>.apk
   ```

---

## 3. Activer et tester le clavier

1. Téléphone : Paramètres → Système → **Langues et saisie** → Claviers à
   l’écran → **Gérer les claviers** → activer **Clavier Bariba Fitila**.
2. Ouvrir n’importe quelle app avec un champ texte (Messages, Notes…).
3. Appuyer sur l’icône clavier en bas à droite → choisir **Clavier Bariba
   Fitila**.
4. Le clavier doit s’afficher sans crash.

---

## 4. Vérifier que l’APK installé est bien le dernier

Sur la machine connectée au téléphone :

```bash
# Démarrer logcat AVANT de sélectionner le clavier
adb logcat -c
adb logcat -s BaribaKeyboard:I AndroidRuntime:E
```

Puis sélectionner le clavier Bariba sur le téléphone. Tu dois voir une ligne
du type :

```
I BaribaKeyboard: onCreateInputView BUILD_TAG=fitila-ime-2026-05-10-safeInflater-v3 package=app.lovable.a8b67aa7de064bed97db29852f4f01ed
```

- Si `BUILD_TAG` n’apparaît **pas** → l’APK installé est ancien.
  Désinstaller, réinstaller le bon APK.
- Si `FATAL EXCEPTION` apparaît → copier la stacktrace complète et la
  partager pour diagnostic ciblé.

---

## 5. Checklist “prêt à déployer”

- [ ] `git log -1` affiche bien le dernier commit attendu.
- [ ] `AndroidManifest.xml` contient `Theme.DeviceDefault.InputMethod` sur le
      service IME.
- [ ] Le `BUILD_TAG` est présent dans `BaribaInputMethodService.kt`.
- [ ] `npx cap sync android` exécuté sans erreur.
- [ ] `./gradlew assembleRelease` exécuté sans erreur.
- [ ] APK archivé avec date + hash commit.
- [ ] Test physique : clavier activable, sélectionnable, sans crash.
- [ ] `adb logcat` montre bien le `BUILD_TAG` attendu.

Tant que toutes les cases ne sont pas cochées, **ne pas distribuer l’APK**.