
# Plan d'Intégration Complète: Griot Digital Template (de bout en bout)

## Contexte & Analyse

### Village Chronicle (Modèle Fonctionnel)
J'ai analysé le workflow complet qui fonctionne pour Village Chronicle:
1. **NewsStudio.tsx** → Interface utilisateur avec gestion des étapes (setup/news/anchor/preview/rendering/complete)
2. **VillageChronicle.ts** → Engine avec fallback 2D, génération audio TTS, et rendu 720p@18fps
3. **VideoEncoder.ts** → Encodage MP4 via FFmpeg.wasm avec mixage audio
4. **useVideoPublish.ts** → Publication vers le feed avec upload Storage + insertion DB
5. **analyze-news (Edge Function)** → Analyse IA avec fallback robuste

### Griot Digital (État Actuel)
Le template existe mais présente plusieurs lacunes:
1. **GriotDigitalCreator.tsx** → UI fonctionnelle mais rendu basé sur MediaRecorder (WebM uniquement, pas d'audio muxé)
2. **GriotDigital.ts** → Engine 3D complexe mais sans fallback 2D robuste, résolution 1080@60fps trop lourde
3. **Pas de TTS intégré** → L'audio est uniquement l'enregistrement utilisateur
4. **analyze-story (Edge Function)** → Existe avec fallback mais non utilisé de façon optimale

---

## Plan de Modifications

### 1. Optimiser le GriotDigital Engine (src/templates/GriotDigital.ts)

**Objectif**: Aligner sur le pattern VillageChronicle pour fiabilité et performance

**Modifications:**
- Réduire résolution: 1080x1920 → **720p (1280x720)** portrait
- Réduire FPS: 60fps → **18fps** (même que Village Chronicle)
- Ajouter un mode **fallback 2D Canvas** si Three.js échoue
- Implémenter `draw2DFrame()` pour rendu procédural sans modèles GLB
- Utiliser **FFmpeg.wasm** au lieu de MediaRecorder pour muxer l'audio
- Ajouter la méthode `generateFinalAudio()` pour combiner narration + musique

```text
Avant:
├── renderSettings: { resolution: '4K', fps: 60 }
├── MediaRecorder (video/webm sans audio muxé)
└── Dépendance forte aux modèles GLB

Après:
├── renderSettings: { resolution: '720p', fps: 18 }
├── FFmpeg.wasm (video/mp4 avec audio muxé)
└── Fallback 2D Canvas avec GriotFallbackScene
```

### 2. Refactorer le Pipeline de Rendu

**Dans GriotDigital.ts - Méthode render():**

```text
Nouveau flux de rendu:
1. Analyser l'audio (durée, beats)
2. Appeler analyze-story Edge Function
3. Créer timeline avec segments émotionnels
4. Initialiser fallback 2D si Three.js indisponible
5. Capturer frames via captureCanvasFrames()
6. Encoder avec encodeVideo() (FFmpeg MP4)
7. Retourner Blob MP4 avec audio intégré
```

**Paramètres optimisés:**
- `totalDuration`: max 30 secondes
- `fps`: 18 (quick) ou 12 (preview)
- `renderWidth`: 1280
- `renderHeight`: 720

### 3. Ajouter le Fallback 2D au GriotDigital Engine

**Nouvelle méthode `draw2DFrame(time: number)`:**
- Dessiner fond dégradé selon le style (traditional/modern/fantasy/historical)
- Animer silhouette du griot (GriotFallbackScene)
- Afficher particules dorées (canvas natif)
- Afficher sous-titres karaoké synchronisés
- Afficher indicateurs de beat (pulsation visuelle)

### 4. Intégrer TTS (Text-to-Speech) Optionnel

**Nouvelle Edge Function ou réutilisation de `french-tts`:**
- Si l'utilisateur fournit du texte en plus de l'audio → synthétiser intro/outro
- Sinon, utiliser uniquement l'audio enregistré
- Concaténer avec `concatAudioBlobs()` de VideoEncoder.ts

### 5. Mettre à Jour GriotDigitalCreator.tsx

**Modifications UI/UX:**
- Utiliser `encodeVideo()` au lieu de MediaRecorder direct
- Afficher progression détaillée (frames/total)
- Gérer les erreurs avec fallback gracieux
- S'assurer que la publication utilise le bon format MP4

**Modifications dans startRendering():**
```text
Avant:
└── engine.render() → Blob WebM sans audio

Après:
└── engine.render() → Blob MP4 avec audio muxé
    ├── captureCanvasFrames() 
    ├── encodeVideo() avec FFmpeg
    └── Fallback: encodeWithMediaRecorder() si FFmpeg échoue
```

### 6. Synchroniser avec la Publication (useVideoPublish.ts)

**Vérifications:**
- Le hook détecte déjà MP4 vs WebM (`isMP4 = data.video.type.includes('mp4')`)
- S'assurer que le thumbnail est généré à la frame 1s
- Template ID = 'griot-digital' (déjà configuré)

---

## Fichiers à Modifier

| Fichier | Action | Priorité |
|---------|--------|----------|
| `src/templates/GriotDigital.ts` | Refactoring majeur: 720p, 18fps, FFmpeg, fallback 2D | 🔴 Haute |
| `src/components/GriotDigitalCreator.tsx` | Adaptation au nouveau pipeline render | 🔴 Haute |
| `src/lib/GriotFallbackScene.ts` | Améliorer animations et effets 2D | 🟡 Moyenne |
| `supabase/functions/analyze-story/index.ts` | Déjà fonctionnel, vérifier robustesse | 🟢 Basse |

---

## Détail Technique: Modifications GriotDigital.ts

### A. Imports Additionnels
```typescript
import { encodeVideo, captureCanvasFrames, encodeWithMediaRecorder, EncoderProgress } from '@/lib/VideoEncoder';
```

### B. Nouvelles Propriétés
```typescript
private use2DFallback: boolean = false;
private ctx2D: CanvasRenderingContext2D | null = null;
private canvas: HTMLCanvasElement | null = null;
```

### C. Méthode render() Refactorisée
```text
Étapes:
1. Créer canvas dédié (1280x720)
2. Tenter initialisation Three.js
3. Si échec → activer use2DFallback = true
4. Analyser audio et créer timeline
5. Pour chaque frame:
   - Si 3D: renderer.render(scene, camera)
   - Si 2D: draw2DFrame(time)
6. Capturer frames PNG
7. Encoder MP4 via FFmpeg avec audio original
8. Générer thumbnail (frame à 1s)
```

### D. Méthode draw2DFrame() (Nouveau)
```text
1. Effacer canvas
2. Dessiner fond dégradé (palette selon style)
3. Dessiner silhouette griot (primitives 2D)
4. Animer particules dorées
5. Afficher texte/sous-titres si activé
6. Pulsation sur beats audio
```

---

## Schéma du Flux Final

```text
┌──────────────────────────────────────────────────────────────────┐
│                    GRIOT DIGITAL - FLUX COMPLET                   │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  1. UPLOAD       │  Utilisateur enregistre/importe audio
│     AUDIO        │  + Photos optionnelles (face mapping)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. CONFIGURE    │  Style: traditional/modern/fantasy/historical
│     OPTIONS      │  Langue, sous-titres, mode interactif
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  3. PREVIEW      │  Aperçu canvas 2D statique ou animé
│                  │  Résumé des paramètres
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. RENDERING (dans GriotDigitalEngine)                          │
├──────────────────────────────────────────────────────────────────┤
│  a) Analyse audio → durée, beats                                  │
│  b) Appel Edge Function analyze-story → structure narrative       │
│  c) Création timeline (segments + émotions + caméra)              │
│  d) Init Three.js ou Fallback 2D Canvas                          │
│  e) Boucle de rendu: 720p @ 18fps (max 30s = 540 frames)         │
│  f) Capture PNG frames                                           │
│  g) FFmpeg.wasm: muxage MP4 + audio original                     │
│  h) Génération thumbnail (frame @1s)                             │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  5. COMPLETE     │  Aperçu vidéo finale
│                  │  Boutons: Publier / Télécharger / Partager
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  6. PUBLICATION (useVideoPublish)                                 │
├──────────────────────────────────────────────────────────────────┤
│  a) Upload video.mp4 vers Storage (bucket: videos)               │
│  b) Upload thumbnail.jpg vers Storage                            │
│  c) Insert dans table videos:                                     │
│     - template_id: 'griot-digital'                                │
│     - template_name: 'Griot Digital'                              │
│     - duration_seconds: durée                                     │
│  d) Redirection vers /tamtam/social (feed vidéo)                 │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  7. FEED VIDEO   │  Vidéo visible avec audio
│     (TamTamSocial) │  Toggle mute/unmute
└──────────────────┘
```

---

## Résultat Attendu

Après ces modifications:
1. **Fiabilité**: Le template ne bloquera jamais (fallback 2D garantit un rendu)
2. **Performance**: Rendu 720p@18fps (~540 frames pour 30s) au lieu de 4K@60fps
3. **Audio**: MP4 avec audio muxé via FFmpeg (audible dans le feed)
4. **UX**: Progression détaillée, temps de génération réduit (~30-60 secondes)
5. **Publication**: Intégration complète avec le feed vidéo existant

---

## Priorité d'Implémentation

1. **Phase 1**: Modifier GriotDigital.ts (render pipeline)
2. **Phase 2**: Ajouter draw2DFrame() pour fallback
3. **Phase 3**: Adapter GriotDigitalCreator.tsx
4. **Phase 4**: Tests et validation end-to-end
