
# Optimisation Complete : Griot, Conte Vivant et Feed Video

## Problemes identifies

### GRIOT STUDIO - 6 problemes

1. **Fuite memoire `window.__griotPendingScenes`** : Utilisation du global `window` pour passer des donnees entre etapes. Si l'utilisateur quitte sans nettoyer, les scenes restent en memoire indefiniment.

2. **Videos timeline dans StoryPreviewPlayer** : Chaque miniature de scene charge un `<video>` avec `autoPlay` et `loop` (ligne 336-340). Avec 10 scenes, ca fait 10 videos en lecture simultanee juste pour des miniatures.

3. **Double concatenation audio** : `concatenateSceneAudios` est appele dans GriotStudio.tsx (ligne 353) ET dans PublishStep.tsx (ligne 98) ET dans StoryPreviewPlayer.tsx (ligne 93). Le meme travail de decodage/concatenation est fait 3 fois.

4. **Pas de timeout sur le chargement video dans GriotAnimationEngine** : `loadVideo()` a un timeout de 15s, mais `loadScenes()` les charge en serie (boucle `for...of`). 5 videos = potentiellement 75s d'attente.

5. **AssetGallery charge TOUS les assets en une requete** : La requete (ligne 80) recupere tous les assets africains sans pagination. Avec 500+ assets, c'est une charge initiale lourde.

6. **`renderSlideshowFrames` et `renderFrames` utilisent `canvas.toBlob` par frame** : Genere des centaines de blobs PNG individuels (30fps x 30s = 900 blobs). Extreme pression memoire.

### CONTE VIVANT - 4 problemes

7. **BranchingPlayer ne pre-charge pas les medias du segment suivant** : Le hook `useBranchPreload` existe mais n'est PAS utilise dans BranchingPlayer.tsx. Chaque transition charge le media a la volee.

8. **Fuite memoire audio dans BranchingPlayer** : `narrationRef` et `bgMusicRef` ne sont jamais `src = ''` au changement de segment. Les anciens buffers audio restent en memoire.

9. **StoryBuilder TTS sequentiel** : `handlePublish` genere les voix TTS une par une (boucle `for`, ligne 215). Avec 5 segments, c'est 5 requetes en serie au lieu de parallele.

10. **StoryBuilder mini-videos non lazy** : `renderSegmentMini` (ligne 244) rend des `<video>` pour chaque segment sans lazy loading. Tous les medias se chargent meme hors ecran.

### FEED VIDEO - 4 problemes

11. **VideoFeedCard ne revoke pas les blob URLs** : Le cleanup (ligne 72-73) clear le `src` mais ne revoke jamais les blob URLs si le videoUrl est un blob.

12. **`getCurrentPosts` recalcule la fusion + tri a chaque render** : Le `useMemo` depend de `posts` et `videoFeedItems`, mais aussi de `feedMode`. Chaque changement de feed re-trie tout le tableau.

13. **VideoFeedCard `preload="auto"` pour les voisins** : Les videos a +/-2 du current index ont `preload="none"` seulement si non-active. Mais le composant est quand meme rendu avec le `<video>` element, ce qui demarre le parsing du conteneur video.

14. **Realtime subscription dupliquee** : `useVideoFeed` cree un nouveau `newVideo` sans les infos profil (ligne 136-156). Le profil affiche toujours "Createur FITILA" pour les videos recues en temps reel.

## Solution par fichier

### 1. `src/engines/GriotAnimationEngine.ts`

- **Chargement parallele des scenes** : Remplacer la boucle `for...of` dans `loadScenes()` par `Promise.allSettled()` pour charger toutes les images/videos simultanement
- **Supprimer `renderSlideshowFrames` et `renderFrames`** : Ces methodes ne sont pas utilisees dans le pipeline actuel (PublishStep utilise captureStream). Les supprimer reduit la taille du bundle et evite la tentation de les appeler
- **Timeout video reduit** : Passer de 15s a 8s pour accelerer le fallback vers les images

### 2. `src/components/griot-studio/GriotStudio.tsx`

- **Remplacer `window.__griotPendingScenes`** par un `useRef` : Stocker les donnees pendantes dans un ref React au lieu du global window. Nettoyage automatique au unmount
- **Eviter la double concatenation** : Stocker le resultat de `concatenateSceneAudios` dans un ref et le passer directement a PublishStep et StoryPreviewPlayer via props, au lieu de re-concatener dans chaque composant

### 3. `src/components/griot-studio/PublishStep.tsx`

