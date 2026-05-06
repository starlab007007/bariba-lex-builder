
# Diagnostic et corrections pour l'APK Android

## Problème 1 : Permissions caméra et micro refusées

**Cause racine** : Les permissions `CAMERA` et `RECORD_AUDIO` ne sont pas déclarées dans `AndroidManifest.xml`. Sans ces déclarations, Android refuse systématiquement les demandes de permission à l'exécution, peu importe le code Capacitor ou `getUserMedia`.

**Solution** : Après `npx cap add android`, vous devez modifier manuellement le fichier `android/app/src/main/AndroidManifest.xml` sur votre machine locale :

```xml
<!-- Ajouter AVANT la balise <application> -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.INTERNET" />
```

De plus, je vais :
1. Installer `@capacitor/camera` comme dépendance du projet (si pas déjà présent)
2. Mettre à jour `capacitor.config.ts` pour déclarer les plugins Camera et AudioRecorder
3. Ajouter un script de post-sync qui rappelle les permissions à ajouter

**Note importante** : Les fichiers `src/utils/camera.ts` et `src/utils/audioRecorder.ts` que vous créez manuellement ne sont pas nécessaires. L'app utilise déjà `navigator.mediaDevices.getUserMedia` dans `src/utils/capacitorPermissions.ts` et `src/components/tamtam/PhotoTranslator.tsx`. Ces API web fonctionnent dans le WebView Capacitor **à condition que** les permissions soient déclarées dans le manifest.

---

## Problème 2 : Clavier flottant Bariba absent dans l'APK

**Cause** : Le clavier Bariba est un composant **web** (`FloatingBaribaKeyboard`) qui s'affiche dans l'app elle-même (page `/fitila/keyboard`). Ce n'est **pas** un clavier système Android (InputMethodService). Il fonctionne uniquement à l'intérieur de l'application.

**Ce qui sera fait** :
- Vérifier que la page du clavier est accessible depuis le menu principal
- S'assurer que le composant est bien chargé dans le build

**Limitation** : Pour avoir un vrai clavier système Android utilisable dans toutes les apps, il faudrait développer un module Android natif séparé (InputMethodService). Ce n'est pas faisable via Capacitor/Lovable — c'est un projet Android Studio dédié.

---

## Étapes complètes pour générer un APK fonctionnel

Côté Lovable, je vais :
1. M'assurer que `@capacitor/camera` est dans les dépendances
2. Mettre à jour `capacitor.config.ts` avec les plugins nécessaires

Sur votre machine locale, après `git pull` :
```bash
cd bariba-lex-builder
nvm use 22
npm install
npm run build
npx cap sync android
```

Puis éditez `android/app/src/main/AndroidManifest.xml` pour ajouter les permissions ci-dessus, et enfin :
```bash
npx cap open android
# Build > Generate Signed APK dans Android Studio
```

---

## Détails techniques

| Fichier | Changement |
|---------|-----------|
| `package.json` | Ajouter `@capacitor/camera` si absent |
| `capacitor.config.ts` | Déclarer plugins Camera |
| `android/app/src/main/AndroidManifest.xml` | Permissions (action manuelle locale) |
