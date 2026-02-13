
# Plan : Narration vocale par scene dans l'Editeur de Scenes

## Objectif

Ajouter a chaque scene de l'editeur la possibilite de :
1. Choisir une voix narrative (Timothy, Mark, Sarah, Alex) ou "Aucune voix"
2. Generer l'audio TTS pour cette scene individuellement via Inworld TTS-1.5 Mini
3. Ecouter un apercu de la narration directement dans l'editeur
4. Transmettre ces audios au rendu final du conte anime

Si aucune voix n'est selectionnee ou si le texte n'est pas en francais, la generation audio est ignoree et le texte brut est conserve tel quel.

## Modifications prevues

### 1. `src/components/griot-studio/SceneEditor.tsx` - Interface enrichie

**Etendre le type `EditableScene`** pour inclure les champs audio :

```text
export interface EditableScene {
  id: string;
  text: string;
  emotion: string;
  sceneType?: string;
  voice?: 'narrator' | 'announcer' | 'female' | 'alloy';  // optionnel = pas de voix
  audioBase64?: string;       // audio genere en base64
  audioUrl?: string;          // blob URL pour lecture
  isGeneratingAudio?: boolean; // etat de generation
}
```

**Ajouter dans chaque carte de scene** :
- Un selecteur de voix (5 options : Timothy, Mark, Sarah, Alex, "Sans voix") sous forme de boutons compacts, similaire au selecteur d'emotion
- Un bouton "Generer la voix" qui appelle `french-tts` pour cette scene uniquement
- Un mini-lecteur audio (play/pause) si l'audio a ete genere
- Un indicateur de chargement pendant la generation
- Si la voix change, l'audio existant est efface (regeneration necessaire)

**Logique de generation** :
- Appel a `supabase.functions.invoke('french-tts', { body: { text, voice, returnAudio: true } })`
- Stockage du `audioBase64` et creation d'un `audioUrl` blob dans la scene
- Si `voice` est `undefined` ou vide, pas de generation possible (bouton desactive)

### 2. `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` - Utiliser les audios par scene

**Modifier `generateFromScenes`** (ligne 223) pour :
- Verifier si les scenes ont des `audioBase64` individuels
- Si oui, les combiner pour creer la narration globale du conte
- Passer ces audios dans le `GenerationResult` pour le rendu final

```text
// Au lieu de "No TTS generation", on recupere les audios des scenes
const scenesWithAudio = scenesWithUrls.map((scene, i) => ({
  ...scene,
  audioBase64: editedScenes[i]?.audioBase64,
  audioUrl: editedScenes[i]?.audioUrl,
}));
```

**Etendre `StoryScene`** pour inclure `audioBase64` et `audioUrl` par scene.

**Etendre `GenerationResult`** pour inclure les audios par scene :
```text
export interface GenerationResult {
  scenes: StoryScene[];
  audioBase64?: string;      // audio global (existant)
  audioUrl?: string;         // audio global (existant)
  sceneAudios?: { sceneNumber: number; audioBase64: string }[];  // par scene
  totalDuration: number;
}
```

### 3. Import de `NARRATOR_VOICES` depuis `story.types.ts`

Reutiliser la constante `NARRATOR_VOICES` deja definie dans `src/features/conte-vivant/types/story.types.ts` pour eviter la duplication, en ajoutant une option "Sans voix" dans l'UI.

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/SceneEditor.tsx` | Ajout selecteur voix, bouton TTS, mini-lecteur audio par scene |
| `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` | Recuperation audios par scene dans `generateFromScenes`, extension des types |

## Politique francais uniquement

- La generation TTS ne se fait que si une voix est selectionnee
- L'edge function `french-tts` force deja `language: 'fr'`
- Si le texte n'est pas en francais, le systeme ne bloque pas mais le resultat sera en francais (prononciation forcee)
- L'option "Sans voix" permet d'ignorer completement la narration pour une scene
