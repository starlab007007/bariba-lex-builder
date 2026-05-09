## Diagnostic — Crash quand on sélectionne le clavier Bariba

### APK décompilé (fitila2.apk)
- Manifest, `BaribaInputMethodService`, `res/xml/method.xml`, `res/layout/keyboard_bariba.xml`, drawable et style `BaribaKey` sont **bien présents** dans l'APK installé.
- `meta-data android:name="android.view.im"` est correct.
- Le crash n'est donc **pas** un problème de packaging/ressources manquantes.

### Cause racine identifiée
Le `<service>` IME hérite du thème de l'application : `Theme.AppCompat.Light.DarkActionBar`. AppCompat installe alors `AppCompatViewInflater` qui transforme chaque `<Button>` en `AppCompatButton` au moment de l'inflation. `AppCompatButton` exige un contexte avec un `AppCompatDelegate` (Activity AppCompat) — un `InputMethodService` n'en fournit pas. Résultat: `IllegalStateException` (ou `NullPointerException` côté Tint/Theme) au moment où le système Android instancie la vue du clavier après sa sélection comme méthode de saisie. C'est exactement le scénario "le clavier est activé, on le choisit, l'app crashe".

Indices supplémentaires:
- Dans `BaribaInputMethodService.kt`, l'exception est attrapée en surface, mais l'inflateur AppCompat plante avant `setupKeys`, parfois à un niveau non-rattrapable (création de fenêtre IME).
- Le `<Button>` du layout n'est pas qualifié, donc forcément intercepté par AppCompat.

### Cause racine — Guide non visible sur l'APK
- `AppTourProvider` est monté **uniquement dans `FitilaApp.tsx`**, après l'authentification téléphone. Sur un APK fraîchement installé, l'utilisateur démarre sur `/auth` et n'atteint jamais le provider tant qu'il n'est pas connecté → le guide ne s'affiche pas.
- En WebView Capacitor, `localStorage` est partagé avec celui du dev. Si la clé `fitila_tour_done` a été posée sur le web, le guide ne se relance pas dans l'APK installé.
- `TourSpotlight` calcule `tooltipStyle.top = below` sans clamp — sur petits écrans la bulle peut sortir, et la card fullscreen `inset-4` peut chevaucher la status bar (pas de safe-area).

---

## Plan de correction

### 1. Corriger le crash du clavier (priorité 1)
**Fichier:** `android/app/src/main/AndroidManifest.xml` (et le miroir `bariba-lex-builder/android/.../AndroidManifest.xml`)

Ajouter un thème IME natif au service :
```xml
<service
    android:name="com.fitila.bariba.BaribaInputMethodService"
    android:label="Clavier Bariba Fitila"
    android:permission="android.permission.BIND_INPUT_METHOD"
    android:theme="@android:style/Theme.DeviceDefault.InputMethod"
    android:exported="true">
```
Cela isole l'IME de `Theme.AppCompat` et évite l'AppCompatViewInflater. Le clavier ne crashera plus à la sélection.

**Renforcement complémentaire** (`keyboard_bariba.xml` dans `android/app/src/main/res/layout/` + `android-native/res/layout/`) :
- Remplacer `<Button …>` par `<android.widget.Button …>` pour empêcher toute substitution si une autre lib hookait l'inflateur.
- Garder `try/catch` existant + log `BaribaKeyboard` pour diagnostic.

### 2. Rendre le guide visible dans l'app installée
**`src/pages/Auth.tsx` ou racine `App.tsx`** : déplacer `AppTourProvider` au-dessus du routeur (ou le monter aussi dans la couche post-login mais avec déclenchement après mount). Solution la plus simple : laisser dans `FitilaApp` mais **forcer un reset** de la clé de tour sur première installation native via une `app_install_id` :

Dans `AppTourProvider.tsx` :
```ts
const installKey = 'fitila_install_id';
useEffect(() => {
  const id = localStorage.getItem(installKey);
  if (!id) {
    localStorage.removeItem(TOUR_STORAGE_KEY); // reset on fresh install
    localStorage.setItem(installKey, crypto.randomUUID());
    setIsActive(true);
    setShowLangPicker(true);
  }
}, []);
```

Cela garantit que chaque APK fraîchement installé démarre le guide une fois, indépendamment du localStorage hérité.

Ajouter aussi le déclenchement du guide **après login réussi** : une fois redirigé vers `/fitila/social`, le provider se monte et l'effet ci-dessus prend la main.

### 3. Responsive — Web + APK
**`TourSpotlight.tsx`** :
- Clamper la position de la bulle dans la viewport :
  ```ts
  const maxTop = window.innerHeight - 240 - safeBottom;
  tooltipStyle.top = Math.min(below, maxTop);
  ```
- Ajouter `padding: env(safe-area-inset-top) env(safe-area-inset-bottom)` au conteneur `fixed inset-0`.
- Pour `isFullscreen`, remplacer `inset-4` par classes responsive : `inset-x-3 inset-y-[max(1rem,env(safe-area-inset-top))]` et image `max-h-[30vh] sm:max-h-[40vh]`.
- Sur la carte, `max-w-sm` → `max-w-[min(92vw,420px)]`.
- Lecture vocale : ajouter fallback Capacitor TTS si `window.speechSynthesis` indispo (cas WebView Android < 14).

**Language picker** : déjà `max-w-xs w-[90vw]`, OK. Ajouter `max-h-[90vh] overflow-y-auto`.

### 4. Bouton "Revoir le guide"
Dans le menu latéral existant de `FitilaApp.tsx`, vérifier que le bouton appelle bien :
```ts
localStorage.removeItem('fitila_tour_done');
window.location.reload();
```
(déjà en place selon contexte; juste vérifier sur APK).

### 5. Vérifications post-build
1. `npx cap sync android` puis `./gradlew assembleDebug`.
2. Installer, activer "Clavier Bariba" dans Paramètres → Langues → Clavier virtuel.
3. Le sélectionner via le sélecteur d'IME → ne doit plus crasher, le clavier doit apparaître.
4. Réinstaller l'APK propre → le guide doit démarrer automatiquement après login, avec bulles bien positionnées sur les éléments `data-tour`.

---

## Fichiers modifiés
- `android/app/src/main/AndroidManifest.xml` (ajout `android:theme` au service IME)
- `bariba-lex-builder/android/app/src/main/AndroidManifest.xml` (idem)
- `android/app/src/main/res/layout/keyboard_bariba.xml` + `android-native/res/layout/keyboard_bariba.xml` (Buttons qualifiés)
- `src/components/onboarding/AppTourProvider.tsx` (reset sur fresh install)
- `src/components/onboarding/TourSpotlight.tsx` (clamp viewport + safe-area)

Aucune modification de la logique métier ni du backend.
