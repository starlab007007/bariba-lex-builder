# Clavier Bàátɔ̀nú (Bariba) — architecture

Trois surfaces, un seul dictionnaire (`bariba_keyboard_dictionary.json` : `entries`, `phrases`, `bigrams`).

| Surface | Code | Rôle |
|---|---|---|
| Clavier système Android | `android/.../com/fitila/bariba/BaribaInputMethodService.java`, `BaribaDictionary.java`, `res/xml/method.xml` | IME global (WhatsApp, SMS, navigateur…) : lettres, voyelles nasales, tons, barre de prédiction, panneau traduction |
| Clavier système iOS | `ios/BaribaKeyboard/` (`KeyboardViewController.swift`, `BaribaDictionary.swift`) | Extension `com.apple.keyboard-service`, même fonctionnalités |
| Clavier in-app Flutter | `lib/keyboard/` | Repli quand le clavier système n'est pas activé : `BaribaVirtualKeyboard`, `BaribaTextField`, `showBaribaKeyboardSheet` |

## Canaux Flutter ⇄ natif

* `MethodChannel('fitila/keyboard')` — `getKeyboardStatus` → `{enabled, selected, fullAccess, platform}`,
  `openInputMethodSettings`, `showInputMethodPicker` (Android), `syncConfig {supabaseUrl, anonKey}`.
* `EventChannel('fitila/keyboard/status')` — statut en continu (Android : `ContentObserver` sur
  `Settings.Secure` ; iOS : à chaque retour au premier plan).
* Partage : Android via `SharedPreferences("bariba_keyboard_data")`, iOS via App Group
  `group.bj.fitila.fitilaFlutter`. Flutter y écrit l'URL et la clé publique Supabase pour que les
  claviers appellent `ai-translate` puis `byt5-bariba-translate` ; sans cela ils restent 100 % hors ligne.
* Le dictionnaire est embarqué dans chaque cible (`tool/sync_keyboard_dictionary.sh` les synchronise).

## Prédiction & traduction

Clés de recherche « repliées » : tons/accents retirés, `ɛ→e`, `ɔ→o`, `ŋ→n` — taper `nar` propose `nàrú`.
Classement : bigrammes du mot précédent, puis fréquence. Mode **Saisir et Traduire** : traduction hors ligne
instantanée (dictionnaire/phrases), améliorée par le moteur en ligne puis le bouton *Remplacer* substitue le texte.

## Activation (écran `KeyboardScreen` → `KeyboardOnboarding`)

* Android : Réglages ▸ Claviers (intent direct) → activer « Clavier Bariba » → sélecteur système.
* iOS : Réglages de l'app (`openSettingsURLString`) ▸ Claviers ▸ FITILA Bariba ▸ Accès complet (facultatif).
  iOS ne dit pas quel clavier est actif : seule l'ajout du clavier est détecté.
* Une invite unique à la première ouverture propose l'activation (`keyboard_prompt.dart`).

## À faire côté Apple avant publication

1. Créer l'App Group `group.bj.fitila.fitilaFlutter` (portail développeur) et l'associer aux deux App IDs
   `bj.fitila.fitilaFlutter` et `bj.fitila.fitilaFlutter.BaribaKeyboard`.
2. Vérifier la signature automatique de la cible `BaribaKeyboard` (équipe de développement).
3. Le mode « Accès complet » est requis par iOS pour le réseau et le conteneur partagé.

## Tests

`flutter test test/bariba_keyboard_test.dart` (moteur, clavier virtuel, onboarding, champ). Les parties
Kotlin/Java/Swift/Xcode n'ont pas pu être compilées dans l'environnement de développement (pas de SDK).

## Module Espace (Flutter) — `lib/espace/`

Même modèle de données que le web (`espace_*`, RPC de partage, edge function `espace-ocr`) : `docs/ESPACE_MODULE.md` du dépôt web.

* `EspaceHome` : tableau de bord (recherche sans diacritiques, dossiers, archives, cartes responsives 1/2/3 colonnes).
* `EspaceSmartEditor` : saisie intelligente — prédiction + traduction du mot en cours, traduction en direct du paragraphe
  (dictionnaire puis moteur IA), carte de traduction sur sélection avec équivalents à choisir, clavier Bàátɔ̀nú intégré
  si le clavier système n'est pas activé.
* `EspaceEditorScreen` : enregistrement automatique, versions (restauration), partage par e-mail / lien temporaire.
  L'édition mobile est en texte brut : la mise en forme riche créée sur le web est conservée tant que le texte n'est pas modifié.
* `EspaceScanScreen` : photo/galerie -> `espace-ocr` -> correction par le dictionnaire -> document. Les PDF se numérisent sur le web.
* Moteur commun : `BaribaKeyboardEngine` (`lookup`, `lookupFrench`, `detectDirection`, `correctText`, glosses grammaticales ignorées).
