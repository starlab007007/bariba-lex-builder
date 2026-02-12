

# Plan : Transcription automatique des narrations + Decompte + Segments 30s

## Objectif

Chaque enregistrement vocal dans le Conte Vivant sera automatiquement transcrit via Mistral Voxtral Mini et le texte sera injecte dans le champ "texte narratif du segment". Un decompteur visuel sera affiche pendant l'enregistrement, et la duree maximum sera augmentee a 30 secondes pour les segments d'introduction et de branches.

## Changements

### 1. `src/features/conte-vivant/components/SegmentEditor.tsx`

**Transcription automatique apres enregistrement :**
- Modifier `handleNarrationComplete` pour appeler la fonction Edge `transcribe-audio` avec le blob audio
- Une fois la transcription recue, remplir automatiquement le champ `text_content` du segment
- Afficher un indicateur de chargement "Transcription en cours..." pendant l'appel
- En cas d'echec, afficher un toast d'erreur mais conserver l'audio

**Augmenter la duree max a 30 secondes :**
- Le `VinylRecorder` dans le Dialog recevra `maxDuration={30}` au lieu de la valeur actuelle (30 deja en place, a verifier)

**Meme logique pour l'enregistrement direct (micro inline) :**
- Le `startRecording` / `stopRecording` inline declenchera aussi la transcription automatique
- Ajouter un decompteur de temps visible pendant l'enregistrement inline (affichage du temps ecoule et du temps restant)
- Stopper automatiquement l'enregistrement quand la duree limite (30s) est atteinte

### 2. `src/components/griot-studio/VinylRecorder.tsx`

- Le VinylRecorder a deja un decompteur et un arret automatique a `maxDuration` -- aucun changement necessaire ici
- Il gere deja le gain et l'affichage du temps

### 3. `src/features/conte-vivant/components/StoryBuilder.tsx`

- Verifier que `defaultSegment` utilise `duration: 30` au lieu de `15` pour permettre des segments de 30 secondes par defaut

## Details techniques

### Flux de transcription dans SegmentEditor

```text
1. Utilisateur enregistre via VinylRecorder ou micro inline
2. onRecordingComplete(blob, duration) est appele
3. -> Sauvegarder blob + URL dans le segment (comportement actuel)
4. -> Envoyer le blob a POST /functions/v1/transcribe-audio (FormData)
5. -> Si succes : onChange({ ...segment, text_content: result.text })
6. -> Si echec : toast.error("Transcription echouee")
7. -> Indicateur "Transcription..." visible pendant l'appel
```

### Decompteur inline pour l'enregistrement direct

L'enregistrement direct dans SegmentEditor (bouton micro) aura :
- Un timer affiche en temps reel (ex: "12s / 30s")
- Un arret automatique a 30 secondes via `setTimeout` + verification dans l'intervalle
- Meme logique de transcription automatique apres arret

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/features/conte-vivant/components/SegmentEditor.tsx` | Transcription auto, decompteur inline, duree 30s |
| `src/features/conte-vivant/components/StoryBuilder.tsx` | `defaultSegment` duration: 30 |

