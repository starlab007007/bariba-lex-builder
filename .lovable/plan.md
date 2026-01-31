
# Plan: Montage IA Intelligent Synchronisé avec l'Audio Vocal

## Résumé Exécutif
Transformer le moteur Griot Digital pour créer un montage vidéo "intelligent" où:
1. **L'IA analyse le contenu vocal** pour comprendre le sens et les émotions
2. **Les assets visuels sont sélectionnés dynamiquement** selon le contexte narratif
3. **La durée du montage = durée exacte de l'audio** (synchronisation automatique)
4. **Le rendu commence et finit avec la narration vocale**

---

## Architecture Technique

```text
┌──────────────────────────────────────────────────────────────────────┐
│                      PIPELINE DE MONTAGE IA                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │ 1. AUDIO    │───►│ 2. TRANSCR. │───►│ 3. ANALYSE SÉMANTIQUE   │  │
│  │ (Micro/File)│    │ (Web Speech)│    │ (Gemini 3 Flash)        │  │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘  │
│                                                     │                │
│                                                     ▼                │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    StoryStructure                                ││
│  │  ├─ segments[] (timing, emotion, cameraMove, visualEffect)      ││
│  │  ├─ keyMoments[] (climax, transition, emphasis)                 ││
│  │  └─ totalDuration = audioDuration                               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                     │                │
│                                                     ▼                │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              4. ASSET MAPPING INTELLIGENT                        ││
│  │  ├─ Emotion → Lens Flare (joy→doré, tension→rouge)              ││
│  │  ├─ CameraMove → Photo Animation (zoom-in, orbit, pan)          ││
│  │  ├─ VisualEffect → VFX Layer (particles, glow, shake)           ││
│  │  └─ KeyMoment → Transition Video                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                     │                │
│                                                     ▼                │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              5. RENDU SYNCHRONISÉ                                ││
│  │  ├─ Frame 0 → currentTime = 0 → Audio.start()                   ││
│  │  ├─ Frame N → currentTime = audioDuration → Audio.end()         ││
│  │  └─ MediaRecorder capture = exactement audioDuration            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à Modifier

### 1. Edge Function: `supabase/functions/analyze-story/index.ts`
**Améliorer le prompt d'analyse pour inclure:**
- Mapping émotion → catégorie de lens flare (50 assets disponibles)
- Mapping thème → style de particules/light leaks
- Détection de mots-clés culturels (sagesse, ancêtres, unité) → symboles spécifiques
- Calcul précis des timings basé sur la durée audio fournie

### 2. Moteur de Rendu: `src/templates/GriotDigital.ts`
**Modifications majeures:**

a) **Ajouter l'analyse sémantique avant le rendu:**
```typescript
// Nouveau: Transcription + Analyse IA
private storyStructure: StoryStructure | null = null;

