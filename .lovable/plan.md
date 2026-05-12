## Objectif

Faire évoluer le clavier Bariba (à la fois IME natif Android et clavier flottant `/fitila/keyboard`) pour qu'il soit aussi complet qu'un Gboard, intègre tous les caractères Bariba, propose une prédiction intuitive, une mini-traduction, et un **nouveau ton nasal bas** (accent grave) combinable par-dessus n'importe quelle voyelle (même déjà nasalisée ou aiguë), comme `ɔ̃̀`, `ɛ̃̀`, `ã̀`, `b̀`, etc. Tous les caractères doivent rester intacts au copier-coller dans n'importe quel lecteur de document.

## Faisabilité

- **Ton nasal bas combinable** : faisable nativement via le caractère Unicode **U+0300 (combining grave accent)**. Il s'empile correctement par-dessus `ɔ̃`, `ɛ̃`, `ĩ`, `ã`, `ũ`, `e`, `o`… Aucune création de glyphe nécessaire — c'est du Unicode standard, donc préservé au copier-coller dans WhatsApp, Word, Gmail, navigateurs, PDF readers. Rendu correct sur Android 10+ avec Roboto/Noto. Pour les rares apps avec mauvais rendu (ex. anciens lecteurs), on garde l'option NFC normalisé en sortie.
- **Layout Gboard complet** : chiffres (rangée 0-9), symboles (page `?123`), majuscules verrouillables, suppression long-press, espace long-press = changer de clavier système. Tout faisable avec les `TextView` programmatiques déjà en place (zéro dépendance AppCompat, pas de risque de crash).
- **Prédictions intuitives** : on combine l'historique `SharedPreferences` (déjà là) + un **dictionnaire Bariba embarqué** (~3-5k mots fréquents extraits de `useDictionarySearch` / corpus existant) chargé depuis `assets/bariba_lexicon.txt`. Préfixe + score (fréquence + récence).
- **Mini-traduction FR↔Bariba** : long-press sur la barre de suggestions → appel à l'edge function `bariba-translate` déjà déployée, résultat collé. Hors-ligne : fallback dictionnaire local.
- **Compatibilité documents** : on émet uniquement de l'Unicode NFC standard (latin + IPA `ɔ ɛ ŋ` + combining `̃` `̀` `́`). Aucun caractère privé. Test prévu : copier `kɔ̃̀` → coller dans WhatsApp / Docs / Gmail.

## Étapes

