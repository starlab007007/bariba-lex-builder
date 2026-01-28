
# Plan de correction du rendu Village Chronicle

## Problèmes identifiés

### 1. Photos/Vidéos non affichées dans le rendu final
**Cause:** Le moteur `VillageChronicleEngine` ne supporte actuellement que les **images statiques** sur l'écran du studio. Les fichiers vidéo joints aux actualités sont ignorés.

**Fichier concerné:** `src/templates/VillageChronicle.ts`
- Ligne 468-474: Le préchargement ne gère que les images (`file.type.startsWith('image/')`)
- Ligne 890-970: L'affichage sur l'écran graphique n'utilise que `HTMLImageElement`

### 2. Audio enregistré par le présentateur absent
**Cause:** Le fichier `anchorVoice` est bien capturé dans `VillageChronicleInputs` (ligne 88) mais n'est jamais utilisé dans le pipeline de rendu.

**Problème actuel:**
- `generateShowNarration()` (ligne 1751-1780) génère uniquement la voix AI (TTS ElevenLabs)
- Aucune logique de concaténation ou mixage audio n'existe pour combiner la narration IA avec l'audio du présentateur

### 3. Tous les médias des news ne sont pas visibles
**Cause:** Seul le **premier** média de chaque segment est affiché. Les autres photos/vidéos sont ignorées.

---

## Solution technique

### Étape 1: Support des vidéos dans le cache média
Ajouter un cache vidéo séparé et précharger les fichiers vidéo des actualités.

```text
Modifications dans VillageChronicle.ts:
- Ajouter: private videoCache: Map<string, HTMLVideoElement> = new Map()
- Modifier preloadNewsMedia() pour gérer les types 'video/*'
- Créer loadVideoFromUrl() similaire à loadImageFromUrl()
```

### Étape 2: Affichage cyclique de tous les médias
Modifier `draw2DFrame()` pour:
- Faire défiler tous les médias d'un segment (pas seulement le premier)
- Dessiner les frames vidéo via `ctx.drawImage(videoElement, ...)`
- Calculer l'index du média actif basé sur le temps écoulé

```text
Logique de cycle:
- mediaDuration = segmentDuration / nombreDeMédias
- currentMediaIndex = Math.floor((time - segmentStartTime) / mediaDuration) % totalMedia
```

### Étape 3: Intégration de l'audio du présentateur
Créer une nouvelle méthode `mixAudioTracks()` pour:
1. Convertir `anchorVoice` (File) en Blob audio
2. Concaténer avec la narration TTS générée
3. OU utiliser l'audio présentateur en priorité si fourni

```text
Pipeline audio modifié:
1. Si anchorVoice existe → utiliser comme audio principal
2. Sinon → générer TTS via french-tts edge function
3. Optionnel: mixer les deux (TTS + voix présentateur)
```

### Étape 4: Render vidéo frame-par-frame
Modifier la boucle de rendu pour synchroniser la lecture vidéo:
- `video.currentTime = segmentTime` avant chaque capture de frame
- Attendre `video.seeked` avant de dessiner

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/templates/VillageChronicle.ts` | Cache vidéo, cycle médias, mixage audio |
| `src/components/NewsStudio.tsx` | Passer anchorVoice au moteur de rendu |

---

## Section technique détaillée

### 1. Nouveau cache vidéo (VillageChronicle.ts)

```typescript
// Ajouter après ligne 179
private videoCache: Map<string, HTMLVideoElement> = new Map();

// Nouvelle méthode de préchargement vidéo
private async loadVideoFromUrl(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    
    const timeout = setTimeout(() => reject(new Error('Video load timeout')), 15000);
    
    video.onloadeddata = () => {
      clearTimeout(timeout);
      resolve(video);
    };
    video.onerror = (e) => {
      clearTimeout(timeout);
      reject(e);
    };
    video.src = url;
    video.load();
  });
}
```

### 2. Préchargement étendu aux vidéos (ligne ~468)

```typescript
// Modifier la condition de fichier
if (file.type.startsWith('image/')) {
  allUrls.push({ url: `file:${file.name}`, newsTitle: news.title, isFile: true, file, type: 'image' });
} else if (file.type.startsWith('video/')) {
  allUrls.push({ url: `file:${file.name}`, newsTitle: news.title, isFile: true, file, type: 'video' });
}
```

### 3. Affichage cyclique des médias (ligne ~890)

```typescript
// Dans draw2DFrame, remplacer la logique d'affichage unique par:
const allMedia = [...(newsItem.media || []), ...(newsAny.mediaUrls || [])];
const mediaCycleDuration = segmentDuration / Math.max(1, allMedia.length);
const currentMediaIndex = Math.floor(segmentElapsedTime / mediaCycleDuration) % allMedia.length;
const currentMediaItem = allMedia[currentMediaIndex];

// Puis dessiner selon le type (image ou vidéo)
```

### 4. Intégration audio présentateur (nouvelle méthode)

```typescript
async generateFinalAudio(show: NewsShow, anchorVoice?: File): Promise<Blob | null> {
  // Priorité à l'audio du présentateur si fourni
  if (anchorVoice) {
    console.log('[VillageChronicle] Using presenter recorded audio');
    return new Blob([await anchorVoice.arrayBuffer()], { type: anchorVoice.type });
  }
  
  // Sinon, générer TTS
  return this.generateShowNarration(show);
}
```

### 5. Modification de render() (ligne ~1517)

```typescript
// Remplacer ligne 1521
audioBlob = await this.generateFinalAudio(show, inputs.anchorVoice);
```

---

## Résultat attendu

Après ces modifications:
- Toutes les photos ET vidéos jointes aux actualités seront visibles dans le rendu
- Les médias défileront automatiquement pendant chaque segment d'actualité
- L'audio enregistré par le présentateur sera intégré à la vidéo finale
- Si pas d'audio présentateur, la narration IA (TTS) sera utilisée comme fallback
