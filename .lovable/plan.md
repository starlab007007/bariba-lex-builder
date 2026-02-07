

# Correction Audio + Selecteur de Musique pour Griot Studio

## Probleme identifie

L'audio du narrateur (la voix enregistree par l'utilisateur via le VinylRecorder) est stockee dans `audioBlob` dans GriotStudio.tsx mais **jamais transmise** au preview ni a l'export. Le systeme genere une voix TTS artificielle via l'Edge Function `french-tts` a la place, qui peut echouer silencieusement. Resultat : la video finale n'a pas d'audio.

```text
Flux actuel (CASSE) :
VinylRecorder → audioBlob (stocke mais jamais utilise)
                           ↓
                    useAnimeStoryGenerator → french-tts → audioUrl (TTS, peut echouer)
                           ↓
                    StoryPreviewPlayer(audioUrl=TTS)  ← voix originale PERDUE
                    PublishStep(audioUrl=TTS)          ← voix originale PERDUE
```

## Solution

### 1. Utiliser la voix enregistree du narrateur comme audio principal

La voix du narrateur (le `audioBlob` du VinylRecorder) doit etre l'audio principal de la video, pas le TTS genere.

**Fichier** : `src/components/griot-studio/GriotStudio.tsx`

- Creer un `narrationAudioUrl` a partir du `audioBlob` via `URL.createObjectURL(audioBlob)`
- Passer cette URL a `StoryPreviewPlayer` et `PublishStep` comme audio principal
- Supprimer l'appel TTS de `useAnimeStoryGenerator` (inutile puisque l'utilisateur a deja enregistre sa voix)

```text
Flux corrige :
VinylRecorder → audioBlob → URL.createObjectURL() → narrationAudioUrl
                                                      ↓
                    StoryPreviewPlayer(audioUrl=narrationAudioUrl)  ← voix ORIGINALE
                    PublishStep(audioUrl=narrationAudioUrl)          ← voix ORIGINALE
```

### 2. Ajouter un selecteur de mode audio (avant publication)

Integrer dans l'etape `finalize` (PublishStep) un selecteur de mode audio style TikTok :

- **Mode 1** : Voix du narrateur uniquement (par defaut)
- **Mode 2** : Musique de fond uniquement (depuis la bibliotheque)
- **Mode 3** : Voix du narrateur + musique de fond (volume musique reduit a 20-30%)

### 3. Integrer le composant AudioLibrary existant

Le composant `AudioLibrary.tsx` (deja existant dans `src/components/tamtam/creator/`) sera reutilise dans le `PublishStep` pour permettre la selection de musique de fond. Il dispose deja de :
- Interface TikTok-style avec categories et recherche
- Preview audio avec play/pause
- Hook `useAudioLibrary` et `useTrackPlayer`

### 4. Mixage audio dans l'export video

Modifier la fonction `exportVideo` dans `PublishStep.tsx` pour :
- Combiner voix + musique via Web Audio API (GainNode pour le volume)
- La voix du narrateur reste a volume 1.0
- La musique de fond a volume 0.25 (reduite pour ne pas couvrir la voix)
- Le tout est mixe dans un seul MediaStream avant l'enregistrement MediaRecorder

---

## Changements techniques detailles

### Fichier 1 : `src/components/griot-studio/GriotStudio.tsx`

- Creer un `narrationAudioUrl` = `URL.createObjectURL(audioBlob)` apres l'enregistrement
- Passer `narrationAudioUrl` (voix originale) a `StoryPreviewPlayer` au lieu de `generationResult.audioUrl` (TTS)
- Passer `narrationAudioUrl` + `audioBlob` a `PublishStep`
- Cleanup URL.revokeObjectURL dans reset/unmount

### Fichier 2 : `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts`

- Supprimer les phases de generation TTS (`generating_audio`, appel a `french-tts`) dans `generateFromScenes`
- Le resultat ne contient plus `audioUrl`/`audioBase64` (l'audio vient du blob utilisateur)
- Simplifier le flux : matching illustrations seulement

### Fichier 3 : `src/components/griot-studio/StoryPreviewPlayer.tsx`

- Accepter une prop `narrationAudioUrl` (voix enregistree) en plus de `audioUrl`
- Priorite : utiliser `narrationAudioUrl` si disponible, sinon `audioUrl`
- Aucun changement fonctionnel majeur

### Fichier 4 : `src/components/griot-studio/PublishStep.tsx` (changements majeurs)

- Ajouter un selecteur de mode audio avec 3 options :
  - "Voix seule" (icone Mic)
  - "Musique seule" (icone Music)
  - "Voix + Musique" (icone Mic + Music)
- Integrer un bouton "Choisir une musique" qui ouvre le composant `AudioLibrary`
- Accepter `narrationAudioUrl` et `narrationBlob` comme nouvelles props
- Modifier `exportVideo()` pour mixer les sources audio selon le mode choisi :
  - Mode voix seule : utiliser uniquement `narrationAudioUrl` via MediaElementSource
  - Mode musique seule : utiliser uniquement la musique selectionnee
  - Mode voix + musique : combiner les deux via Web Audio API avec GainNodes (voix=1.0, musique=0.25)

### Fichier 5 : `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts`

- Retirer l'appel `french-tts` de `generateFromScenes()` (etape TTS inutile car on utilise la voix originale)
- Garder l'appel dans `generateStory()` (methode legacy) pour compatibilite

---

## Architecture du mixage audio (Web Audio API, 100% gratuit)

```text
Mode "Voix + Musique":

narrationAudioUrl → Audio() → createMediaElementSource() → GainNode(1.0) ─┐
                                                                            ├→ createMediaStreamDestination() → combinedStream
musicTrackUrl     → Audio() → createMediaElementSource() → GainNode(0.25)─┘
                                                                            
combinedStream + videoStream → MediaRecorder → Blob (video finale avec audio)
```

Tout est fait avec les APIs Web natives (Web Audio API, MediaRecorder, MediaStream) — aucune API payante necessaire.

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/GriotStudio.tsx` | Passer audioBlob/narrationAudioUrl au preview et publish |
| `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` | Supprimer generation TTS dans generateFromScenes |
| `src/components/griot-studio/StoryPreviewPlayer.tsx` | Accepter narrationAudioUrl |
| `src/components/griot-studio/PublishStep.tsx` | Selecteur mode audio + integration AudioLibrary + mixage Web Audio |

## Aucun nouveau fichier a creer

Le composant `AudioLibrary` existant est reutilise tel quel.

