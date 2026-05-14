## Objectif

Aligner le clavier IME natif Android sur les fonctionnalités déjà visibles dans le clavier flottant React, et corriger l'agencement visuel (rangée nasales unique). Tout le corpus utilisé (mots, bigrammes, phrases rapides) doit provenir **uniquement** des exemples du dictionnaire Bariba déjà embarqué.

## Problèmes constatés (IME natif uniquement)

1. Pas de bannière de traduction auto FR ↔ Bariba.
2. La barre de suggestions n'affiche pas la traduction française à côté de chaque mot prédit.
3. Les prédictions intuitives basées sur le dictionnaire Bariba embarqué ne sont pas visibles (seule l'historique perso est utilisée).
4. Pas de bouton ⚡ ouvrant la grille 2 colonnes des phrases rapides.
5. Trop de rangées spéciales : on voit `buildNasalsRow` + `buildSpecialsRow` + `buildCombiningRow` = 3 lignes alors que la capture en référence n'en montre que 2 (nasales `ã ĩ ũ õ ẽ ɛ̃ ɔ̃` + spéciales `ɔ ɛ ŋ`).

## Plan d'implémentation

### 1. Asset embarqué unique — corpus dictionnaire

Créer `android/app/src/main/assets/bariba_dictionary.json` (copié dans les 4 emplacements miroir : `android/`, `android-native/`, `bariba-lex-builder/android/`, `bariba-lex-builder/android-native/`).

Contenu généré au build depuis `src/data/fra_bba_dictionnary.json` + `src/data/foncier_bariba_corpus.json` :

```json
{
  "version": 1,
  "entries": [
    { "ba": "alaafia", "fr": "bonjour", "freq": 42 },
    { "ba": "yenu", "fr": "oui", "freq": 30 }
  ],
  "phrases": [
    { "ba": "Mã nɔ wɛ baa", "fr": "Comment vas-tu ?" }
  ],
  "bigrams": { "alaafia": ["yenu", "baaba"], ... }
}
```

Script `scripts/build-bariba-dictionary-asset.mjs` qui :
- Lit les exemples (champs `example`, `phrase`, `sentence`) du dictionnaire embarqué.
- Tokenise → table de fréquences.
- Construit l'index bigrammes (mot précédent → 3 mots suivants les plus fréquents) **uniquement** à partir des phrases du dictionnaire.
- Écrit le JSON dans les 4 dossiers `assets/`.
- Hooké dans `scripts/build-release-apk.sh`.

### 2. Refactor `BaribaInputMethodService.java` (4 emplacements miroir)

Nouveau `BUILD_TAG = "fitila-ime-2026-05-13-smart-v8-bilingue"`.

**Layout** (`rebuildKeyboard`) :
```
[Suggestions bilingues bar]
[Digits row]
[a..p]
[q..m]
[⇧ w x c v b n ⌫]
[ã ĩ ũ õ ẽ ɛ̃ ɔ̃]              ← UNIQUE rangée nasales
[ɔ        ɛ        ŋ]          ← rangée spéciales (3 touches larges)
[?123  ⚡  🌐  espace  .  ↵]
```
- Suppression de `buildCombiningRow()` de la pile principale.
- Les tons `◌̀ ◌́ ◌̃` deviennent des **long-press** sur les voyelles concernées (déjà partiellement supporté via `VARIANTS`), et trois touches discrètes `◌̀ ◌́ ◌̃` sont déplacées dans la rangée digits (côté gauche, taille réduite) pour rester accessibles sans dupliquer une ligne entière.
- Bouton ⚡ ajouté à la rangée bottom (entre `?123` et `🌐`).

**Chargeur dictionnaire** — nouvelle classe `BaribaDictionary` :
- Singleton chargé en `onCreate()` depuis `assets/bariba_dictionary.json`.
- Méthodes : `List<Entry> predict(String prefix, String previousWord)`, `String translate(String baribaWord)`, `String translateFr(String frenchWord)`, `List<Phrase> phrases()`.
- Algorithme `predict` : (a) historique perso préfixé, (b) bigramme depuis `previousWord`, (c) entrées dictionnaire commençant par `prefix`, triées par freq.

**Barre de suggestions bilingue** (`renderSuggestionBar`) :
- Chaque chip = LinearLayout vertical : ligne 1 mot Bariba blanc 16sp, ligne 2 traduction FR jaune `#FFE082` 11sp.
- 3 chips max, fond `#0F3460`, padding généreux.
- Source : `BaribaDictionary.predict(currentWord, lastCommittedWord)`.

**Bannière de traduction auto** (nouvelle vue insérée entre suggestionsBar et keyboardContainer) :
- Visible seulement quand `currentWord.length() >= 3` ou après `space`.
- Détection automatique via présence de caractères Bariba (`ɔ ɛ ŋ ã ĩ ũ õ ẽ`) → traduction Bariba→FR locale (lookup dico). Sinon Français→Bariba locale.
- Si lookup local échoue : appel HTTP debounce 800 ms vers l'edge function `bariba-translate` (URL `https://pmrhezgnyffiskbaiudb.supabase.co/functions/v1/bariba-translate`, anon key embarquée). `AsyncTask`/`Thread` + `Handler.post` pour mise à jour UI.
- Tap sur la bannière insère la traduction à la position du curseur.

**Bouton ⚡ phrases rapides** :
- Ouvre un `PopupWindow` plein-largeur, hauteur ≈ 280dp.
- `GridLayout` 2 colonnes scrollable.
- Chaque cellule = mot Bariba + traduction FR, tap = `commitText(phrase + " ")`.
- Source : `BaribaDictionary.phrases()` (uniquement les exemples du dictionnaire embarqué).

### 3. Vérification

- `scripts/verify-apk.sh` (et copie `bariba-lex-builder/`) : ajouter checks
  - présence de `assets/bariba_dictionary.json` dans l'APK (`unzip -l … | grep`)
  - `BUILD_TAG` = `smart-v8-bilingue`
  - présence de la classe `BaribaDictionary`
- Mise à jour `DEPLOY_KEYBOARD.md` avec la nouvelle checklist visuelle (capture des 2 rangées exactement).

### 4. Hors scope (non demandé)

- Pas de modification du clavier flottant React (déjà OK selon l'utilisateur).
- Pas de glide-typing.
- Pas de prédiction trigramme (bigrammes suffisants pour cette itération).

## Fichiers touchés

**Créés** :
- `scripts/build-bariba-dictionary-asset.mjs`
- `android/app/src/main/assets/bariba_dictionary.json` (et 3 copies miroir)
- `android/app/src/main/java/com/fitila/bariba/BaribaDictionary.java` (et 3 copies miroir)

**Modifiés** :
- `BaribaInputMethodService.java` × 4 (layout, suggestions bilingues, bannière, bouton ⚡)
- `scripts/verify-apk.sh` × 2
- `scripts/build-release-apk.sh` × 2 (hook script asset)
- `DEPLOY_KEYBOARD.md` × 2

## Action après merge

```bash
node scripts/build-bariba-dictionary-asset.mjs
bash scripts/build-release-apk.sh
bash scripts/verify-apk.sh    # doit afficher smart-v8-bilingue
```
