

## Objectif

Appliquer la même interactivité que N1 Calcul (Dooru 2→34) au **N2 Part 2 — Calcul** (30 leçons), en utilisant exhaustivement les 3 documents N2 corrigés.

## Diagnostic rapide

Je dois vérifier comment N2 Calcul est actuellement rendu et si un composant dédié existe.
<lov-tool-use id="toolu_vrtx_01YMUVYbvYiJEaecqGhGmtF6" name="code--search_files" integration-id="code" data="{\"query\": \"calcul\", \"include_patterns\": \"src/pages/fitila/FitilaClasse.tsx,src/components/classe/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_012VQT6HJTmjrkWFDMRAYbF2" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/classe\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GUmhHDCdpjWRdXRfZefKZa" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/classe\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01C9wsXdBpFku1b1n1C7JU6n" name="code--search_files" integration-id="code" data="{\"query\": \"CALCUL_N2|calculN2|ClasseCalcul\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01VEX99YbJdbPfV5t81JF1AE" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/classe/ClasseCalculView.tsx\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MmHYMz3vm2nKTsSpzybN9i" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/fitila/FitilaClasse.tsx\", \"lines\": \"300-360\"}">
</lov-tool-use>
The current `ClasseCalculView` uses N1 data sources directly. The N2 calcul section (`section === 'calcul'` when `activeLevel === 'N2'`) likely renders the same N1 view — bug. I need to verify and plan to make N2 calcul interactive in the same way using N2 data.
<lov-tool-use id="toolu_vrtx_01CWE2hiweo5xtrW7wYUXj4P" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/classe/ClasseCalculView.tsx\", \"lines\": \"100-260\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EVo6m2CS5qA4tHQX36RyAt" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/classe/ClasseCalculView.tsx\", \"lines\": \"380-624\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HVeq3SgyKSNNQ1JikoH9Jz" name="code--view" integration-id="code" data="{\"file_path\": \"src/data/classeContentN2.ts\", \"lines\": \"1-60\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018kmmLdMEY9EiYpLvT3zod8" name="code--view" integration-id="code" data="{\"file_path\": \"src/data/classeContentN2.ts\", \"lines\": \"920-1050\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WbFYyTJ3ePL6SiQbJzqNXv" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/classe/ClasseCalculView.tsx\", \"lines\": \"260-380\"}">
</lov-tool-use>
Now I have enough context. Currently `ClasseCalculView` always uses N1 data (`CALCUL_LESSONS`, `CALCUL_EXERCISES`, `getClasseProgress`). For N2, we need it to use `CALCUL_N2_LESSONS`, `CALCUL_N2_EXERCISES`, `getClasseN2Progress`, and N2 saving helpers.
<lov-tool-use id="toolu_vrtx_01T8zSpWc3yZTHdHMP19Aofg" name="code--search_files" integration-id="code" data="{\"query\": \"saveCalculScore|saveCalculAnswer|getCalculAnswer|getClasseN2Progress\", \"include_patterns\": \"src/data/*.ts\"}">
</lov-tool-use>
I have all info. N2 lacks `saveCalculAnswer`/`getCalculAnswer` helpers and `saveN2CalculScore` exists but `ClasseCalculView` is hardcoded to N1. Plan ready.

<lov-plan>

# Plan : Rendre interactif Calcul N2 — Dooru 1 → 25 (même fonctionnement que N1)

## Diagnostic

`ClasseCalculView.tsx` est actuellement **codé en dur sur N1** :
- Imports : `CALCUL_LESSONS`, `CALCUL_EXERCISES`, `getClasseProgress`, `saveCalculScore`, `saveCalculAnswer`, `getCalculAnswer`
- Lorsque l'utilisateur ouvre `Part 2 — Calcul` en N2, c'est **toujours la liste N1** qui s'affiche.

`src/data/classeContentN2.ts` a déjà :
- `CALCUL_N2_LESSONS` (25 leçons) avec `paragraphs`, `sections` (Sɔm gbiikiru, Sɔmburu yiruse, Sɔmburu itase, Yè n weenɛ a n yã, Sosibu, Wĩabu, Dabiasibu, etc.)
- `CALCUL_N2_EXERCISES` (manuels pour quelques leçons)
- `getClasseN2Progress`, `saveN2CalculScore`

Il **manque** côté N2 :
- `saveN2CalculAnswer` / `getN2CalculAnswer` (helpers Q&R persistés sur la clé `classe_n2_progress`)

## Solution

### 1. Rendre `ClasseCalculView` paramétrable par niveau

