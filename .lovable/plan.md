
# Integration complete du trimmer musical dans tous les flux

## Probleme actuel

Le composant `MusicTrimmer` existe mais ne fonctionne pas correctement dans le flux reel :

1. **MusicDrawer** : le trimmer s'ouvre mais la musique trimmee n'est pas utilisee avec le bon `startOffset` dans l'export video (PublishScreen)
2. **PublishStep (Griot Studio)** : utilise `AudioLibrary` qui ne propose aucun trimmer - la musique joue toujours depuis le debut. Le `node.start(0, 0, duration)` ignore le startOffset.
3. Aucun des deux flux n'utilise le `startOffset` dans l'export final

## Modifications prevues

### 1. MusicDrawer.tsx - Correction du flux de trim

Le trimmer s'ouvre deja, mais on va s'assurer que :
- Quand on clique "+" sur un track, le trimmer apparait bien en plein ecran
- La duree de la zone de selection = `videoDuration` (10/15/30/60s)
- Le bouton "Utiliser cette partie" ferme le trimmer ET le drawer, et transmet `startOffset` + `trimmedDuration`

### 2. AudioLibrary.tsx - Ajouter le trimmer au flux Griot

Modifier `AudioLibrary` pour integrer `MusicTrimmer` :
- Ajouter un etat `editingTrack` comme dans MusicDrawer
- Quand l'utilisateur clique sur un track, ouvrir le trimmer au lieu de selectionner directement
- Le callback `onSelectTrack` sera enrichi pour transmettre le `startOffset` et `trimmedDuration`
- Ajouter un nouveau type ou modifier le callback pour inclure les infos de trim

### 3. PublishStep.tsx - Utiliser startOffset dans l'export

Modifier la ligne `node.start(0, 0, duration)` pour les sources musicales :
- Passer le `startOffset` de la musique selectionnee : `musicSource.start(0, startOffset, duration)`
- Stocker le `startOffset` dans un state ou le transmettre via le track selectionne
- Ajouter `musicStartOffset` et `musicTrimDuration` au state de PublishStep

### 4. PublishScreen.tsx - Verifier que l'export utilise les bonnes valeurs

Les metadonnees d'export contiennent deja `startAt` et `duration` mais il faut verifier que l'audio effectif dans le muxing les utilise.

## Details techniques

### AudioLibrary.tsx

```text
Avant : clic sur track -> onSelectTrack(track) directement
Apres : clic sur track -> ouvre MusicTrimmer -> onConfirm -> onSelectTrack(track) avec startOffset
```

Le callback `onSelectTrack` sera modifie pour accepter un second parametre optionnel : `trimInfo?: { startOffset: number, trimmedDuration: number }`

### PublishStep.tsx (ligne 269)

```text
Avant : node.start(0, 0, duration)
Apres : musicSource.start(0, musicStartOffset, duration)
        voiceSource.start(0, 0, duration) // la voix reste inchangee
```

Un nouveau state `musicTrimInfo` stockera `{ startOffset, trimmedDuration }` recu de `handleMusicTrackSelect`.

### Fichiers modifies

- `src/components/tamtam/creator/AudioLibrary.tsx` : ajout du MusicTrimmer, modifier le flux de selection
- `src/components/griot-studio/PublishStep.tsx` : stocker trimInfo, utiliser startOffset dans node.start()
- `src/components/tamtam/creator/MusicDrawer.tsx` : ajustements mineurs pour garantir la fermeture correcte apres confirmation du trim
