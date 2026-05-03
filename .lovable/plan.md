
## Probleme

1. Le shuffle automatique toutes les 10 secondes change l'ordre des posts, ce qui rend un nouveau post "actif" et declenche l'autoplay audio/video sans intervention humaine.
2. VideoFeedCard joue automatiquement des que `isActive` passe a `true`, sans distinguer si c'est un scroll manuel ou un changement automatique.
3. `useFeedAudioAutoStop` gere bien la visibilite de page et le blur, mais ne gere pas le cas du shuffle auto.

## Solution

### 1. Distinguer scroll manuel vs changement automatique (TamTamSocial.tsx)

- Ajouter un state `userInitiatedNav` (ref boolean) qui est `true` uniquement quand l'utilisateur scrolle manuellement ou swipe.
- Le shuffle automatique (setShuffleTick) ne change plus `currentPostIndex` -- il re-melange le tableau mais garde le meme index. Si l'index pointe vers un post different apres shuffle, on ne declenche PAS l'autoplay.
- Passer un prop `autoPlay={false}` au VideoFeedCard quand le changement n'est pas initie par l'utilisateur.

### 2. VideoFeedCard : ajouter un prop `autoPlay` (VideoFeedCard.tsx)

- Ajouter `autoPlay?: boolean` aux props (defaut `false`).
- Dans le useEffect ligne 124-152 : ne lancer `play()` que si `isActive && autoPlay`.
- Si `isActive` mais `autoPlay === false`, afficher le thumbnail avec un bouton play visible -- l'utilisateur doit cliquer pour lancer.
- Garder le comportement actuel de pause quand `isActive` passe a `false`.

### 3. Renforcer la gestion de visibilite (deja en place via useFeedAudioAutoStop)

- Verifier que `useFeedAudioAutoStop` couvre bien tous les cas (deja fait : visibilitychange, blur, pagehide). Pas de changement necessaire ici.

### 4. Scroll manuel = autoPlay true (TamTamSocial.tsx)

- Dans `handleScroll`, quand l'utilisateur scrolle et que `currentPostIndex` change, passer `autoPlay={true}` pour ce post.
- Dans le shuffle auto, garder `autoPlay={false}`.

### Fichiers modifies

- `src/components/feed/VideoFeedCard.tsx` -- ajouter prop `autoPlay`, conditionner le play() automatique
- `src/pages/tamtam/TamTamSocial.tsx` -- tracker si le changement de post est manuel, passer `autoPlay` en consequence