### 1. IME natif Android (`BaribaInputMethodService.java`, 4 copies)
- Ajouter une **rangée de chiffres** (0-9) en haut, comme Gboard.
- Ajouter une **page symboles** `?123` (`@ # $ % & * ( ) - _ + = / : ;`) avec bouton bascule `ABC` ↔ `?123`.
- Ajouter un **bouton ton nasal bas** `◌̀` dans la rangée des spéciaux Bariba. Au tap → insère **U+0300** après le dernier caractère (s'empile sur `ɔ̃` → `ɔ̃̀`, sur `e` → `è`, etc.). Si le dernier char est déjà suivi d'un U+0300, on le retire (toggle).
- Long-press sur les voyelles → popup avec variantes `é è ê ë ɛ ɛ̃ ɛ̀ ɛ̃̀` (style Gboard).
- Bouton `🌐` long-press → `InputMethodManager.showInputMethodPicker()` pour changer de clavier.
- Long-press `⌫` → suppression continue (Handler 50ms).
- Charger le **lexique Bariba** depuis `assets/bariba_lexicon.txt` au `onCreate` (~50 KB, en mémoire).
- Prédictions : top-5 = matches préfixe (lexique + historique), triés par fréquence + récence. Tap suggestion = remplace le mot courant.
- BUILD_TAG → `fitila-ime-2026-05-12-smart-v6`.

### 2. Lexique Bariba embarqué
- Créer `android/app/src/main/assets/bariba_lexicon.txt` (un mot par ligne, fréquence séparée par `\t`).
- Source : extraire de `src/data/foncierBaribaCorpus.ts` + dictionnaire React déjà en place. Script Node `scripts/build-bariba-lexicon.ts` qui génère le fichier.

### 3. Clavier flottant React `/fitila/keyboard` (`FloatingBaribaKeyboard.tsx`)
- Aligner le layout sur l'IME natif : rangée chiffres, page `?123`, touche **ton nasal bas** combinable.
- Hook `useBaribaPrediction` qui partage la logique préfixe + lexique (côté JS, importé depuis `src/data/baribaLexicon.ts`).
- Long-press voyelles (Pointer events `onPointerDown` + 400ms timer) → popup variantes accentuées.
- Bouton "Traduire" sur le mot courant → `supabase.functions.invoke('bariba-translate')`.
- Sortie texte : `String.normalize('NFC')` avant `navigator.clipboard.writeText` pour garantir compatibilité copier-coller universelle.

### 4. Pont JS ↔ Native (`BaribaKeyboardPlugin.java` + `useBaribaKeyboard.ts`)
- Ajouter méthode `getLexicon()` côté plugin (renvoie le contenu de `assets/bariba_lexicon.txt`) pour que le clavier flottant et l'IME partagent la même source.
- Méthode `addToneLow(word)` utilitaire (normalise + ajoute U+0300).

### 5. Documentation & vérification
- `DEPLOY_KEYBOARD.md` : ajouter section "Tester le ton nasal bas" + "Vérifier compatibilité copier-coller".
- `scripts/verify-apk.sh` : grep nouveau BUILD_TAG `smart-v6` + vérifier présence de `bariba_lexicon.txt` dans l'APK (`unzip -l ... | grep lexicon`).

## Détails techniques

- **Insertion U+0300** : `inputConnection.commitText("\u0300", 1)` — Android compose automatiquement avec le glyphe précédent.
- **Toggle accent** : lire `getTextBeforeCursor(2, 0)` ; si dernier code unit == 0x0300, `deleteSurroundingText(1, 0)` ; sinon `commitText("\u0300", 1)`.
- **Long-press popup** : `PopupWindow` ancré sur la touche, ferme au `ACTION_UP`.
- **Lexique** : `BufferedReader` sur `getAssets().open("bariba_lexicon.txt")`, stocké dans `TreeMap<String,Integer>` pour préfixe O(log n).
- **Page symboles** : flag `boolean isSymbols` ; `buildKeyboardView()` choisit ROW_NUM/ROW_SYM ou ROW1/ROW2/ROW3 selon le flag.
- **Compatibilité Android 10→15, Samsung/Xiaomi/Pixel** : conservée — toujours `ContextThemeWrapper(Theme_DeviceDefault)`, aucun `Button` framework, fallback view inchangé.

## Fichiers touchés (estimation)

- 4× `BaribaInputMethodService.java` (rewrite avec layout étendu, ton bas, popup long-press, lexique)
- 4× `BaribaKeyboardPlugin.java` (nouvelle méthode `getLexicon`)
- 2× `android/app/src/main/assets/bariba_lexicon.txt` (nouveau)
- 1× `scripts/build-bariba-lexicon.ts` (nouveau)
- `src/components/keyboard/FloatingBaribaKeyboard.tsx` (refonte layout + ton bas + traduction)
- `src/hooks/useBaribaPrediction.ts` (nouveau)
- `src/data/baribaLexicon.ts` (nouveau, partagé)
- `src/hooks/useBaribaKeyboard.ts` (méthode `getLexicon`)
- `DEPLOY_KEYBOARD.md`, `scripts/verify-apk.sh`

## Hors scope

- Reconnaissance vocale Bariba (déjà couverte par `useBaribaSTT`).
- Apprentissage ML on-device (la prédiction reste statistique simple : fréquence + récence).
- Glide-typing (swipe) — gros chantier, à proposer en V2 si demandé.
