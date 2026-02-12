

# Diagnostic et corrections du BranchingPlayer

## Bugs identifies

### Bug 1 : Video en boucle bloque la progression
Dans `BranchingPlayer.tsx` ligne 205, la balise `<video>` a l'attribut `loop`. Cela signifie que `onEnded` ne se declenche jamais. De plus, ligne 82, le timer est desactive pour les segments video (`if (seg.mediaType === 'video') return`). Resultat : **les segments video ne progressent jamais** vers les choix ou la fin.

**Correction** : Retirer `loop` de la video et toujours utiliser le timer base sur `seg.duration` comme mecanisme principal de progression, meme pour les videos.

### Bug 2 : Segments sans fin et sans choix = impasse
Dans `buildGraph()` (StoryBuilder.tsx ligne 100), si une branche n'est pas une fin ET n'a pas de sous-choix, alors `is_choice_point: false` et `is_ending: false`. Le timer (ligne 84-91) ne declenche rien car aucune condition n'est remplie. Le segment joue indefiniment.

**Correction** : Dans le timer du BranchingPlayer, ajouter un cas de repli : si le segment n'est ni une fin ni un point de choix, afficher automatiquement la carte de fin generique apres la duree du segment.

### Bug 3 : Audio ne joue pas (politique autoplay du navigateur)
L'appel `narrationRef.current.play()` se fait dans un `useEffect`, pas directement depuis un geste utilisateur. Les navigateurs bloquent silencieusement cet appel. Le `.catch(() => {})` masque l'erreur.

**Correction** : 
- Appeler `narrationRef.current.load()` avant `play()` pour reinitialiser l'element audio
- Ajouter un `AudioContext` resume au premier clic utilisateur
- Loguer les erreurs de lecture au lieu de les ignorer

### Bug 4 : Segments de branche sans background_music_url
Dans `buildGraph()`, seul le segment intro recoit `background_music_url: selectedMusic?.url`. Les branches n'ont pas ce champ, donc la musique s'arrete apres l'intro.

**Correction** : Propager `selectedMusic?.url` a tous les segments du graphe.

## Modifications

### `src/features/conte-vivant/components/BranchingPlayer.tsx`

1. **Retirer `loop`** de la balise video (ligne 205)
2. **Unifier le timer** : supprimer le `return` early pour les videos (ligne 82). Utiliser `seg.duration` comme timer universel. Si le segment a une narration audio, ecouter `onended` de l'audio pour declencher la progression quand l'audio finit, avec un fallback sur le timer duration.
3. **Gerer les segments sans issue** : ajouter un 3eme cas dans le timer -- si le segment n'est ni ending ni choice_point, le traiter comme une fin implicite (afficher EndingCard avec un badge par defaut)
4. **Corriger la lecture audio** : appeler `.load()` puis `.play()`, et loguer les erreurs au lieu de les ignorer silencieusement
5. **Reprendre l'AudioContext** : au premier clic (`handleTap`), creer/reprendre un AudioContext pour debloquer l'autoplay

### `src/features/conte-vivant/components/StoryBuilder.tsx`

1. **Propager la musique** : dans `buildGraph()`, ajouter `background_music_url: selectedMusic?.url` a tous les segments (branches et sous-branches), pas seulement l'intro

## Details techniques

### Timer unifie (BranchingPlayer)

```text
Ancien flux :
  - Si video → pas de timer, attend onEnded (qui ne vient jamais avec loop)
  - Si photo → timer de seg.duration secondes

Nouveau flux :
  - Timer de seg.duration secondes pour TOUS les segments
  - Quand le timer expire :
    1. Si is_ending → afficher EndingCard
    2. Si is_choice_point avec choices → afficher ChoiceOverlay
    3. Sinon → traiter comme fin implicite (EndingCard generique)
  - Si narration audio presente : ecouter onended pour declencher plus tot
  - Video : pas de loop, lecture simple
```

### Audio resume pattern

```text
1. Premier clic utilisateur sur le player (handleTap)
2. Creer AudioContext() et appeler .resume()
3. narrationRef.current.load() puis .play()
4. Console.warn si play() echoue au lieu de catch silencieux
```

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/features/conte-vivant/components/BranchingPlayer.tsx` | Timer unifie, retirer loop, audio fix, gestion impasses |
| `src/features/conte-vivant/components/StoryBuilder.tsx` | Propager background_music_url a toutes les branches |

