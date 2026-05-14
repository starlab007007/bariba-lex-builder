
# Plan — IME natif Bariba v9 « clean-bilingue »

BUILD_TAG cible : `fitila-ime-2026-05-13-smart-v9-clean`

## 1. Barre de suggestions bilingue + bannière FR↔BA bien visibles

Problème (capture 1) : chips trop serrés, traduction française tronquée, bannière auto invisible parce qu'elle se confond avec la suggestionsBar.

Corrections dans `BaribaInputMethodService.java` :

- `suggestionsBar` : hauteur 48dp → **56dp**, fond `#0F3460` (au lieu de `#16213E`), séparateurs verticaux 1dp `#1A1A2E` entre les chips.
- Chips bilingues :
  - Bariba : 17sp, `#FFFFFF`, **bold**, `maxLines=1`, ellipsize=END.
  - Français : 12sp, `#FFD54F` (jaune plus saturé), `maxLines=1`, ellipsize=END, padding-top 2dp.
  - Padding chip : 8dp horizontal, 6dp vertical, marges latérales 3dp.
  - 3 chips max, chacun `weight=1f` pour occuper toute la largeur uniformément.
- Bannière de traduction `translationBanner` :
  - Déplacée **au-dessus de la suggestionsBar** (premier enfant du root) pour ne plus être masquée.
  - Hauteur fixe 36dp, fond `#1A6E5A` (vert distinct du bleu des suggestions), texte blanc 13sp bold + petite icône `↩`.
  - Toujours `VISIBLE` quand `currentTranslation` non vide ; sinon `GONE`.
  - Format texte : `« mot » → traduction   ↩` pour clarifier la direction.

## 2. Une seule rangée combinée (nasales + spéciales + ◌̀)

Captures 2 et 3 : aujourd'hui `buildNasalsRow`, `buildSpecialsRow` et la rangée des combinings forment 3 rangées séparées.

Nouvelle rangée unique `buildBaribaRow(ctx)` (hauteur 46dp, fond `#0F3460`) contenant **dans l'ordre** :

```
ã  ĩ  ũ  õ  ẽ  ɛ̃  ɔ̃  |  ɔ  ɛ  ŋ  |  ◌̀
```

- Les 7 nasales en jaune `#FFD54F`.
- Les 3 spéciales en blanc avec long-press → variantes (déjà géré par `attachLongPressVariants`).
- La touche `◌̀` (`U+0300`) :
  - **Unique** ton accessible directement (les autres `◌́`, `◌̃` restent disponibles via long-press sur les voyelles).
  - Comportement : insère `U+0300` après le caractère courant via `toggleCombining`. Comme la composition est NFC, elle s'applique aussi bien comme **premier** accent (`o → ò`) que **deuxième** accent sur une voyelle déjà accentuée (`ɔ́ → ɔ̌` rendu en NFC, `ɔ̃ → ɔ̃̀` etc.).
  - Si le caractère précédent est déjà `U+0300`, `toggleCombining` le retire (toggle).
- Les variantes long-press des voyelles `a e i o u` continuent d'inclure `◌́` et `◌̃` : aucune perte fonctionnelle.

Suppression de `buildNasalsRow` et `buildSpecialsRow` dans `rebuildKeyboard`.

## 3. Limiter le clavier à 5 rangées max

Nouveau `rebuildKeyboard` (mode lettres) :

```text
Rangée 1 : digits 1..0
Rangée 2 : a z e r t y u i o p
Rangée 3 : q s d f g h j k l m
Rangée 4 : ã ĩ ũ ũ õ ẽ ɛ̃ ɔ̃ ɔ ɛ ŋ ◌̀     ← nouvelle rangée unique
Rangée 5 : ?123 · ⚡ · , · espace · . · ⏎  + shift/backspace intégrés
```

Pour tenir en 5 rangées, la rangée 3 absorbe `w x c v b n` via long-press sur `q` et `m` ? **Non** — on garde la disposition AZERTY connue : à la place, on supprime l'ancienne `buildRow3` (w x c v b n shift backspace) et on déplace `shift` + `backspace` à l'extrême gauche/droite de la rangée 5 (bottom). `w x c v b n` restent accessibles via la rangée symboles ? — alternative retenue : **garder `buildRow3` (rangée w/x/c/v/b/n + shift + ⌫)** et fusionner digits dans la rangée 1 supérieure : total = digits + ROW1 + ROW2 + ROW3 + bariba + bottom = 6.

➡ Décision finale pour rester ≤ 5 rangées **lettres** :

```text
1) a z e r t y u i o p
2) q s d f g h j k l m
3) ⇧  w x c v b n  ⌫
4) ã ĩ ũ õ ẽ ɛ̃ ɔ̃ ɔ ɛ ŋ ◌̀
5) ?123  ⚡  ,  espace  .  ⏎
```

Les chiffres passent en long-press sur `a..p` (déjà natif Gboard) et restent accessibles via `?123`. Mode `?123` reste à 4 rangées (sym1, sym2, sym3, bottom).

## 4. ⚡ ouvre/ferme le panneau traducteur IA intégré (toggle)

Aujourd'hui ⚡ ouvre une grille phrases. À remplacer par un panneau « Traducteur IA » embarqué dans le clavier :

- Nouvel état `boolean translatorOpen` + champ `View translatorPanel`.
- `onClick` ⚡ → `toggleTranslator()` :
  - Si fermé : construit `translatorPanel` (voir ci-dessous), masque `keyboardContainer` (`GONE`), ajoute `translatorPanel` à `root` à la place, `translatorOpen = true`, ⚡ devient surligné `#FFD54F`.
  - Si ouvert : retire `translatorPanel`, ré-affiche `keyboardContainer`, `translatorOpen = false`, ⚡ revient à la couleur normale.
  - `onFinishInputView` ferme aussi le panneau pour éviter un état orphelin.