- **Recevoir l'audio concatene en prop** : Ajouter une prop `concatenatedAudioUrl?: string` et supprimer le `useEffect` de concatenation interne (ligne 97-106). Utiliser directement la prop

### 4. `src/components/griot-studio/StoryPreviewPlayer.tsx`

- **Recevoir l'audio concatene en prop** : Meme approche que PublishStep. Supprimer la concatenation locale
- **Miniatures : remplacer `<video>` par des images poster** : Au lieu de charger 10 videos pour les miniatures (ligne 334-340), utiliser `<img>` avec le `scene.imageUrl` ou une vignette statique. Les videos ne sont necessaires que pour le canvas principal

### 5. `src/components/griot-studio/AssetGallery.tsx`

- **Pagination de la requete** : Ajouter `.range(0, 99)` a la requete initiale et un bouton "Charger plus" dans le drawer. Cela reduit la charge initiale de 500+ a 100 assets

### 6. `src/features/conte-vivant/components/BranchingPlayer.tsx`

- **Integrer `useBranchPreload`** : Appeler `preloadSegments()` quand un segment a des choix pour pre-charger les medias des branches suivantes
- **Nettoyer les sources audio** : Au changement de segment, appeler `narrationRef.current.src = ''` et `narrationRef.current.load()` pour liberer l'ancien buffer
- **Lazy media loading** : Ne charger la video/image que quand le segment est actif (pas en avance sauf via preload)

### 7. `src/features/conte-vivant/components/StoryBuilder.tsx`

- **TTS parallele** : Remplacer la boucle sequentielle (ligne 215) par `Promise.allSettled()` pour generer toutes les voix en parallele
- **Lazy video dans `renderSegmentMini`** : Remplacer `<video>` par `<img>` avec le poster/thumbnail pour les miniatures de segments

### 8. `src/components/feed/VideoFeedCard.tsx`

- **`preload="metadata"` au lieu de `"none"`** : Pour les videos non-actives, utiliser `metadata` au lieu de `none` pour avoir les dimensions et la premiere frame sans charger tout le fichier
- **Ajouter `loading="lazy"` sur l'image poster** : L'image thumbnail est deja lazy, confirmer que c'est le cas

### 9. `src/hooks/useVideoFeed.ts`

- **Enrichir les videos realtime** : Quand un INSERT arrive, faire une requete rapide pour recuperer le profil avant d'ajouter la video au state
- **Debounce du loadMore** : Ajouter un debounce de 300ms pour eviter les appels multiples lors du scroll rapide

### 10. `src/pages/tamtam/TamTamSocial.tsx`

- **Separer `videosAsVideoCards` dans un useMemo dedie** : Le mapping des videos en format post est recalcule dans `getCurrentPosts` a chaque changement de feedMode. L'extraire dans son propre `useMemo` avec `[videoFeedItems]` comme seule dependance
- **Optimiser le DOM du scroll container** : Les divs placeholder pour la virtualisation n'ont pas de `key` stable basee sur l'index, ce qui peut causer des re-renders inutiles

## Resume des fichiers

| Fichier | Optimisations |
|---------|---------------|
| `GriotAnimationEngine.ts` | Chargement parallele, suppression methodes inutilisees, timeout reduit |
| `GriotStudio.tsx` | Ref au lieu de window global, centralisation concatenation audio |
| `PublishStep.tsx` | Prop audio concatene, suppression useEffect doublon |
| `StoryPreviewPlayer.tsx` | Prop audio concatene, miniatures image au lieu de video |
| `AssetGallery.tsx` | Pagination requete (100 premiers) |
| `BranchingPlayer.tsx` | Integration preload, cleanup audio, lazy media |
| `StoryBuilder.tsx` | TTS parallele, miniatures image |
| `VideoFeedCard.tsx` | preload metadata, cleanup ameliore |
| `useVideoFeed.ts` | Profil realtime, debounce loadMore |
| `TamTamSocial.tsx` | useMemo separe pour videosAsVideoCards |

## Impact attendu

- **Chargement initial** : -40% temps (pagination assets, chargement parallele)
- **Memoire** : -30% usage (suppression videos miniatures, cleanup audio, suppression renderFrames)
- **Transitions Conte Vivant** : Quasi-instantanees (pre-chargement branches)
- **Feed scroll** : Plus fluide (virtualisation optimisee, preload metadata)
- **TTS Conte Vivant** : 3-5x plus rapide (generation parallele)
