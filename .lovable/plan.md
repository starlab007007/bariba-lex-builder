
# Plan : Integrer les audios par scene dans le rendu final

## Diagnostic

Les audios generes par scene dans le `SceneEditor` (via Inworld TTS) sont stockes sur chaque objet `scene.audioBase64` / `scene.audioUrl`, mais **jamais utilises** dans le pipeline de rendu :

| Composant | Probleme |
|-----------|----------|
| `StoryPreviewPlayer.tsx` (ligne 89) | Utilise uniquement `narrationAudioUrl \|\| audioUrl` (props globales). Ignore `scene.audioUrl` |
| `PublishStep.tsx` (ligne 95) | `effectiveNarrationUrl = localNarrationUrl \|\| narrationAudioUrl \|\| audioUrl`. Ignore les audios par scene |
| `GriotStudio.tsx` (ligne 882) | Passe `generationResult.audioUrl` (global) mais pas les audios individuels des scenes |

**Resultat** : Quand l'utilisateur genere des voix par scene dans l'editeur, elles ne sont jamais lues ni dans la preview ni dans la video finale.

## Solution

Concatener les audios par scene en un seul blob audio avant de les passer au preview et au rendu final. Cela se fait dans `GriotStudio.tsx` au moment de la transition vers l'etape preview/finalize.

### 1. `src/components/griot-studio/GriotStudio.tsx` - Agreger les audios

Apres `generateFromScenes`, verifier si les scenes contiennent des `audioBase64` individuels. Si oui, les concatener en un seul fichier audio (via Web Audio API `decodeAudioData` + `OfflineAudioContext`) et stocker le resultat dans `narrationAudioUrl`.

```text
Logique :
1. Filtrer les scenes qui ont un audioBase64
2. Decoder chaque base64 en AudioBuffer
3. Creer un OfflineAudioContext de la duree totale
4. Positionner chaque buffer a son offset temporel (cumul des durees)
5. Rendre le resultat en un seul blob audio
6. Stocker dans narrationAudioUrl
```

### 2. `src/components/griot-studio/GriotStudio.tsx` - Fonction utilitaire

Creer une fonction `concatenateSceneAudios(scenes: StoryScene[])` qui :
- Prend les scenes avec `audioBase64` et `durationSeconds`
- Retourne un `{ blob: Blob, url: string }` ou `null` si aucun audio

### 3. `src/components/griot-studio/StoryPreviewPlayer.tsx` - Fallback par scene

Ajouter un fallback : si `narrationAudioUrl` et `audioUrl` sont vides, verifier si les scenes individuelles ont des `audioUrl` et les jouer en sequence (un audio par scene, declenche au changement de scene).

### 4. `src/components/griot-studio/PublishStep.tsx` - Fallback par scene

Meme logique : si `effectiveNarrationUrl` est vide, concatener les audios des scenes pour le mixage final. Utiliser la meme technique Web Audio API deja en place dans le composant.

## Approche technique detaillee

### Concatenation audio (fonction partagee)

```text
async function concatenateSceneAudios(scenes): Promise<Blob | null>
  1. scenes.filter(s => s.audioBase64)
  2. Si aucun => return null
  3. Decoder chaque base64 en ArrayBuffer puis AudioBuffer
  4. Calculer duree totale = somme des durees de chaque buffer
  5. OfflineAudioContext(1, sampleRate * dureeTotale, sampleRate)
  6. Pour chaque scene : createBufferSource, positionner a l'offset cumule
  7. startRendering() => AudioBuffer final
  8. Encoder en WAV blob
  9. return blob
```

### Integration dans GriotStudio

Apres la generation des scenes (quand `generationResult` est disponible et qu'il n'y a pas de `audioUrl` global), lancer la concatenation et stocker le resultat :

```text
if (!generationResult.audioUrl && scenes.some(s => s.audioBase64)) {
  const blob = await concatenateSceneAudios(scenes);
  if (blob) {
    setNarrationAudioUrl(URL.createObjectURL(blob));
    setAudioBlob(blob);
  }
}
```

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/GriotStudio.tsx` | Ajouter concatenation des audios par scene apres generation, stocker dans `narrationAudioUrl` |
| `src/components/griot-studio/StoryPreviewPlayer.tsx` | Ajouter fallback lecture sequentielle des audios par scene |
| `src/components/griot-studio/PublishStep.tsx` | Ajouter fallback concatenation des audios par scene pour le mixage final |

## Impact

- Les voix narratives generees par scene seront entendues dans la preview
- Les voix narratives generees par scene seront integrees dans la video finale exportee
- Compatible avec le systeme existant (si un audio global existe, il est prioritaire)
- Aucune modification des edge functions necessaire