async analyzeContent(audioFile: File): Promise<StoryStructure> {
  // 1. Transcription via Web Speech API
  // 2. Appel analyze-story avec transcript + duration
  // 3. Retourne segments avec timing précis
}
```

b) **Asset Selection Intelligent:**
```typescript
// Mapping Emotion → Asset
const EMOTION_ASSET_MAP = {
  joy: { flares: [50-100], particles: 'light', blend: 'screen' },
  tension: { flares: [150-200], particles: 'fire', blend: 'overlay' },
  wisdom: { flares: [1-50], particles: 'gold', blend: 'multiply' },
  // ...
};
```

c) **Synchronisation Frame-par-Frame:**
```typescript
private drawFrame(currentTime: number, structure: StoryStructure) {
  // Trouver le segment actif basé sur currentTime
  const segment = structure.segments.find(
    s => currentTime >= s.startTime && currentTime < s.endTime
  );
  
  // Appliquer les effets du segment
  this.applySegmentEffects(segment);
  
  // Appliquer l'animation de caméra
  this.applyCameraMove(segment.cameraMove, currentTime - segment.startTime);
}
```

d) **Photo Distribution Intelligente:**
```typescript
// Distribuer les photos sur toute la durée audio
const photoSegmentDuration = audioDuration / userPhotos.length;
const currentPhotoIndex = Math.floor(currentTime / photoSegmentDuration);
```

### 3. UI Creator: `src/components/GriotDigitalCreator.tsx`
**Ajouter l'étape d'analyse:**
- Afficher un loader "Analyse de votre histoire..."
- Prévisualiser les segments détectés avant le rendu
- Permettre l'édition manuelle des émotions/effets (optionnel)

---

## Détail Technique: Mapping Assets

### Lens Flares (455 fichiers disponibles)
| Émotion | Range | Caractéristiques |
|---------|-------|------------------|
| joy | 50-100 | Doré, lumineux |
| wisdom | 1-49 | Subtil, ambré |
| tension | 150-200 | Rouge, intense |
| sadness | 250-300 | Bleu, froid |
| excitement | 100-150 | Multicolore, dynamique |
| neutral | 300-350 | Blanc, doux |

### Transitions (CDN)
| Moment Clé | Asset |
|------------|-------|
| climax | transition-022.mp4 |
| transition | transition-014.mp4 |
| reveal | transition-018.mp4 |

### Light Leaks (CDN)
| Intensité | Asset |
|-----------|-------|
| 0.0-0.3 | leak-001.webm |
| 0.3-0.6 | leak-006.webm |
| 0.6-0.9 | leak-010.webm |
| 0.9-1.0 | leak-014.webm |

---

## Synchronisation Audio Précise

### Garanties de Synchronisation:
1. **Durée = audioDuration exacte** (déjà implémenté)
2. **Début simultané:** Audio démarre à frame 0
3. **Fin synchrone:** MediaRecorder.stop() après le dernier frame

### Améliorations:
```typescript
// Nouveau: Utiliser AudioBuffer.duration comme source de vérité
const audioDuration = this.userAudioBuffer.duration;
const totalFrames = Math.ceil(audioDuration * fps);

// Le rendu s'arrête exactement quand l'audio finit
renderNextFrame() {
  if (currentTime >= audioDuration) {
    recorder.stop();
    return;
  }
}
```

---

## Workflow Utilisateur Final

1. **Enregistre ton histoire** (micro) ou importe un fichier audio
2. **Ajoute des photos** (optionnel, pour illustrer)
3. **L'IA analyse automatiquement:**
   - Transcrit le contenu
   - Identifie les émotions et moments clés
   - Calcule les timings précis
4. **Prévisualisation** avec les effets mappés
5. **Rendu final** = durée exacte de l'audio, effets synchronisés

---

## Risques et Mitigations

| Risque | Mitigation |
|--------|------------|
| Transcription échoue | Fallback: structure par défaut avec segments réguliers |
| Analyse IA rate limitée | Fallback: createDefaultStructure() avec audioDuration |
| Web Speech API non supporté | Fallback: import fichier texte ou skip analyse |
| Photos manquantes | Utiliser gradient animé + VFX uniquement |

---

## Section Technique: Fichiers Créés/Modifiés

### Nouveaux Fichiers:
- `src/lib/StoryAnalyzer.ts` - Service d'analyse sémantique côté client
- `src/lib/AssetEmotionMapper.ts` - Mapping émotion → assets

### Fichiers Modifiés:
- `supabase/functions/analyze-story/index.ts` - Prompt amélioré + asset hints
- `src/templates/GriotDigital.ts` - Pipeline de rendu intelligent
- `src/components/GriotDigitalCreator.tsx` - UI d'analyse + prévisualisation

---

## Bénéfices Attendus
- Montage **automatiquement adapté au contenu** narratif
- **Synchronisation parfaite** audio/vidéo (début = début, fin = fin)
- **Effets visuels contextuels** (joie → lumière dorée, tension → rouge)
- **Expérience utilisateur fluide** sans intervention technique
