
# Plan : Integration TTS ElevenLabs pour narration automatique du Conte Vivant

## Objectif

Chaque segment du conte aura son texte narratif automatiquement converti en audio via ElevenLabs (deja configure avec API key). L'audio genere remplacera/completera la narration manuelle. La duree du segment sera synchronisee avec la duree de l'audio genere.

## Architecture

Le projet dispose deja d'une Edge Function `french-tts` qui utilise ElevenLabs avec `returnAudio: true`. On va la reutiliser directement depuis le `SegmentEditor` pour generer l'audio TTS a partir du `text_content` de chaque segment.

## Changements

### 1. `src/features/conte-vivant/components/SegmentEditor.tsx`

**Ajouter un bouton "Generer la voix" :**

- Nouveau bouton visible quand `text_content` est non vide et qu'il n'y a pas deja de narration audio
- Au clic, appelle `french-tts` avec `{ text: segment.text_content, voice: 'narrator', returnAudio: true }`
- Si succes (`audioBase64` recu) :
  - Convertir le base64 en Blob
  - Creer une URL blob et l'assigner a `narrator_audio_url` et `narrator_audio_blob`
  - Calculer la duree de l'audio via un element `<audio>` temporaire et mettre a jour `segment.duration`
- Afficher un indicateur de chargement "Generation de la voix..." pendant l'appel
- En cas d'echec, toast d'erreur

**Auto-generation optionnelle apres transcription :**

- Apres la transcription automatique (quand `autoTranscribe` remplit `text_content`), proposer automatiquement la generation TTS
- Enchainement : Enregistrement vocal -> Transcription Mistral -> Generation voix ElevenLabs -> Audio TTS injecte dans le segment

**Synchronisation duree :**

- Quand l'audio TTS est genere, calculer sa duree reelle avec `audio.duration` et mettre a jour `segment.duration` pour que la presentation visuelle soit synchronisee

### 2. `src/features/conte-vivant/components/StoryBuilder.tsx`

**Generation TTS en lot avant publication :**

- Avant `handlePublish`, pour chaque segment dont le `text_content` est rempli mais sans `narrator_audio_url`, generer automatiquement l'audio TTS
- Afficher une barre de progression "Generation des voix... (2/5)"
- Cela garantit que TOUS les segments du produit final ont un audio de narration

### 3. Aucune nouvelle Edge Function necessaire

La fonction `french-tts` existante fait deja exactement ce qu'il faut avec `returnAudio: true` et ElevenLabs.

## Details techniques

### Flux de generation TTS dans SegmentEditor

```text
1. Utilisateur ecrit ou transcrit le texte narratif
2. Clic sur "Generer la voix" (ou auto apres transcription)
3. -> POST /functions/v1/french-tts { text, voice: "narrator", returnAudio: true }
4. -> Reponse: { audioBase64, audioFormat: "audio/mpeg" }
5. -> Convertir base64 en Blob: atob() -> Uint8Array -> Blob
6. -> Creer URL blob, assigner a narrator_audio_url + narrator_audio_blob
7. -> Calculer duree audio avec element Audio temporaire
8. -> Mettre a jour segment.duration = duree audio
9. -> Toast succes "Voix generee"
```

### Conversion base64 vers Blob

```text
- Utiliser data URI: `data:audio/mpeg;base64,${audioBase64}` pour preview
- Creer Blob via fetch du data URI pour le stockage
- Assigner le Blob au segment pour upload ulterieur via storyAssetUploader
```

### Generation en lot (StoryBuilder)

```text
Avant publication :
  Pour chaque segment dans [introSegment, ...branches.map(b => b.segment), ...subBranches] :
    Si text_content non vide ET pas de narrator_audio_url :
      -> Appeler french-tts avec returnAudio: true
      -> Convertir et assigner l'audio
      -> Mettre a jour la duree
  Puis continuer avec handlePublish normal
```

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/features/conte-vivant/components/SegmentEditor.tsx` | Bouton "Generer la voix", auto-TTS apres transcription, sync duree |
| `src/features/conte-vivant/components/StoryBuilder.tsx` | Generation TTS en lot avant publication |
