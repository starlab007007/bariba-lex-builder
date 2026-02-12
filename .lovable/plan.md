

# Conte Vivant -- Refonte Immersive Audio-First

## Resume

Transformer le systeme Conte Vivant actuel (3 segments textuels, sans medias) en une experience immersive 100% audio-first avec 11 segments interactifs utilisant les 300+ photos/videos IA de `anime_scene_library`. Navigation uniquement par icones et gestes tap.

## Etat actuel analyse

- **ConteVivantStudio** : home/builder/player avec demo 3 segments (texte seul, pas de medias)
- **BranchingPlayer** : utilise `useStoryGraph` pour la navigation DAG, `useBranchPreload` pour le pre-cache, `useChoiceTimer` pour le timer 5s
- **ChoiceOverlay** : boutons textuels avec barre horizontale
- **EndingCard** : ecran basique avec texte
- **SegmentEditor** : editeur texte + enregistrement audio basique (pas d'AssetGallery)
- **StoryBuilder** : 6 etapes formulaire, pas de selection de medias visuels
- **Types** : `StorySegment` n'a pas de `mediaType`, `media_url`, `color`, `position`

## Plan d'implementation (10 etapes)

### Etape 1 : Types mis a jour

Fichier modifie : `src/features/conte-vivant/types/story.types.ts`

Ajouter aux interfaces existantes :
- `StorySegment` : `mediaType`, `media_url`, `narrator_audio_url`, `choice_audio_url`, `background_music_url`
- `StoryChoice` : `color`, `position`
- `SegmentDraft` : `mediaType`, `media_url`, `narrator_audio_blob`, `narrator_audio_url`

### Etape 2 : Conte demo 11 segments

Nouveau fichier : `src/features/conte-vivant/data/demoStory.ts`

Fonction `loadDemoStory()` qui :
- Requete `anime_scene_library` pour 7 assets reels (village/elder/photo, journey/group/video, forest/elder/photo, etc.)
- Construit un StoryGraph complet avec 11 segments : intro, guerriers, devin, piege, poursuite, potion, chant + 4 segments intermediaires
- 4 fins avec badges : Guerrier, Cavalier, Sage, Griot
- Choix avec couleurs (#FF6B35, #00D4AA, #22C55E, #A855F7, #F5A623, #EC4899) et positions (left/right)

### Etape 3 : 6 nouveaux composants visuels

**3a. KenBurnsPhoto.tsx** -- Photo avec animation CSS zoom+pan 12s, 4 directions aleatoires, fade-in 300ms

**3b. AudioWaveBar.tsx** -- 5 barres verticales animees (CSS keyframes waveHeight), couleur ambre #F5A623, position absolue en bas

**3c. CircularTimer.tsx** -- Cercle SVG 60px, stroke dore #F5A623, stroke-dashoffset anime sur 5s, chiffre au centre, rouge sous 2s

**3d. ProgressDots.tsx** -- Indicateur points lumineux en haut centre, point actuel ambre, precedents blancs, futurs gris

**3e. GoldenParticles.tsx** -- 12 cercles dores animes en radial autour du badge de fin, framer-motion scale+translate+opacity

**3f. SegmentTransition.tsx** -- Overlay noir crossfade 300ms entre segments, callback onMidpoint pour changer de segment

### Etape 4 : BranchingPlayer refonte complete

Fichier modifie : `src/features/conte-vivant/components/BranchingPlayer.tsx`

Remplacement complet :
- Accepte un `storyGraph` avec les nouvelles proprietes (media_url, mediaType, color, position)
- Fond #08080c noir profond
- Photos : KenBurnsPhoto en plein ecran 9:16
- Videos : `<video>` natif plein ecran, autoPlay, playsInline
- AudioWaveBar en bas (animation simulee)
- ProgressDots en haut centre
- Tap pause/play sur l'ecran
- Au moment du choix : image scale(0.85) + blur(4px) + overlay noir 40% + vibration haptic
- Transition crossfade 300ms via SegmentTransition
- Pre-cache via useBranchPreload existant
- Timer auto : durationSec puis affiche choix ou ending
- Utilise useStoryGraph pour la navigation (adapte pour les nouveaux champs)

### Etape 5 : ChoiceOverlay refonte audio-first

Fichier modifie : `src/features/conte-vivant/components/ChoiceOverlay.tsx`

Remplacement complet :
- Icones GRANDES 48px emoji, PAS de texte obligatoire
- Couleurs distinctes par choix (utilise choice.color)
- Positions gauche/droite (utilise choice.position)
- CircularTimer dore au centre en haut (remplace barre horizontale)
- Bordure pulsante avec glow animation (boxShadow anime)
- Haptic navigator.vibrate(100) a l'apparition
- Flash blanc si timeout

### Etape 6 : EndingCard refonte avec particles

Fichier modifie : `src/features/conte-vivant/components/EndingCard.tsx`

Remplacement complet :
- Fond #08080c avec gradient radial subtil
- Badge rebondissant animation spring + GoldenParticles autour
- Indicateurs visuels des fins (icones des badges, pas juste texte "2/4")
- 3 boutons icones ronds : Rejouer (or), Partager (bleu), Suivant (vert)
- Zero texte obligatoire pour naviguer

### Etape 7 : SegmentEditor ameliore

Fichier modifie : `src/features/conte-vivant/components/SegmentEditor.tsx`

Ajouts a l'existant :
- Bouton icone qui ouvre AssetGallery (importe depuis griot-studio) en mode single-select
- Preview miniature 48x86px de l'asset selectionne
- Stocke media_url et mediaType dans le draft
- Pour les choix : 5 pastilles colorees cliquables + 3 boutons position (gauche/droite/centre)

### Etape 8 : StoryBuilder ameliore

Fichier modifie : `src/features/conte-vivant/components/StoryBuilder.tsx`

Ajouts a l'existant :
- Bouton musique qui ouvre AudioLibrary (importe depuis tamtam/creator)
- Miniatures 40x72px dans la liste des segments
- Validation : segments sans media_url ont une bordure orange clignotante
- buildGraph() inclut media_url, mediaType, color, position dans la sortie

### Etape 9 : ConteVivantStudio ameliore

Fichier modifie : `src/features/conte-vivant/components/ConteVivantStudio.tsx`

Changements :
- Fond bg-[#08080c]
- Bouton "Demo" appelle loadDemoStory() async puis ouvre BranchingPlayer avec les 11 segments
- Import de loadDemoStory depuis data/demoStory
- Icones au lieu de texte pour les boutons principaux

### Etape 10 : Adaptation useStoryGraph

Fichier modifie : `src/features/conte-vivant/hooks/useStoryGraph.ts`

Le hook existant utilise `next_segment` dans les choix. Le BranchingPlayer refait gere son propre state directement a partir du storyGraph. Pas de modification majeure necessaire, juste s'assurer que les types sont compatibles avec les nouveaux champs.

## Fichiers

**7 nouveaux** :
1. `src/features/conte-vivant/data/demoStory.ts`
2. `src/features/conte-vivant/components/KenBurnsPhoto.tsx`
3. `src/features/conte-vivant/components/AudioWaveBar.tsx`
4. `src/features/conte-vivant/components/CircularTimer.tsx`
5. `src/features/conte-vivant/components/ProgressDots.tsx`
6. `src/features/conte-vivant/components/GoldenParticles.tsx`
7. `src/features/conte-vivant/components/SegmentTransition.tsx`

**6 modifies** :
1. `src/features/conte-vivant/types/story.types.ts`
2. `src/features/conte-vivant/components/BranchingPlayer.tsx`
3. `src/features/conte-vivant/components/ChoiceOverlay.tsx`
4. `src/features/conte-vivant/components/EndingCard.tsx`
5. `src/features/conte-vivant/components/SegmentEditor.tsx`
6. `src/features/conte-vivant/components/StoryBuilder.tsx`
7. `src/features/conte-vivant/components/ConteVivantStudio.tsx`

**Non modifies** : VinylRecorder, AssetGallery, AudioLibrary, MusicDrawer, useChoiceTimer, useBranchPreload, storyGraphApi, GriotAnimationEngine

**Zero nouvelle dependance npm.**

## Design System

| Element | Valeur |
|---|---|
| Fond principal | #08080c |
| Surface | #0f0f18, #161622 |
| Or/accent | #F5A623 |
| Action gauche | #FF6B35 |
| Action droite | #00D4AA |
| Border radius cartes | 14px |
| Border radius boutons ronds | 50% |
| Touch target minimum | 48px |
| Haptic | navigator.vibrate() |

