
# Corrections du trimmer musical : lecture, export et preview

## Problemes identifies

1. **Duree de selection incorrecte** : le `clipDuration` transmis au trimmer peut ne pas correspondre a la duree reelle de la video capturee (seulement la duree selectionnee avant capture, pas la duree effective du fichier video)
2. **La lecture dans le trimmer ne joue pas uniquement la portion selectionnee** : conflit entre le drag et le bouton Play - le pointerDown sur le canvas capture les events avant le bouton Play, empechant la lecture correcte
3. **La portion selectionnee n'est pas dans le rendu final (PublishScreen)** : le K-Engine recoit les metadonnees `startAt` et `duration` mais ne muxe pas l'audio avec le bon offset - il passe juste le blob tel quel
4. **Pas de preview audio avant publication** : l'utilisateur ne peut pas ecouter le mix final (video + musique trimmee) avant de publier

## Modifications prevues

### 1. MusicTrimmer.tsx - Corriger la lecture de la portion selectionnee

- Separer le bouton Play du canvas de drag (le sortir de la zone draggable)
- S'assurer que `togglePlay` arrete toute lecture precedente quand on deplace le trimmer
- Ajouter un auto-play quand on arrete de dragger : a chaque fin de drag, jouer automatiquement 2-3 secondes de la nouvelle position pour donner un apercu instantane
- Ajouter un indicateur visuel de la position de lecture (curseur blanc anime qui traverse la selection)

### 2. MusicDrawer.tsx - Transmettre la duree video reelle

- Verifier que `videoDuration` correspond bien a la duree video capturee (pas seulement la duree selectionnee au depart)
- Si une video est deja capturee, utiliser sa duree reelle comme `clipDuration`

### 3. PublishScreen.tsx - Integrer le startOffset dans l'export K-Engine

Le K-Engine recoit les metadonnees mais n'utilise pas `startAt` pour le muxing audio. Il faut :
- Avant d'appeler `kEngine.exportJob()`, si une musique est selectionnee avec un `startOffset`, creer un blob audio trimme (via Web Audio API) contenant uniquement la portion selectionnee
- Passer ce blob audio trimme au K-Engine au lieu de l'URL complete

Approche technique :
```text
1. Charger le fichier audio complet via fetch + decodeAudioData
2. Creer un nouveau AudioBuffer contenant uniquement [startOffset, startOffset + duration]
3. Encoder ce buffer en WAV/blob
4. Passer ce blob comme source audio au K-Engine
```

### 4. PublishStep.tsx (Griot) - Ajouter bouton preview avant publication

- Ajouter un bouton "Ecouter le mix" dans la zone de finalisation
- Ce bouton joue simultanement la video (canvas animation) et l'audio mixe (voix + musique trimmee) pendant 5 secondes
- Utiliser le meme code de muxing que l'export (Web Audio API) mais connecte au `destination` au lieu d'un `MediaStreamDestination`
- Afficher un mini-player avec bouton stop

### 5. AudioLibrary.tsx - Meme corrections

- S'assurer que `videoDuration` est correctement passe depuis PublishStep
- Deja fonctionnel, pas de changement majeur

## Details techniques

### MusicTrimmer.tsx - Separation drag/play

```text
Avant : bouton Play EN DEDANS de la zone de drag
         -> pointerDown capture le click -> le Play ne fonctionne pas bien

Apres : bouton Play EN DESSOUS de la zone de drag (section separee)
         -> pas de conflit
         -> auto-preview de 2s apres chaque fin de drag
```

Structure modifiee :
```text
[Header: nom du track + duree]
[Waveform canvas - zone de drag uniquement]
[Controles: Play/Pause + timestamps]  <-- bouton Play deplace ici
[Bouton "Utiliser cette partie"]
```

### PublishScreen.tsx - Trim audio avant export

```text
async function trimAudioBlob(audioUrl, startOffset, duration):
  1. fetch(audioUrl) -> arrayBuffer
  2. audioCtx.decodeAudioData(arrayBuffer) -> fullBuffer
  3. Creer offlineCtx(channels, duration * sampleRate, sampleRate)
  4. source.start(0, startOffset, duration) dans offlineCtx
  5. offlineCtx.startRendering() -> trimmedBuffer
  6. Encoder trimmedBuffer en WAV blob
  7. Retourner le blob
```

### PublishStep.tsx - Mini preview player

```text
Nouveau composant inline :
[🎵 Ecouter le mix]  ->  [⏸ Arret | 0:03 / 0:05]

Logique :
- Charger voix + musique dans AudioContext
- Mixer avec les gains (voix: 1.0, musique: 0.25)
- Jouer pendant 5s max
- Lancer aussi l'animation du canvas
```

### Fichiers modifies

1. `src/components/tamtam/creator/MusicTrimmer.tsx` : reorganiser UI, separer Play du drag, auto-preview apres drag
2. `src/components/tamtam/creator/PublishScreen.tsx` : ajouter trimAudioBlob() avant export K-Engine
3. `src/components/griot-studio/PublishStep.tsx` : ajouter bouton preview mix avant publication
4. `src/components/tamtam/creator/MusicDrawer.tsx` : verification duree video reelle
