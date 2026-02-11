

# Optimisation complete du processus musical : trimmer, lecture, export et preview finale

## Problemes identifies

### 1. MusicTrimmer - Bugs de lecture
- Le bouton Play fonctionne mais la lecture ne s'arrete pas correctement quand on deplace la selection (le `stopPlayback` est appele mais l'auto-preview de 2.5s peut creer un conflit si l'utilisateur reclique Play rapidement)
- Pas de feedback visuel clair sur les bornes de la selection (timestamps debut/fin)
- L'AudioContext n'est jamais ferme proprement au unmount

### 2. PublishScreen - Pas de preview du rendu final
- L'ecran de publication affiche la video SANS la musique : le `<video>` joue le fichier brut, jamais le mix video+musique
- Aucun bouton "Ecouter le mix" ou "Jouer le rendu final" avant publication
- L'utilisateur publie a l'aveugle sans savoir comment la musique sonne avec sa video

### 3. PublishStep (Griot) - Preview partielle
- Le bouton "Ecouter le mix" existe deja mais ne joue que l'audio (pas la video/animation)
- L'animation du canvas ne demarre pas pendant la preview
- Le startOffset de la musique est bien utilise dans l'export mais pas verifie dans la preview

### 4. MusicDrawer - Fermeture apres confirmation
- Apres confirmation du trim, le drawer se ferme mais l'utilisateur ne voit pas immediatement le resultat
- Pas de feedback audio instantane apres validation (la musique devrait jouer brievement pour confirmer)

## Plan de corrections

### Fichier 1 : `MusicTrimmer.tsx` - Robustesse

- Fermer l'AudioContext au unmount pour eviter les fuites memoire
- Ajouter une guard dans `playSelection` pour eviter les lectures simultanees
- Ameliorer le formatage des timestamps pour montrer `debut -> fin` de la selection

### Fichier 2 : `PublishScreen.tsx` - Preview du rendu final avec musique

C'est le changement principal. Ajouter un systeme de preview audio+video synchronise :

- Ajouter un bouton "Ecouter le rendu" a cote du bouton Play existant (ou le remplacer)
- Quand l'utilisateur clique : charger la musique trimmee via Web Audio API, synchroniser avec le `<video>` element
- Le `<video>` joue normalement, et l'audio de la musique joue en parallele avec le bon offset et volume
- Ajouter un etat `isPreviewingMix` et un bouton Stop
- Au stop ou fin de la video : arreter l'audio

Logique technique :
```text
1. Creer un AudioContext temporaire
2. Si selectedMusic avec startOffset > 0 : fetch + decodeAudioData + start(0, startOffset, videoDuration)
3. Si startOffset === 0 : fetch + decodeAudioData + start(0, 0, videoDuration)
4. Jouer le <video> element en meme temps
5. Volume musique: selectedMusic.volume / 100
6. A la fin ou au stop : fermer AudioContext, arreter video
```

### Fichier 3 : `PublishStep.tsx` - Preview complete (audio + animation)

Ameliorer la preview existante :
- Quand l'utilisateur clique "Ecouter le mix", lancer aussi l'animation du canvas via `engine.startSlideshowPreview()`
- Arreter l'animation quand la preview s'arrete
- Augmenter la duree de preview de 5s a la duree complete (ou max 15s)

### Fichier 4 : `MusicDrawer.tsx` - Feedback post-confirmation

- Apres `confirmTrim()`, jouer 1 seconde de la portion selectionnee avant de fermer le drawer
- Afficher un toast de confirmation avec les bornes temporelles

### Fichier 5 : `audioTrimmer.ts` - Validation des parametres

- Ajouter une validation : si `startOffset + duration > fullBuffer.duration`, clipper automatiquement
- Ajouter un log de debug pour tracer le trim effectif

## Details techniques

### PublishScreen.tsx - Architecture de la preview

```text
Nouveaux states :
- isPreviewingMix: boolean
- previewAudioCtx: AudioContext | null (ref)
- previewSource: AudioBufferSourceNode | null (ref)

Nouveau handler : toggleMixPreview()
  1. Si isPreviewingMix -> stop audio, pause video
  2. Sinon :
     a. Creer AudioContext
     b. Fetch musicUrl (ou trimmedUrl si offset > 0)
     c. decodeAudioData
     d. createBufferSource + createGain (volume = selectedMusic.volume / 100)
     e. connect destination
     f. source.start(0, startOffset, videoDuration)
     g. videoRef.current.currentTime = 0; videoRef.current.play()
     h. setIsPreviewingMix(true)

UI : Le bouton Play central change pour indiquer "Mix" quand une musique est selectionnee
```

### PublishStep.tsx - Animation pendant preview

```text
Modifier togglePreview() :
  - Apres demarrage des sources audio
  - Appeler engineRef.current.startSlideshowPreview(previewDur, animStyle)
  - Au stop : engineRef.current.stopPreview()
```

### Fichiers modifies (resume)

1. `src/components/tamtam/creator/MusicTrimmer.tsx` : cleanup AudioContext, guard de lecture
2. `src/components/tamtam/creator/PublishScreen.tsx` : ajout preview mix video+musique  
3. `src/components/griot-studio/PublishStep.tsx` : animation canvas pendant preview
4. `src/components/tamtam/creator/MusicDrawer.tsx` : feedback audio post-trim
5. `src/utils/audioTrimmer.ts` : validation des bornes

