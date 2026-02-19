
# Refonte UI de Fitila IA - Style ChatGPT clair avec prediction de mots Bariba

## Objectif

Transformer l'interface de Fitila IA en un design moderne style ChatGPT avec fond clair, texte anime en typing, traduction francais sous chaque reponse, prediction de mots bariba pendant la saisie, et clavier de caracteres bariba integre.

## Changements prevus

### 1. Refonte complete de `src/pages/fitila/FitilaIA.tsx`

**Design UI style ChatGPT clair :**
- Fond blanc/gris clair au lieu du fond sombre actuel
- Bulles de messages repensees : utilisateur a droite (fond orange clair), IA a gauche (fond blanc avec bordure grise)
- Avatar IA avec icone robot, avatar utilisateur avec icone user
- Typographie claire et lisible

**Effet typing anime sur les reponses :**
- Les reponses IA s'affichent caractere par caractere avec un effet de machine a ecrire
- Un curseur clignotant pendant l'animation
- Le texte est mis en forme avec des paragraphes bien separes et des sauts de ligne clairs

**Bouton "Traduire en francais" sous chaque reponse :**
- Un bouton discret sous chaque bulle IA en couleur differente (bleu/indigo)
- Au clic, appel au modele ByT5 via `supabase.functions.invoke('byt5-bariba-translate')` pour traduire la reponse bariba en francais
- La traduction francaise s'affiche juste en dessous de la bulle, dans un bloc avec fond bleu clair
- Indicateur de chargement pendant la traduction

**Prediction de mots bariba dans le champ de saisie :**
- Integration du hook `usePhoneticSuggestions` (deja existant) directement dans le champ de saisie
- Quand l'utilisateur tape, le dernier mot en cours est utilise pour chercher des suggestions dans le dictionnaire (71 000+ mots)
- Les suggestions s'affichent dans un panneau au-dessus du champ de saisie (style autocompletion)
- Au clic sur un mot, il remplace le mot en cours de saisie
- Prediction du mot suivant : apres selection d'un mot, le systeme propose des mots frequemment associes

**Clavier bariba integre :**
- Bouton pour afficher/masquer le clavier de caracteres speciaux bariba
- Reutilise les caracteres de `BaribaKeyboardInput` : ɔ, ɛ, ã, ŋ, ɔ̀, ɔ́, ɛ̀, ɛ́, etc.
- Le clavier apparait au-dessus de la zone de saisie
- Insertion du caractere a la position du curseur

**Conservation des fonctionnalites existantes :**
- Saisie vocale via micro (hooks `useAudioRecorder` et `useBaribaSTT`)
- Envoi au backend `fitila-ia-chat`
- Vidage immediat du champ apres envoi

### 2. Structure des messages enrichie

Le type `ChatMessage` est enrichi avec :
- `translationFr?: string` - stocke la traduction francaise locale
- `isTranslatingFr?: boolean` - indicateur de chargement traduction
- `isTyping?: boolean` - controle de l'animation typing
- `displayedContent?: string` - contenu partiellement affiche pendant le typing

## Details techniques

### Effet typing
- Utilisation de `useEffect` + `setInterval` avec un delai de 15-25ms par caractere
- Le contenu complet est stocke dans `content`, le contenu affiche progressivement dans `displayedContent`
- Le scroll suit automatiquement l'animation

### Prediction de mots
- Extraction du dernier mot en cours via `input.split(' ').pop()`
- Appel a `getSuggestions(lastWord, 5)` du hook `usePhoneticSuggestions`
- Remplacement du dernier mot par le mot selectionne + ajout d'un espace

### Traduction sous les reponses
- Appel `supabase.functions.invoke('byt5-bariba-translate', { body: { text, sourceLang: 'bariba', targetLang: 'french' } })`
- Resultat stocke dans le state local du message, pas de nouvel appel backend

### Clavier bariba
- Les memes caracteres que dans `BaribaKeyboardInput` : `['ɔ', 'ɛ', 'ã', 'ŋ', 'ɔ̀', 'ɔ́', 'ɛ̀', 'ɛ́', 'à', 'á', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú']`
- Insertion via manipulation de `selectionStart/selectionEnd` sur l'input ref

## Fichiers a modifier

1. **`src/pages/fitila/FitilaIA.tsx`** - Refonte complete de la page (seul fichier modifie)

## Fichiers reutilises (non modifies)

- `src/hooks/usePhoneticSuggestions.ts` - Prediction de mots bariba
- `src/hooks/useAudioRecorder.ts` - Enregistrement vocal
- `src/hooks/useBaribaSTT.ts` - Transcription bariba
- `supabase/functions/fitila-ia-chat/index.ts` - Pipeline backend (inchange)
- `supabase/functions/byt5-bariba-translate/index.ts` - Traduction ByT5 (inchange)
