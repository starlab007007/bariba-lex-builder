

## Plan: Corrections des 4 bugs majeurs du Conte Vivant et du Feed

Ce plan traite les 4 bugs identifies dans le tableau de suivi (le bug mineur "Demo interactive" est ignore conformement aux notes).

---

### Bug 1: Narration vocale toujours en anglais

**Probleme**: Le TTS `french-tts` utilise le modele Inworld `tts-1-5-mini` avec des voix anglophones (Timothy, Mark, Sarah, Alex). Meme avec `language: 'fr'`, ces voix parlent en anglais.

**Solution**: 
- Modifier l'edge function `french-tts` pour utiliser **Lovable AI** (gemini) comme premier fallback quand Inworld ne supporte pas bien le francais, et s'appuyer sur ElevenLabs (qui a des voix francaises natives comme Lily et Daniel) comme methode principale.
- Reorganiser la cascade: ElevenLabs d'abord (voix francaises natives), puis Inworld en fallback, puis Web Speech API.
- Cote client dans `SegmentEditor.tsx`, ajouter un fallback Web Speech API en francais si le serveur renvoie `method: 'web-speech-synthesis'`.

**Fichiers modifies**:
- `supabase/functions/french-tts/index.ts` : Inverser la cascade (ElevenLabs avant Inworld)
- `src/features/conte-vivant/components/SegmentEditor.tsx` : Gerer le fallback `web-speech-synthesis` cote client

---

### Bug 2: Une seule image/video prise en compte - doit supporter plusieurs medias

**Probleme**: Le `BranchingPlayer` n'utilise que `media_url` (1 seul media) ou `image_urls[0]` (premier element). Les `image_urls` multiples stockees par `handleAssetSelect` (quand `maxMediaSelection > 1`) ne sont jamais affichees sous forme de diaporama.

**Solution**:
- Dans `BranchingPlayer.tsx`, implementer un **diaporama automatique** quand `image_urls` contient plusieurs URLs: alterner les medias en boucle pendant la duree du segment.
- Passer `maxMediaSelection={12}` dans `StoryBuilder.tsx` pour chaque `SegmentEditor`.
- Dans le `StorySegment` type et le `buildGraph`, propager correctement les `image_urls` multiples.

**Fichiers modifies**:
- `src/features/conte-vivant/components/BranchingPlayer.tsx` : Ajouter logique slideshow
- `src/features/conte-vivant/components/StoryBuilder.tsx` : Passer `maxMediaSelection={12}` aux SegmentEditor
- `src/features/conte-vivant/components/SegmentEditor.tsx` : S'assurer que les previews multiples s'affichent

---

### Bug 3: Illustration non intelligente dans Griot (enregistrement direct)

**Probleme**: Dans `GriotStudio`, lors d'un enregistrement direct, le flow `handleRecordingComplete` -> `startTranscription` -> `handleGenerateFromScenes` appelle l'edge function `generate-anime-story` qui fait deja du matching semantique. Mais quand l'utilisateur utilise le chemin "manuel" (`handleUseAssets`), les assets pre-selectionnes sont utilises tels quels sans matching avec le contenu textuel.

**Solution**:
- Integrer l'utilitaire `autoIllustrate.ts` (deja cree) dans le Griot Studio.
- Apres la transcription (etape `editing`), appeler automatiquement `autoIllustrateSegments` pour pre-matcher les scenes editees avec la bibliotheque anime.
- Ajouter un bouton "Auto-illustrer" dans l'etape `editing` du GriotStudio, similaire a celui du Conte Vivant.

**Fichiers modifies**:
- `src/components/griot-studio/GriotStudio.tsx` : Importer et utiliser `findBestMatch` apres transcription + bouton auto-illustrer
- `src/components/griot-studio/SceneEditor.tsx` : Ajouter bouton auto-illustrer par scene

---

### Bug 4: Contenu de la page d'accueil continue de jouer quand on change d'onglet

**Probleme**: Les composants `VideoFeedCard` et `AudioFeedCard` ne detectent pas le changement de visibilite de la page (tab switch). Les videos/audios continuent de jouer en arriere-plan.

**Solution**:
- Ajouter un hook `usePageVisibility` qui ecoute `visibilitychange` et retourne `isVisible`.
- Dans `VideoFeedCard.tsx`, pauser la video quand `document.hidden === true` et reprendre quand la page redevient visible (si la carte etait active).
- Dans `AudioFeedCard.tsx`, faire de meme pour l'audio.
- Dans `TamTamVideoFeed.tsx`, appliquer la meme logique.

**Fichiers modifies**:
- `src/hooks/usePageVisibility.ts` (nouveau) : Hook partage pour detecter la visibilite
- `src/components/feed/VideoFeedCard.tsx` : Pauser/reprendre sur changement d'onglet
- `src/components/feed/AudioFeedCard.tsx` : Pauser/reprendre sur changement d'onglet
- `src/components/tamtam/TamTamVideoFeed.tsx` : Pauser/reprendre sur changement d'onglet

---

### Resume des fichiers

| Fichier | Action |
|---------|--------|
| `supabase/functions/french-tts/index.ts` | Prioriser ElevenLabs (voix FR) |
| `src/features/conte-vivant/components/SegmentEditor.tsx` | Fallback Web Speech FR + previews multiples |
| `src/features/conte-vivant/components/BranchingPlayer.tsx` | Diaporama multi-medias |
| `src/features/conte-vivant/components/StoryBuilder.tsx` | maxMediaSelection=12 |
| `src/components/griot-studio/GriotStudio.tsx` | Auto-illustration apres transcription |
| `src/components/griot-studio/SceneEditor.tsx` | Bouton auto-illustrer par scene |
| `src/hooks/usePageVisibility.ts` | Nouveau hook visibilite page |
| `src/components/feed/VideoFeedCard.tsx` | Pause sur tab switch |
| `src/components/feed/AudioFeedCard.tsx` | Pause sur tab switch |
| `src/components/tamtam/TamTamVideoFeed.tsx` | Pause sur tab switch |

