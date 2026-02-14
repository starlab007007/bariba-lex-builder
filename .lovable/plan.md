

# Correction des suggestions et de l'audio dans le dictionnaire

## Probleme 1 : Les suggestions affichent toujours les mots bariba

Dans `BaribaKeyboardInput.tsx`, la liste de suggestions (ligne 243) affiche toujours `entry.word` (mot bariba) comme texte principal, meme quand on est en mode Francais vers Bariba. 

**Correction** : Quand `currentLang === 'fr'`, inverser l'affichage :
- Texte principal = `entry.definition` (le mot/definition en francais)
- Texte secondaire = `entry.word` (le mot bariba comme resultat)

Quand `currentLang === 'ba'`, garder l'affichage actuel :
- Texte principal = `entry.word` (mot bariba)
- Texte secondaire = `entry.definition` (definition francaise)

**Fichier** : `src/components/tamtam/BaribaKeyboardInput.tsx` -- lignes 242-253

## Probleme 2 : L'audio ne doit etre que pour le francais

Dans `VocalDictionaryResult.tsx`, les boutons audio sont presents sur :
- Le mot bariba (ligne 75) -- A SUPPRIMER
- La definition francaise (ligne 125) -- A GARDER
- L'exemple bariba (ligne 148) -- A SUPPRIMER
- L'exemple francais (ligne 172) -- A GARDER
- Le bouton "Ecouter tout" (ligne 185) -- Modifier pour ne lire que le francais

**Fichier** : `src/components/tamtam/VocalDictionaryResult.tsx`

## Probleme 3 : Lecture auto apres selection

Dans `TamTamDictionary.tsx` ligne 108, `handleSelectWord` appelle `speakCurrentLang(entry.word)` qui lit le mot bariba. Il faut lire la definition francaise a la place.

**Fichier** : `src/pages/tamtam/TamTamDictionary.tsx` -- ligne 108

---

## Resume des modifications

| Fichier | Modification |
|---------|-------------|
| `src/components/tamtam/BaribaKeyboardInput.tsx` | Afficher definition francaise comme texte principal en mode fr, mot bariba en secondaire |
| `src/components/tamtam/VocalDictionaryResult.tsx` | Supprimer boutons audio sur mot bariba et exemple bariba, garder uniquement sur francais |
| `src/pages/tamtam/TamTamDictionary.tsx` | Lire la definition francaise au lieu du mot bariba apres selection |