Ajouter une prop `level: 'N1' | 'N2'`. Selon la valeur :
- Source des leçons : `CALCUL_LESSONS` ou `CALCUL_N2_LESSONS`
- Source des exercices manuels : `CALCUL_EXERCISES` ou `CALCUL_N2_EXERCISES`
- Source du progress : `getClasseProgress` ou `getClasseN2Progress`
- Helpers : `saveCalculScore`/`saveCalculAnswer`/`getCalculAnswer` ou leurs équivalents N2

Toute la logique existante (parser auto d'opérations `+ - x :`, exercices "Écris en bariba", `MathOperationExercise`, `BaribaNumberExercise`, `QuestionAnswerField`, panneau bilan, bouton `Sɔm kpe`) **reste identique** — c'est juste les sources de données qui changent.

### 2. Ajouter les helpers Q&R N2 dans `classeContentN2.ts`

```ts
export function saveN2CalculAnswer(lessonId, sectionKey, qIdx, value) { ... }
export function getN2CalculAnswer(lessonId, sectionKey, qIdx): string { ... }
```
(Mêmes signatures qu'en N1, mais opèrent sur `classe_n2_progress` via `getClasseN2Progress` / `saveN2Progress`.)

### 3. Détection des sections SƆMAA / opérations N2

Le parser actuel détecte `+ - x × * : ÷ /` y compris décimaux (`8,7 + 3,6 = 12,3`, `m3,75 - m1,85`, `248 x 1,25 = 310`) — déjà compatible avec les opérations N2.

Élargir la détection des sections "exercices" pour inclure les en-têtes spécifiques N2 issus du Guide / Manuel :
- `Sosibu` (additions), `Wĩabu` (soustractions), `Dabiasibu` (multiplications), `Bɔnu kosibu` (divisions), `Sɔmburu yiruse`, `Sɔmburu itase`, `Sɔm gbiikiru` — en plus de `Sɔmaa` déjà reconnu.

Règle : toute section dont le nom matche `/sɔmaa|sosibu|wĩabu|dabiasibu|bɔnu kosibu|sɔmburu|sɔm gbiikiru/i` est rendue comme **exercices auto-générés** depuis les `paragraphs`. Les autres sections (`Yè n weenɛ a n yã`, `A mɛɛrio`, `A tubusio`, etc.) restent en **Q&R interactifs**.

### 4. Branchement dans `FitilaClasse.tsx`

Remplacer la ligne 332 :
```tsx
{section === 'calcul' && <ClasseCalculView />}
```
par :
```tsx
{section === 'calcul' && <ClasseCalculView level={activeLevel} />}
```

### 5. Améliorations N2 spécifiques (basées sur le Guide N2 pp. 42–50)

Pour les leçons calcul N2, le parser génère automatiquement les exercices interactifs depuis les `paragraphs` :
- Numération (15 001 → 20 002 : exercice "écris en bariba")
- Décimaux (23,45 — exercice "écris en bariba")
- Multiplications décimales (248 × 1,25 = ?)
- Divisions décimales (2134,65 ÷ 2,1 = ?)
- Multiplications/divisions mentales (37 × 400, 51,84 ÷ 8)

Aucun nouveau contenu n'est ajouté — on exploite **exhaustivement** les `paragraphs` existants extraits des 3 documents corrigés.

## Fichiers modifiés

| Action | Fichier | Modifications |
|---|---|---|
| Modifier | `src/data/classeContentN2.ts` | Ajouter `saveN2CalculAnswer` + `getN2CalculAnswer` |
| Modifier | `src/components/classe/ClasseCalculView.tsx` | Ajouter prop `level: 'N1' \| 'N2'`, basculer les sources de données + helpers selon le niveau, élargir regex des sections-exercices N2 |
| Modifier | `src/pages/fitila/FitilaClasse.tsx` | Passer `level={activeLevel}` au composant |

## Couverture

- **Toutes les leçons N2 Dooru 1 → 25** : Q&R interactives sur les sections `Yè n weenɛ`, `A mɛɛrio`, etc.
- **Toutes les sections d'exercices N2** (Sɔmaa / Sosibu / Wĩabu / Dabiasibu / Sɔmburu yiruse / itase / Sɔm gbiikiru) : exercices auto-générés avec correction automatique
- **Réponses Q&R sauvegardées** localement dans `classe_n2_progress` (séparé de N1)
- **Score `Sɔm kpe`** persisté via `saveN2CalculScore`
- **Aucun changement** au calcul N1, à l'alphabet, aux évaluations, aux modules Grammaire / Production / Gestion N2

## Contraintes respectées

- BaribaSmartTextarea pour tous les champs texte
- Mobile-first, style cohérent avec N1
- Caractères Unicode bariba corrects
- Réutilisation à 100% des composants `MathOperationExercise`, `BaribaNumberExercise`, `QuestionAnswerField` existants
- Aucun appel backend (tout en localStorage)

