
# Corriger la lecture audio sur iOS Safari et les interactions du feed

## Diagnostic

### Cause principale : Incompatibilite MIME type sur iOS Safari
Le fichier `audioMimeUtils.ts` existe dans le projet avec toute la logique necessaire pour detecter le bon format audio selon le navigateur, mais il n'est **jamais utilise** dans `TamTamCreatePost.tsx`.

Voici ce qui se passe :
1. L'enregistrement dans `TamTamCreatePost` utilise `new MediaRecorder(stream)` sans specifier de MIME type
2. Sur iOS Safari, le MediaRecorder enregistre en `audio/mp4` par defaut
3. Mais le blob est force a `{ type: 'audio/webm' }` (ligne 241)
4. Le fichier est uploade avec l'extension `.webm` et le contentType `audio/webm`
5. Quand iOS Safari essaie de lire ce fichier `.webm`, il echoue car Safari ne supporte pas le format WebM audio

Les 3 fichiers audio existants en base ont tous ete uploades en `.webm` avec le MIME `audio/webm` -- ils sont donc injouables sur Safari/iOS.

### Probleme secondaire : Le bouton Suivre
Le bouton "Suivre" fonctionne techniquement (via `usePostInteractions`), mais necessite que l'utilisateur soit connecte. Si non connecte, un toast s'affiche. Ce hook est deja correctement implemente.

## Corrections

### Fichier 1 : `src/components/tamtam/TamTamCreatePost.tsx`

**A. Importer et utiliser les utilitaires MIME audio existants**

Ajouter l'import de `getSupportedAudioMimeType` et `getAudioBlobType` depuis `@/lib/audioMimeUtils`. Utiliser le bon MIME type pour le MediaRecorder et le Blob :

- `new MediaRecorder(stream, { mimeType: getSupportedAudioMimeType() })` au lieu de `new MediaRecorder(stream)`
- `new Blob(chunks, { type: getAudioBlobType() })` au lieu de `new Blob(chunks, { type: 'audio/webm' })`

### Fichier 2 : `src/pages/tamtam/TamTamSocial.tsx` (handleCreatePost)

**A. Utiliser le bon MIME type et la bonne extension lors de l'upload**

Actuellement l'upload force l'extension `.webm`. Il faut :
- Detecter le type du blob (qui sera `audio/mp4` sur iOS ou `audio/webm` sur Chrome)
- Utiliser la bonne extension (`.mp4` ou `.webm`) dans le nom de fichier
- Passer le vrai `contentType` du blob

### Fichier 3 : `src/pages/tamtam/TamTamHome.tsx` (handleCreatePost)

Meme correction que pour TamTamSocial : extension et contentType dynamiques.

## Details techniques

### TamTamCreatePost.tsx

```text
// Ajouter l'import
import { getSupportedAudioMimeType, getAudioBlobType } from '@/lib/audioMimeUtils';

// Dans startRecording :
const mimeType = getSupportedAudioMimeType();
const mediaRecorder = new MediaRecorder(stream, { mimeType });

// Dans onstop :
const blobType = getAudioBlobType();
const blob = new Blob(chunksRef.current, { type: blobType });
```

### TamTamSocial.tsx (handleCreatePost, lignes 958-976)

```text
// Determiner l'extension depuis le type du blob
const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
const fileName = `posts/audio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
// Upload avec le vrai contentType
.upload(fileName, blob, { contentType: blob.type || 'audio/webm' });
```

### TamTamHome.tsx (handleCreatePost, lignes 314-329)

Meme correction : extension dynamique basee sur le type du blob.

## Resume

- **3 fichiers modifies**
- **Cause racine** : Le MIME type `audio/webm` est incompatible avec iOS Safari. Le projet a deja les utilitaires necessaires (`audioMimeUtils.ts`) mais ne les utilise pas dans le flux d'enregistrement
- **Resultat** : Les nouveaux enregistrements seront en `audio/mp4` sur iOS et `audio/webm` sur Chrome, et seront jouables sur tous les navigateurs
- **Note** : Les 3 anciens fichiers `.webm` deja uploades resteront injouables sur Safari. Ils fonctionneront sur Chrome/Firefox
