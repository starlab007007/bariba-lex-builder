
# Plan de correction : Persistance audio, Media et Integration Feed

## Problemes critiques identifies

### PROBLEME 1 : Audio/voix perdus apres publication (CRITIQUE)
L'enregistrement audio via VinylRecorder et le recorder inline cree des URLs temporaires (`blob:https://...`) via `URL.createObjectURL()`. Ces URLs sont valides uniquement dans la session navigateur courante. Quand le graph est sauvegarde dans la base de donnees via `createStory()`, ces URLs blob sont stockees telles quelles dans le champ JSON `graph`. Au rechargement ou pour un autre utilisateur, ces URLs sont mortes -- l'audio ne peut plus etre lu.

**Solution** : Avant publication, uploader chaque blob audio (narration + musique) vers le stockage fichiers, puis remplacer les URLs blob par des URLs publiques permanentes dans le graph.

### PROBLEME 2 : Photos/videos locales perdues (meme cause)
Si un utilisateur selectionne un media depuis la galerie avec une URL Supabase, ca fonctionne. Mais si un media est genere localement (capture, blob), le meme probleme de blob URL s'applique.

**Solution** : Verifier et uploader tout media avec URL blob avant publication.

### PROBLEME 3 : Le conte publie n'apparait pas dans le feed video
Le feed video (`TamTamSocial`, `useVideoFeed`) lit uniquement la table `videos`. Les contes publies vont dans `conte_vivant_stories` -- une table completement separee. Il n'y a aucun pont entre les deux.

**Solution** : Ajouter une entree dans le feed video avec un marqueur `template_id: 'conte-vivant'` et stocker le `story_id` dans les metadata. Le composant feed detectera ce type et lancera le `BranchingPlayer` au lieu d'une lecture video standard.

---

## Plan d'implementation

### Etape 1 : Creer un service d'upload des blobs audio/media

Creer `src/features/conte-vivant/services/storyAssetUploader.ts` :
- Fonction `uploadStoryAssets(graph, segments)` qui :
  1. Parcourt tous les segments du graph
  2. Detecte les URLs qui commencent par `blob:`
  3. Upload chaque blob vers le storage (bucket `videos` ou creer un bucket `story-assets`)
  4. Remplace les URLs blob par les URLs publiques permanentes
  5. Retourne le graph nettoye avec des URLs persistantes
- Gestion specifique pour `narrator_audio_url`, `audio_url`, `media_url`, `background_music_url`

### Etape 2 : Modifier le flux de publication dans ConteVivantStudio

Modifier `handlePublish` dans `ConteVivantStudio.tsx` :
- Avant d'appeler `createStory()`, appeler `uploadStoryAssets()` pour uploader les blobs
- Passer les blobs audio depuis les `SegmentDraft` (champs `narrator_audio_blob`, `audio_blob`) au service d'upload
- Le `StoryBuilder` doit transmettre les blobs en plus du graph lors de l'appel a `onPublish`

### Etape 3 : Passer les blobs audio au flux de publication

Modifier `StoryBuilder.tsx` :
- `buildGraph()` retourne deja les URLs -- mais les blobs sont dans les `SegmentDraft` (non dans le graph)
- Creer une fonction `collectBlobs()` qui retourne un mapping `segmentId -> { narrationBlob, mediaBlob }`
- Modifier `onPublish` pour passer les blobs en parametre supplementaire
- Modifier l'interface `StoryBuilderProps` pour accepter `onPublish(graph, title, description, blobs)`

### Etape 4 : Publier dans le feed video apres publication du conte

Modifier `ConteVivantStudio.tsx` :
- Apres `publishStory(story.id)`, creer egalement une entree dans la table `videos` :
  - `video_url` : URL de la premiere image/video du conte (ou une URL de thumbnail)
  - `template_id` : `'conte-vivant'`
  - `template_name` : `'Conte Vivant'`
  - `metadata` : `{ story_id: story.id, is_interactive: true }`
  - `is_public` : true
- Cela permet au conte d'apparaitre dans le feed

### Etape 5 : Modifier le feed pour supporter les contes interactifs

Modifier `src/pages/tamtam/TamTamSocial.tsx` (ou `VideoFeedCard`) :
- Detecter quand un post a `template_id === 'conte-vivant'` ou `metadata.is_interactive === true`
- Au lieu de jouer une video, afficher un bouton "Jouer le conte" qui ouvre le `BranchingPlayer` en plein ecran
- Charger le graph depuis `conte_vivant_stories` via le `story_id` dans les metadata

### Etape 6 : Generer une thumbnail pour le conte

Dans le flux de publication :
- Si le segment d'introduction a un `media_url` (photo), l'utiliser comme thumbnail
- Si c'est une video, capturer la premiere frame
- Uploader la thumbnail et la passer a l'entree `videos`

---

## Resume des fichiers a modifier/creer

| Fichier | Action |
|---------|--------|
| `src/features/conte-vivant/services/storyAssetUploader.ts` | **Nouveau** - Upload blobs vers storage |
| `src/features/conte-vivant/components/StoryBuilder.tsx` | Ajouter `collectBlobs()`, modifier `onPublish` signature |
| `src/features/conte-vivant/components/ConteVivantStudio.tsx` | Upload assets avant publication + creer entree feed |
| `src/pages/tamtam/TamTamSocial.tsx` | Detecter et afficher les contes interactifs dans le feed |
| `src/components/feed/VideoFeedCard.tsx` | Support du type conte interactif |

## Details techniques

### Detection des URLs blob
```text
const isBlobUrl = (url: string) => url?.startsWith('blob:');
```

### Upload pattern
```text
1. Lire le blob depuis le SegmentDraft (narrator_audio_blob)
2. Generer un nom de fichier unique: `stories/${storyId}/${segmentId}-narration.webm`
3. Upload vers storage bucket 'videos'
4. Obtenir l'URL publique
5. Remplacer dans le graph
```

### Entree feed pour conte interactif
```text
{
  video_url: thumbnailUrl ou premiere media URL,
  thumbnail_url: thumbnailUrl,
  template_id: 'conte-vivant',
  template_name: 'Conte Vivant',
  title: titre du conte,
  metadata: { story_id: '...', is_interactive: true, total_segments: N, total_endings: M }
}
```

### Detection dans le feed
```text
if (post.metadata?.is_interactive || post.templateId === 'conte-vivant') {
  // Afficher badge "Conte Interactif" + bouton "Jouer"
  // Au clic: charger graph depuis conte_vivant_stories et ouvrir BranchingPlayer
}
```
