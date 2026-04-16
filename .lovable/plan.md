

# Plan : Saisie Bariba intelligente + écriture manuscrite dans tous les champs du module Classe

## Objectif

Remplacer tous les `<textarea>` et `<input type="text">` du module Classe par un composant enrichi offrant :
1. **Clavier caractères spéciaux Bariba** (ɔ, ɛ, ã, ɔ̃, ɛ̃, ĩ, ɔ̀, ǹ)
2. **Suggestions prédictives** depuis le dictionnaire Bariba existant (`usePhoneticSuggestions`)
3. **Zone d'écriture manuscrite** (canvas) avec reconnaissance de caractères/lettres

## Approche

### 1. Créer `BaribaSmartTextarea` — composant réutilisable

Un nouveau composant `src/components/classe/BaribaSmartTextarea.tsx` qui encapsule :

- Un `<textarea>` standard avec les styles existants
- Un **bouton clavier** (toggle) affichant les caractères spéciaux Bariba en grille cliquable (même liste que `BaribaKeyboardInput` : `BARIBA_CHARS`)
- Des **suggestions prédictives inline** : à chaque mot tapé, recherche dans le dictionnaire via `usePhoneticSuggestions.getSuggestions()` — les suggestions s'affichent sous le champ et un clic insère le mot
- Un **bouton écriture manuscrite** (toggle) qui ouvre un `<canvas>` où l'utilisateur dessine. Reconnaissance via l'API Canvas + analyse de traits pour proposer des lettres Bariba candidates

Props : `value`, `onChange`, `placeholder`, `rows`, `className` — drop-in replacement pour `<textarea>`

### 2. Reconnaissance d'écriture manuscrite

- Canvas tactile avec support stylet/doigt (touch events + mouse events)
- Utilisation de l'API **Lovable AI (Gemini Flash)** pour la reconnaissance : capture du canvas en image, envoi à Gemini avec prompt "Reconnaître les caractères Bariba écrits à la main"
- Fallback simplifié : boutons de lettres Bariba fréquentes affichés sous le canvas pour sélection rapide
- Bouton "Effacer" et "Insérer" pour le canvas

### 3. Intégration dans les 3 composants Classe

| Composant | Champs concernés | Nombre |
|-----------|-----------------|--------|
| `ClasseLessonView.tsx` | Tous les `<textarea>` des sections Observe, Écoute, Réagis, Retiens (lignes 125-142) | ~4-8 par leçon |
| `ClasseEvaluation.tsx` | Tous les `<textarea>` des questions (lignes 147-153) | ~5-15 par éval |
| `ClasseCalculView.tsx` | Les `<input>` numériques restent numériques, mais les champs texte des sections questions (lignes 198-200) recevront le composant | Variable |

Remplacement simple : `<textarea ... />` → `<BaribaSmartTextarea ... />`

### 4. Prédiction intelligente des mots

- Détection du **mot en cours** (derniers caractères après le dernier espace)
- Recherche en temps réel via `getSuggestions(currentWord, 5)` du hook existant
- Affichage de 3-5 suggestions sous le champ en "chips" cliquables
- Un clic insère le mot complet et ajoute un espace
- Les suggestions disparaissent quand le mot est complété ou le champ perd le focus

## Fichiers modifiés

| Action | Fichier |
|--------|---------|
| Créer | `src/components/classe/BaribaSmartTextarea.tsx` — composant avec clavier + prédiction + handwriting |
| Modifier | `src/components/classe/ClasseLessonView.tsx` — remplacer textarea par BaribaSmartTextarea |
| Modifier | `src/components/classe/ClasseEvaluation.tsx` — remplacer textarea par BaribaSmartTextarea |
| Modifier | `src/components/classe/ClasseCalculView.tsx` — ajouter BaribaSmartTextarea aux champs texte |

## Contraintes

- Réutilise `usePhoneticSuggestions` existant (pas de nouvelle source de données)
- Même liste `BARIBA_CHARS` que dans `BaribaKeyboardInput`
- Mobile-first : canvas tactile, boutons suffisamment grands
- Style pastel clair cohérent avec le module Classe
- Les champs numériques (`type="number"`) du calcul restent numériques