Contenu de `translatorPanel` (LinearLayout vertical, fond `#1A1A2E`, hauteur ≈ keyboard) :

1. Header (40dp, fond `#0F3460`) : titre « Traducteur IA · FR ↔ Bariba » + bouton ✕ (ferme = même action que ⚡).
2. Sélecteur de direction : 2 chips toggle « FR → BA » / « BA → FR » (par défaut auto-détecté depuis le dernier mot).
3. `EditText` source 2 lignes max (texte saisi dans le champ cible si on clique « Insérer », sinon traduction directe).
4. Bouton « Traduire » → appelle l'edge function `bariba-translate` déjà utilisée par `runAutoTranslate` (réutilise `fetchRemoteTranslation` refactorisée pour accepter texte + direction + callback).
5. Zone résultat (TextView 17sp blanc, fond `#16213E`, padding 12dp).
6. Deux boutons côte à côte : « Insérer dans le texte » (commit via `InputConnection.commitText`) et « Copier » (`ClipboardManager`).

Pas de webview / pas de React : tout est natif Java, dimensionné à la même hauteur que le clavier pour rester bien cadré quel que soit l'écran. C'est l'équivalent IME du module traducteur déjà visible dans l'app.

> Remarque faisabilité : un IME ne peut pas charger la route React `/fitila/translator` à l'intérieur de la zone clavier (sandbox process séparé). La solution retenue ré-implémente la même UX en natif et appelle exactement la même edge function `bariba-translate`, garantissant un comportement identique.

## 5. Visuel du rendu final (ASCII wireframe)

État clavier normal :

```text
┌──────────────────────────────────────────────────────────────┐
│  « so » → frapper                                          ↩ │  ← bannière auto FR↔BA (vert)
├──────────────────────────────────────────────────────────────┤
│   so          │   som          │   soora                     │  ← suggestions bilingues
│   frapper     │   farine       │   être frappé               │
├──────────────────────────────────────────────────────────────┤
│ a z e r t y u i o p                                          │
│ q s d f g h j k l m                                          │
│ ⇧  w x c v b n                                            ⌫  │
│ ã ĩ ũ õ ẽ ɛ̃ ɔ̃   ɔ ɛ ŋ   ◌̀                                  │  ← rangée unique (4)
│ ?123   ⚡    ,         espace         .   ⏎                  │  ← rangée bottom (5)
└──────────────────────────────────────────────────────────────┘
```

État ⚡ activé (panneau traducteur ouvert, clavier masqué) :

```text
┌──────────────────────────────────────────────────────────────┐
│  Traducteur IA · FR ↔ Bariba                              ✕  │
├──────────────────────────────────────────────────────────────┤
│  [ FR → BA ]  [ BA → FR ]                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Tapez le texte à traduire…                             │  │
│  └────────────────────────────────────────────────────────┘  │
│  [        Traduire        ]                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Tɛ̃ɛ̃ ɔ̃ baa…                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│  [ Insérer dans le texte ]   [ Copier ]                      │
└──────────────────────────────────────────────────────────────┘
```

Un second clic sur ⚡ (ou ✕) ferme le panneau et restaure le clavier exactement dans l'état précédent.

## 6. Détails techniques / fichiers modifiés

- `android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.java`
  - `BUILD_TAG = "fitila-ime-2026-05-13-smart-v9-clean"`.
  - Nouveau `buildBaribaRow(ctx)` ; suppression de `buildNasalsRow`/`buildSpecialsRow`.
  - `buildRoot` : ordre = `translationBanner` → `suggestionsBar` → `keyboardContainer` (+ `translatorPanel` ajouté/retiré dynamiquement).
  - `renderBilingualBar` : nouvelles tailles/couleurs (15→17sp, 11→12sp, jaune `#FFD54F`).
  - Nouveau `toggleTranslator()`, `buildTranslatorPanel()`, `runManualTranslate(text, direction, cb)` (refactor de `fetchRemoteTranslation`).
  - `showQuickPhrases` retiré du flux ⚡ (méthode supprimée pour réduire la classe).
- Mirroring obligatoire dans :
  - `android-native/java/com/fitila/bariba/BaribaInputMethodService.java`
  - `bariba-lex-builder/android/app/src/main/java/com/fitila/bariba/BaribaInputMethodService.java`
  - `bariba-lex-builder/android-native/java/com/fitila/bariba/BaribaInputMethodService.java`
- `scripts/verify-apk.sh` + `bariba-lex-builder/scripts/verify-apk.sh` :
  - `EXPECTED_TAG="fitila-ime-2026-05-13-smart-v9-clean"`.
  - Vérification supplémentaire : `strings classes*.dex | grep "Traducteur IA"`.
- Aucune modification de l'asset `bariba_dictionary.json` (toujours utilisé par les suggestions).
- Aucun changement React/web : le clavier flottant n'est pas touché par cette itération.

## 7. Validation post-build

1. `bash scripts/build-release-apk.sh`
2. `bash scripts/verify-apk.sh apk-output/<APK>` → doit afficher BUILD_TAG v9-clean + `BaribaDictionary` + `Traducteur IA`.
3. Test manuel sur appareil : taper « so » → 3 chips bilingues lisibles ; taper « bɔ » → bannière FR visible ; appuyer ⚡ → panneau traducteur s'affiche ; appuyer à nouveau → clavier revient.

