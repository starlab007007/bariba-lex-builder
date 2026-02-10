
# Editeur de trim musical (style TikTok)

## Ce qui va etre ajoute

Quand un utilisateur selectionne une musique dans la liste, un panneau d'edition s'ouvre avec :

1. **Une barre de waveform visuelle** - representation des amplitudes audio sous forme de barres verticales (comme dans la capture)
2. **Une zone de selection draggable** (cadre rose/orange) - permet de choisir quelle partie de la musique jouer
3. **Auto-ajustement de la duree** - la largeur de la zone de selection correspond automatiquement a la duree video choisie (10s, 15s, 30s, 60s)
4. **Preview de la partie selectionnee** - bouton Play au centre qui joue uniquement le segment choisi
5. **Integration dans l'export et le feed** - les champs `startOffset` et `trimmedDuration` (deja presents dans le code) seront correctement remplis

## Comment ca fonctionne

```text
[===========================WAVEFORM COMPLETE==============================]
                [====ZONE SELECTIONNEE (30s)====]
                ^                               ^
           startOffset                  startOffset + trimmedDuration
```

L'utilisateur glisse la zone rose/orange sur la waveform pour choisir le segment. La largeur de la zone est fixee par la duree video (ex: 15s). Seule la position horizontale change.

## Details techniques

### Fichier 1 : `src/components/tamtam/creator/MusicTrimmer.tsx` (nouveau)

Composant dedie au trim musical :
- Charge l'audio via `fetch` + `AudioContext.decodeAudioData`
- Extrait les amplitudes (peaks) du buffer pour dessiner la waveform
- Affiche un canvas avec les barres de waveform
- Superpose une zone de selection draggable (touch + mouse) de largeur fixe
- Bouton Play central pour ecouter uniquement le segment selectionne
- Callbacks `onTrimChange(startOffset, trimmedDuration)` vers le parent

Props :
- `audioUrl: string` - URL de la musique
- `totalDuration: number` - duree totale de la musique
- `clipDuration: number` - duree de la video (10/15/30/60s), definit la largeur de la zone
- `startOffset: number` - position initiale
- `onTrimChange: (startOffset: number, trimmedDuration: number) => void`

### Fichier 2 : `src/components/tamtam/creator/MusicDrawer.tsx` (modifie)

- Ajouter un etat `editingTrack` pour savoir quelle musique est en cours d'edition
- Quand l'utilisateur clique sur le bouton "+" d'un track, au lieu de selectionner directement, ouvrir le panneau de trim (`MusicTrimmer`)
- Le panneau de trim remplace temporairement la liste des tracks (animation slide)
- Bouton "Confirmer" pour valider la selection avec le bon `startOffset`
- Le `videoDuration` existant est utilise pour definir la largeur du clip

Flux modifie :
1. Utilisateur clique sur "+" a cote d'une musique
2. Le panneau de trim s'ouvre avec la waveform
3. L'utilisateur glisse la zone de selection
4. Bouton Play pour previsualiser
5. Bouton "Utiliser cette partie" pour confirmer -> `onSelectMusic` est appele avec le bon `startOffset` et `trimmedDuration`

### Integration export (deja en place)

Le `PublishScreen.tsx` utilise deja `selectedMusic.startOffset` et `selectedMusic.trimmedDuration` dans les metadonnees d'export (ligne 313-314). Une fois le trim correctement defini dans le MusicDrawer, les valeurs seront automatiquement transmises a l'export video.

### Integration feed (PublishStep / Griot)

Les composants `PublishStep.tsx` qui utilisent Web Audio API pour le muxing devront respecter le `startOffset` en utilisant `bufferSource.start(0, startOffset, trimmedDuration)` au lieu de `start(0, 0, duration)`. Ceci est deja supporte nativement par l'API Web Audio.
