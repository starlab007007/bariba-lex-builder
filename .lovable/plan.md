
# Plan de Migration du Dictionnaire

## Objectif
Remplacer tous les anciens fichiers JSON de dictionnaire par le nouveau fichier `dico.json` (71,745 lignes, ~8,900+ entrees) pour unifier et mettre a jour la base lexicale Bariba-Francais.

---

## Phase 1 : Copie du Nouveau Fichier

### Actions
1. Copier `user-uploads://dico.json` vers `src/data/bariba-dictionary.json` (nouveau nom unifie)
2. Supprimer les anciens fichiers :
   - `src/data/raw-dictionary.json`
   - `src/data/dictionnaire-10-2.json`

---

## Phase 2 : Mise a Jour des Sources de Donnees

### 2.1 Fichier `src/data/fullDictionaryData.ts`

**Modifications :**
- Changer l'import de `dictionnaire-10-2.json` vers `bariba-dictionary.json`
- Mettre a jour la fonction `loadDictionnaire10_2()` pour reflechir le nouveau nom
- Ajouter des logs pour confirmer le nombre d'entrees chargees

```text
Avant:
  const dict = await import('./dictionnaire-10-2.json');

Apres:
  const dict = await import('./bariba-dictionary.json');
```

### 2.2 Fichier `src/utils/dictionaryParser.ts`

**Modifications :**
- Mettre a jour le chemin de chargement dans `loadAndProcessDictionary()`
- Pointer vers le nouveau fichier

```text
Avant:
  const response = await fetch('/src/data/raw-dictionary.json');

Apres:
  const response = await fetch('/bariba-dictionary.json'); 
  // ou import dynamique depuis src/data
```

---

## Phase 3 : Mise a Jour du Dossier Public

### Actions
1. Copier `bariba-dictionary.json` vers `public/bariba-dictionary.json` pour l'acces HTTP
2. Supprimer ou archiver :
   - `public/dictionnaire-10-3.json`
   - `public/dictionnaire_ameliore.json`

### 3.1 Fichier `src/hooks/usePhoneticSuggestions.ts`

**Modifications :**
```text
Avant:
  const response = await fetch('/dictionnaire_ameliore.json');

Apres:
  const response = await fetch('/bariba-dictionary.json');
```

---

## Phase 4 : Invalidation du Cache

### Actions dans `fullDictionaryData.ts`
- Incrementer `CACHE_VERSION` de "2.0" a "3.0"
- Cela forcera le rechargement complet du dictionnaire pour tous les utilisateurs

```text
Avant:
  const CACHE_VERSION = "2.0";

Apres:
  const CACHE_VERSION = "3.0";
```

---

## Phase 5 : Verification de Compatibilite

### Structure du nouveau fichier (compatible)
```json
{
  "word": "aberu / yaberu",
  "phonetic": "[aberu/yaberu]",
  "part_of_speech": "foc - n:t",
  "definition": "chemise",
  "example_bariba": "Na ku ra aberu sebe...",
  "example_francais": "Je ne porte pas de chemise..."
}
```

Cette structure est identique aux anciens fichiers. Aucune modification du parsing n'est necessaire.

---

## Resume des Fichiers Modifies

| Fichier | Action |
|---------|--------|
| `src/data/bariba-dictionary.json` | CREER (copie de dico.json) |
| `public/bariba-dictionary.json` | CREER (copie pour HTTP) |
| `src/data/raw-dictionary.json` | SUPPRIMER |
| `src/data/dictionnaire-10-2.json` | SUPPRIMER |
| `public/dictionnaire-10-3.json` | SUPPRIMER |
| `public/dictionnaire_ameliore.json` | SUPPRIMER |
| `src/data/fullDictionaryData.ts` | MODIFIER (import + cache) |
| `src/utils/dictionaryParser.ts` | MODIFIER (path) |
| `src/hooks/usePhoneticSuggestions.ts` | MODIFIER (path) |

---

## Benefices Attendus

1. **Source unique** : Plus de confusion entre fichiers multiples
2. **Donnees fraîches** : ~8,900+ entrees mises a jour
3. **Maintenance simplifiee** : Un seul fichier a gerer
4. **Cache invalide** : Tous les utilisateurs recevront les nouvelles donnees

---

## Considerations Techniques

- Le nouveau fichier fait ~2.5 MB - acceptable pour import dynamique
- Le format est 100% compatible avec les parsers existants
- Les exemples Bariba et Francais sont bien structures
- Les caracteres speciaux (tons, accents) sont preserves
