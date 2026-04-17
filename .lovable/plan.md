

# Plan : Rendre interactif Calcul N1 — Dooru 2 → 34

## Diagnostic

`ClasseCalculView.tsx` actuel affiche :
- `paragraphs` : texte mort (ligne 188-192)
- `sections` : titre + liste de questions en lecture seule (ligne 197-203)
- `CALCUL_EXERCISES[id]` : composant `MathOperationExercise` interactif (couvre seulement ~10 leçons)

**Problèmes** :
1. La section **SƆMAA** (présente dans Dooru 2, 4, 6, 8, 10, 11, 13, 15, 16, 18, 20, 22, 24, 27, 29, 31) contient des paragraphes `paragraphs` listant des opérations (`24 + 25`, `426 : 6 =`, `137 x 54 =`, `7 5 6 X 2 5`, etc.) qui sont juste du texte non-interactif.
2. Les sections `I- A mɛɛrio`, `II- A faagi yeni swaa dakio…`, `III- A tubusio`, `IV- Yè n weenɛ a n yã` sont des listes de questions sans champ de réponse.

## Solution

### 1. Parser intelligent d'opérations (dans `ClasseCalculView.tsx`)

Créer une fonction `parseOperationsFromParagraphs(paragraphs: string[])` qui détecte automatiquement dans le texte :

| Pattern détecté | Type généré |
|---|---|
| `24 + 25`, `253 + 182=` | addition |
| `87 - 43`, `1896 - 754` | subtraction |
| `137 x 54 =`, `436 x 6 =` | multiplication |
| `8 : 4 =`, `426 : 6 =`, `169 : 8 =` | division (avec reste auto si non entier) |
| Colonnes verticales `26 / +37 / ----` | addition (groupé) |
| Listes de chiffres `1 4 3 2 6` | exercice "écrire en lettres bariba" via BARIBA_NUMBERS |

Regex robustes pour `+`, `-`, `x`/`X`/`*`, `:` / `÷` / `/`. Calcul de `expected` automatique (et `remainder` pour division).

### 2. Section SƆMAA rendue automatiquement comme exercices interactifs

Quand une leçon a `V- Sɔmaa` ou `IV- Sɔmaa` (pages-exercices : Dooru 2, 4, 6, 8, 10, 11, 13, 15, 16, 18, 20, 22, 24, 27, 29, 31, 34) :
- Les opérations détectées dans `paragraphs` deviennent des `MathOperationExercise` (réutilise composant existant)
- Les listes de chiffres deviennent des exercices "**Écris ce nombre en bariba**" avec `BaribaSmartTextarea` + validation contre `BARIBA_NUMBERS`
- Pour les chiffres absents de `BARIBA_NUMBERS`, validation tolérante (saisie acceptée si non vide → marque comme "complété")
- Bouton **Recommencer** + score sauvegardé via `saveCalculScore`

### 3. Sections de questions Q&R interactives (I- A mɛɛrio, II- A faagi…, III- A tubusio, IV- Yè n weenɛ)

Pour chaque question dans `sections[sectionName]` (Dooru 2 → 34) :
- Afficher la question + un `BaribaSmartTextarea` (clavier bariba + suggestions prédictives + écriture manuscrite — déjà existant)
- Bouton **A geruo** (Soumettre) qui sauvegarde la réponse en localStorage (clé : `calcul_qa_${lessonId}_${sectionKey}_${qIdx}`)
- Affichage d'une coche verte + résumé "Réponse enregistrée" après soumission
- Bouton "**Modifier**" pour éditer
- Couleur par section (mɛɛri = bleu, faagi = violet, tubusi = orange, yè n weenɛ = teal)

### 4. Persistance des réponses Q&R

Étendre `ClasseProgress` avec :
```ts
calculAnswers: Record<string, string>; // "calcul_qa_2_I_0" -> "ma réponse"
```
Helper `saveCalculAnswer(lessonId, sectionKey, qIdx, value)` + `getCalculAnswer(...)` dans `classeContent.ts`.

### 5. Score global de la leçon

À la fin de chaque Dooru, panneau récap :
- N opérations résolues / total
- N questions répondues / total
- Bouton **Sɔm kpe** (Terminer) → `saveCalculScore` + retour à la liste

## Architecture & fichiers

| Action | Fichier | Modifications |
|---|---|---|
| Modifier | `src/data/classeContent.ts` | Ajouter `calculAnswers` à `ClasseProgress`, helpers `saveCalculAnswer` / `getCalculAnswer` |
| Modifier | `src/components/classe/ClasseCalculView.tsx` | • Fonction `parseOperationsFromParagraphs` <br>• Composant `QuestionAnswerField` (BaribaSmartTextarea + soumission)<br>• Composant `BaribaNumberWriteExercise` (écrire chiffre en bariba)<br>• Refactor du rendu : sections Sɔmaa → exercices auto-générés, autres sections → Q&R interactives<br>• Récap final + score |

## Couverture

- **Toutes les leçons Dooru 2 → 34** : sections Q&R deviennent interactives (champs BaribaSmartTextarea soumissibles)
- **Toutes les pages-exercices** (titres vides + paragraphes d'opérations) : SƆMAA devient interactif avec correction automatique
- **Aucun changement** au niveau N1 alphabet/lessons/évaluations (intacts)
- **Aucun changement** au N2 (intact)

## Contraintes respectées

- Mobile-first, style pastel cohérent
- BaribaSmartTextarea pour TOUS les champs texte (clavier bariba + écriture manuscrite + suggestions prédictives)
- Réponses sauvegardées localement (pas de backend nécessaire)
- Caractères Unicode bariba corrects
- Réutilise composants existants (`MathOperationExercise`, `BaribaSmartTextarea`)

