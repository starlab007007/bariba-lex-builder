# Plan — Clavier Bariba intelligent v7 (Flottant React + IME Android)

## Objectif

Enrichir les **deux claviers** (React `/fitila/keyboard` + IME natif Android) avec : alphabet Bariba complet, diacritiques combinants empilables, prédiction intelligente (mots + phrases + tons), traduction temps réel, mode phrases rapides, et apprentissage adaptatif synchronisé Supabase. Aucune régression sur l'existant.

## 1. Schéma Supabase (migration)

Créer table `keyboard_learned_words` avec RLS :
- `user_id` (FK auth.users), `word` text, `count` int, `last_used` timestamptz
- Unique `(user_id, word)`, policy `auth.uid() = user_id`

## 2. Données partagées (nouveau module `src/data/baribaAlphabet.ts`)

Source unique de vérité Unicode pour les deux claviers (le natif l'utilise via JSON copié dans `android/app/src/main/assets/bariba_alphabet.json` au build).

```
NASALS = ['ã','ĩ','ũ','õ','ẽ','ɛ̃','ɔ̃']      // U+00E3, 0129, 0169, 00F5, 1EBD, 025B+0303, 0254+0303
SPECIALS = ['ɔ','ɛ','ŋ']                       // déjà présents
COMBINING = ['\u0300','\u0301','\u0303']       // ton bas / ton haut / nasal
LONG_PRESS_VARIANTS = { a:[à,á,â,ä,ã], e:[è,é,ê,ë,ẽ,ɛ,ɛ̀,ɛ́,ɛ̃,ɛ̃̀], i:[...], o:[...,ɔ,ɔ̀,ɔ́,ɔ̃,ɔ̃̀], u:[...], ɔ:[ɔ̀,ɔ́,ɔ̃,ɔ̃̀], ɛ:[...], n:[ŋ,ǹ,ñ] }
```

## 3. Hook `src/hooks/useBaribaPredictor.ts` (nouveau)

- Build au mount : index trie + bigrammes depuis `foncierBaribaCorpus`, `fra_bba_dictionnary.json`, `corpus_initial_2600.json`, `fullDictionaryData`.
- API : `getPredictions(partial, context) → Prediction[]`, `learnWord(word)`, `getFrequentPhrases()`.
- Ordre de priorité : (1) historique perso, (2) corpus par fréquence, (3) bigramme contextuel, (4) variantes tonales si `partial` est une voyelle.
- Persistance : `localStorage('bariba_learned_words')` + upsert Supabase si user connecté (debounce 5s).

## 4. Clavier React — `FloatingBaribaKeyboard.tsx`

Ajouts (sans casser l'existant) :
- **Rangée nasales** (fond `bg-[#0F3460]`) : `ã ĩ ũ õ ẽ ɛ̃ ɔ̃`
- **Rangée bariba+tons** : `ɔ ɛ ŋ ◌̀ ◌́ ◌̃` — boutons combinants insèrent le caractère après le curseur, second tap = toggle
- **Long-press** sur a/e/i/o/u/ɔ/ɛ/n → popup variantes (composant `VariantPopup`)
- **Barre suggestions 3 chips** : phrase (teal), mot (blanc), variante tonale (amber)
- **Bannière traduction** auto au-dessus suggestions, debounce 800 ms, détection auto via présence de `[ɔɛŋãĩũ]`, appel `supabase.functions.invoke('bariba-translate')`, tap = insère
- **Bouton ⚡** : grille 2 colonnes phrases rapides, tap = bariba+espace, long-press = traduction FR, bouton 🔊 = `useBaribaTTS`
- **NFC partout** : wrapper `insertChar`, `insertSuggestion`, `copyToClipboard` avec `.normalize('NFC')`

## 5. IME Android — `BaribaInputMethodService.java` (4 emplacements)

```text
android/app/src/main/java/com/fitila/bariba/
android-native/java/com/fitila/bariba/
bariba-lex-builder/android/app/src/main/java/com/fitila/bariba/
bariba-lex-builder/android-native/java/com/fitila/bariba/
```

Modifications :
- `BUILD_TAG = "fitila-ime-2026-05-12-smart-v7-alphabet"`
- `rebuildKeyboard()` ajoute `buildNasalsRow()` + `buildCombinantRow()` avant `buildSpecialsRow()`
- `buildNasalsRow()` : 7 voyelles nasales (escape `\u00E3`, `\u0129`, `\u0169`, `\u00F5`, `\u1EBD`, `\u025B\u0303`, `\u0254\u0303`)
- `buildCombinantRow()` : `\u0300 \u0301 \u0303` — toggle via `getTextBeforeCursor(2,0)`
- `OnLongClickListener` sur voyelles → popup `PopupWindow` avec variantes
- `typeCharacter()` applique `Normalizer.normalize(c, Form.NFC)` avant `commitText`
- `renderSuggestionBar()` : 3 catégories chips colorées (phrase verte, mot blanc, ton ambre) lues depuis `BaribaKeyboardPlugin`
- `onFinishInputView()` → flush `learned_words` vers SharedPrefs

## 6. Plugin Capacitor — `BaribaKeyboardPlugin.java` (2 emplacements)

Ajouter méthodes :
- `getLexicon()` → renvoie JSON du corpus + nasales (lu depuis `assets/bariba_alphabet.json`)
- `pushPredictions(predictions, lastWord)` → sauve les 3 chips actuelles pour que l'IME les affiche
- `getLearnedWords()` / `addLearnedWord(word)` avec compteur

## 7. Sync `useBaribaKeyboard.ts`

Étendre avec `getLearnedWords`, `addLearnedWord`, `pushPredictions` et upsert Supabase périodique (déjà connecté via `useAuth`).

## 8. Mode Phrases Rapides

- Constante `PHRASES_RAPIDES` dans `src/data/baribaPhrasesRapides.ts` (~30 phrases : salutations, nombres 1-10, courtoisie, marché)
- React : nouveau panneau toggle ⚡ dans `FloatingBaribaKeyboard`
- IME : bouton ⚡ ouvre un `GridLayout` overlay dans la même `keyboardContainer`

## 9. Vérifications post-build

`scripts/verify-apk.sh` mis à jour :
- grep `smart-v7-alphabet` dans dex
- grep `BaribaInputMethodService` dans dex
- Test manuel : taper `mã` → suggestions, long-press `o` → popup, `ɔ`+`◌̀` → `ɔ̀`, 🌍 → bannière <1s, ⚡ → grille TTS

## Hors scope

- Glide-typing (V2)
- ML on-device (TensorFlow Lite) — V2
- Voix (déjà géré par `useBaribaSTT`)

## Fichiers touchés

**Créés** : `src/data/baribaAlphabet.ts`, `src/data/baribaPhrasesRapides.ts`, `src/hooks/useBaribaPredictor.ts`, `android/app/src/main/assets/bariba_alphabet.json` (×2 copies), migration Supabase

**Modifiés** : `FloatingBaribaKeyboard.tsx`, `useBaribaKeyboard.ts`, `BaribaInputMethodService.java` (×4), `BaribaKeyboardPlugin.java` (×2), `scripts/verify-apk.sh` (×2), `DEPLOY_KEYBOARD.md` (×2)
