
# Clavier Bariba natif Android + Pont IPC React

## Vue d'ensemble

Création d'un clavier système Android natif (InputMethodService) intégré dans le même APK que l'app Fitila. Le clavier permet de taper en Bariba dans **toutes les apps** (WhatsApp, SMS, etc.). Un pont IPC via SharedPreferences + plugin Capacitor synchronise l'historique et les suggestions entre le clavier natif et l'app React.

## Fichiers à créer

### Fichiers Android natifs (13 fichiers)

Ces fichiers seront créés dans un dossier `android-native/` à la racine du projet. Le script d'installation les copiera au bon endroit après `npx cap add android`.

1. **`android-native/java/com/fitila/bariba/BaribaInputMethodService.kt`** — Service clavier complet : gestion des touches, historique (SharedPreferences "bariba_keyboard_data"), suggestions, shift/backspace/espace
2. **`android-native/java/com/fitila/bariba/BaribaKeyboardPlugin.java`** — Plugin Capacitor @CapacitorPlugin(name="BaribaKeyboard") : getHistory, getSuggestions, clearHistory, saveWord
3. **`android-native/res/layout/keyboard_bariba.xml`** — Layout AZERTY + rangée Bariba (ɔ ɛ ŋ ã ĩ ũ), barre de suggestions, fond sombre #1A1A2E
4. **`android-native/res/values/styles_keyboard.xml`** — Style BaribaKey (marge, taille, couleur blanche)
5. **`android-native/res/drawable/key_background.xml`** — Selector : pressed=#4A4E8C, default=#2D2D5E, corners 8dp
6. **`android-native/res/xml/method.xml`** — Déclaration IME avec subtype locale "bba"

### Fichiers React/TypeScript (4 fichiers)

7. **`src/hooks/useBaribaKeyboard.ts`** — Hook Capacitor registerPlugin : getHistory, getSuggestions, clearHistory, saveWord
8. **`src/hooks/useAdvancedPhonetics.ts`** — Suggestions phonétiques avancées avec normalisation Bariba→Latin et scoring
9. **`src/components/BaribaKeyboardCompanion.tsx`** — Panneau compagnon : suggestions enrichies, historique synchronisé, copie presse-papier
10. **`src/components/BaribaKeyboardActivationGuide.tsx`** — Guide d'activation 4 étapes avec deep link paramètres Android

### Scripts et config (1 fichier)

11. **`scripts/install-native-keyboard.sh`** — Script qui copie les fichiers android-native/ vers android/app/src/main/, patche AndroidManifest.xml (service IME + permissions), vérifie l'installation

## Fichiers à modifier

12. **`capacitor.config.ts`** — Vérifier appId cohérent, ajouter plugin BaribaKeyboard
13. **`src/pages/fitila/FloatingKeyboardPage.tsx`** — Ajouter BaribaKeyboardCompanion et lien vers BaribaKeyboardActivationGuide
14. **`scripts/patch-android-permissions.sh`** — Fusionner avec le nouveau script ou mettre à jour pour inclure la déclaration du service IME

## Architecture IPC

```text
+---------------------------+       SharedPreferences       +-------------------------+
|  BaribaInputMethodService |  ←→  "bariba_keyboard_data"  ←→  | BaribaKeyboardPlugin  |
|  (Clavier système Android)|       - history (JSONArray)       | (Plugin Capacitor)    |
|  - typeCharacter()        |       - suggestions (JSONArray)   | - getHistory()        |
|  - saveToHistory()        |       - lastWord (String)         | - getSuggestions()    |
|  - updateSuggestions()    |                                   | - saveWord()          |
+---------------------------+                                   +-------------------------+
                                                                          ↕
                                                                   registerPlugin()
                                                                          ↕
                                                               +-------------------------+
                                                               | useBaribaKeyboard.ts    |
                                                               | useAdvancedPhonetics.ts |
                                                               | BaribaKeyboardCompanion |
                                                               +-------------------------+
```

## Étapes d'installation pour l'utilisateur

Après implémentation, sur la machine locale :
```bash
git pull
nvm use 22
npm install
npm run build
npx cap add android        # si pas encore fait
bash scripts/install-native-keyboard.sh
npx cap sync android
npx cap open android
# Build > Generate Signed APK
```

Puis sur le téléphone : Paramètres → Langue et saisie → Clavier virtuel → Activer "Clavier Bariba Fitila"

## Détails techniques

- Package Android : `com.fitila.bariba` (cohérent avec l'appId Capacitor existant tout en utilisant un package plus lisible)
- SharedPreferences name : `bariba_keyboard_data` (identique Kotlin ↔ Java)
- Le composant FloatingBaribaKeyboard existant n'est PAS modifié — BaribaKeyboardCompanion le complète
- Les fichiers natifs sont stockés dans `android-native/` car le dossier `android/` est généré par `npx cap add android` et n'existe pas dans le repo
- Le script d'installation gère la copie + le patch du manifest automatiquement

## Note importante

Le `appId` actuel dans capacitor.config.ts est `app.lovable.a8b67aa7de064bed97db29852f4f01ed`. Le package Java sera `com.fitila.bariba` pour la lisibilité du code natif. Le script d'installation s'assurera que le chemin Java correspond au package déclaré dans le manifest. Si vous souhaitez publier sur le Play Store, il faudra que l'appId Capacitor et le package Java soient alignés — je peux ajuster si besoin.
