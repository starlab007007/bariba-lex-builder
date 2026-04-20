

# Plan — Audios alphabet N1 visibles + Évaluations N2 accessibles

## Diagnostic

### Bug 1 — Audios alphabet N1 invisibles côté apprenant
`src/components/classe/ClasseAlphabetView.tsx` :
- Aucun `<ListenButton>` n'est rendu
- Le bouton 🔊 du panneau de détail est un simple `<button>` décoratif sans logique
- Les `content_keys` sont pourtant déjà générés par `pushAlphabetItems` :
  - `classe/N1/alphabet/0/vowels/{idx}`
  - `classe/N1/alphabet/0/consonants/{idx}`
  - `classe/N1/alphabet/0/nasalVowels/{idx}` ← clé exacte
  - `classe/N1/alphabet/0/toneMarkers/{idx}`

**Note** : la section UI `nasals` mélange `nasalVowels` + `toneMarkers` dans une seule liste — il faut donc distinguer la clé en fonction de l'index réel pour pointer la bonne section_key.

### Bug 2 — Évaluations N2 introuvables ("Évaluation introuvable")
`src/components/classe/ClasseEvaluation.tsx` ligne 18 :
```ts
const evaluation = CLASSE_EVALUATIONS.find(e => e.id === evalId);
```
N'utilise QUE le tableau N1. Les évaluations N2 (id ≥ 101) ne sont jamais trouvées → message d'erreur permanent.

Conséquences additionnelles :
- `<ListenButton contentKey={\`classe/N1/eval/...\`}>` → préfixe figé → mauvais audio chargé pour N2
- `syncEvaluation('N1', ...)` et `syncAnswer({ level: 'N1', ... })` → mauvais niveau enregistré côté serveur
- `getClasseProgress()` (N1) au lieu de `getClasseN2Progress()` quand on est en N2

## Implémentation

### A. `ClasseAlphabetView.tsx` — Ajouter `<ListenButton>` partout

1. Importer `ListenButton`
2. Définir un helper `getContentKey(letter, idx)` qui calcule la bonne clé selon le mode :
   - `vowels` → `classe/N1/alphabet/0/vowels/{idx}`
   - `consonants` → `classe/N1/alphabet/0/consonants/{idx}`
   - `nasals` → si `idx < BARIBA_ALPHABET.nasalVowels.length` → `nasalVowels/{idx}` ; sinon → `toneMarkers/{idx - nasalVowels.length}`
3. Sur chaque tuile lettre du grid : afficher un petit `<ListenButton size="sm">` en overlay coin haut-droit (positionnement absolu, ne perturbe pas le layout grid)
4. Dans le panneau de détail (`selectedLetter`) : remplacer le `<button>` 🔊 décoratif par un vrai `<ListenButton size="lg">` avec la bonne clé
5. Dans le `SyllableBuilder` : ajouter un `<ListenButton size="sm">` à côté de chaque syllabe générée si une clé existe (sinon fallback grisé natif du composant)

### B. `ClasseEvaluation.tsx` — Support N1 + N2

1. Ajouter une prop `level: 'N1' | 'N2'` (défaut `'N1'` pour rétrocompat)
2. Importer `CLASSE_N2_EVALUATIONS` et `getClasseN2Progress`
3. Sélection dynamique :
   ```ts
   const pool = level === 'N2' ? CLASSE_N2_EVALUATIONS : CLASSE_EVALUATIONS;
   const evaluation = pool.find(e => e.id === evalId);
   const progress = level === 'N2' ? getClasseN2Progress() : getClasseProgress();
   ```
4. Remplacer tous les `classe/N1/eval/...` hardcodés des `<ListenButton>` par `classe/${level}/eval/...`
5. Remplacer `saveEvaluationScore` / `syncEvaluation('N1', ...)` / `syncAnswer({ level: 'N1', ... })` par la version dynamique selon `level` :
   - Pour `saveEvaluationScore` : si N2, utiliser le helper progress N2 équivalent (à vérifier — sinon ajouter un branchement)

### C. `FitilaClasse.tsx` — Passer `activeLevel` au composant

Ligne 379 :
```tsx
<ClasseEvaluation evalId={selectedEvalId} level={activeLevel} onBack={...} />
```

### D. Vérification rapide `classeContent.ts` / `classeContentN2.ts`
- Confirmer la présence d'un helper équivalent à `saveEvaluationScore` pour N2 (sinon utiliser le même mais avec le préfixe correct géré par `syncEvaluation('N2', ...)`)

## Fichiers modifiés

- `src/components/classe/ClasseAlphabetView.tsx` — `<ListenButton>` sur grille + détail + syllabes
- `src/components/classe/ClasseEvaluation.tsx` — prop `level`, sélection dynamique du pool, clés audio dynamiques, sync correct
- `src/pages/fitila/FitilaClasse.tsx` — passer `level={activeLevel}` à `<ClasseEvaluation>`

## Garanties

- ✅ Alphabet N1 : chaque voyelle, consonne, nasale, ton et syllabe a un bouton 🔊 fonctionnel quand l'audio enseignant est approuvé
- ✅ Évaluations N2 : toutes les 5 évaluations N2 (id 101–105) accessibles avec questions, écriture, images et corrigés
- ✅ `<ListenButton>` des questions évaluation N2 pointe vers les bons audios (`classe/N2/eval/...`)
- ✅ Réponses élève N2 syncées avec le bon `level: 'N2'` côté serveur
- ✅ Compatibilité totale avec N1 (prop `level` optionnelle avec défaut)

## Hors scope

- Réenregistrement des audios alphabet par les enseignants (déjà couvert par le module Alphabet enseignant existant)
- Refonte du `SyllableBuilder` (juste ajout du bouton)

