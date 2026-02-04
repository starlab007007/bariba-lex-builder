
# Plan: Finalisation Template Griot Animé - Workflow Complet jusqu'à Publication

## Objectif
Optimiser le parcours utilisateur du template Griot Animé avec:
- Enregistrement audio avec disque vinyl rotatif animé
- Prévisualisation avec audio synchronisé 
- Ajout d'effets VFX
- Export MP4 et publication dans le feed vidéo
- Style inclusif "voice-first" avec moins de texte

---

## Architecture du Nouveau Workflow

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                      GRIOT ANIMÉ v6.2 - WORKFLOW COMPLET                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ÉTAPE 1: CRÉATION 🎙️                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────┐                                                       │ │
│  │  │    🎵       │   DISQUE VINYL ANIMÉ                                 │ │
│  │  │  Avatar     │   - Tourne pendant l'enregistrement                  │ │
│  │  │  Narrateur  │   - Barre de progression circulaire                  │ │
│  │  └─────────────┘   - Indicateur temps d'enregistrement                │ │
│  │                                                                        │ │
│  │  🎨 Style: [🎌 Manga] [😊 Chibi] [✨ Fantasy] [🌍 Africain]            │ │
│  │                                                                        │ │
│  │  ⏱️ Durée: [⚡15s] [🎬30s] [🎥60s]                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  ÉTAPE 2: GÉNÉRATION IA 🎨                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Scène 1: Le village au matin                                       │ │
│  │  🔄 Scène 2: La rencontre magique                                      │ │
│  │  ⏳ Scène 3: L'aventure commence                                       │ │
│  │                                                                        │ │
│  │  [████████████░░░░░░░░░░] 60%                                         │ │
│  │  "Création de la scène 2/3..."                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  ÉTAPE 3: PREVIEW 🎬                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  ┌───────────────────────────────────────┐                            │ │
│  │  │                         ┌────┐        │   CANVAS 9:16             │ │
│  │  │  [ANIME SLIDESHOW]      │ 📷 │        │   - Ken Burns par scène   │ │
│  │  │  + VFX (particles,      │Avatar│       │   - Audio synchronisé     │ │
│  │  │    lens flares)         └────┘        │   - Avatar narrateur      │ │
│  │  │                                        │   - Effets contextuels   │ │
│  │  │         ▶️ PLAY                        │                          │ │
│  │  │  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ 0:00 / 0:30       │                          │ │
│  │  └───────────────────────────────────────┘                            │ │
│  │                                                                        │ │
│  │  [🔊 Audio] [✨ Effets] [Timeline scènes]                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  ÉTAPE 4: FINALISATION 📤                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  📝 Titre: [Auto-généré ou modifiable]                                │ │
│  │                                                                        │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │ │
│  │  │ ⬇️ SAUVER    │   │ 📤 PARTAGER  │   │ 🌐 PUBLIER   │               │ │
│  │  │    MP4       │   │   Lien       │   │   au Feed    │               │ │
│  │  └──────────────┘   └──────────────┘   └──────────────┘               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  ÉTAPE 5: SUCCÈS 🎉                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  🎉 Ton conte est sur FITILA!                                          │ │
│  │                                                                        │ │
│  │  [📺 Voir dans le Feed]  [🔄 Créer un autre]                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Fonctionnalités Clés à Implémenter

### 1. Disque Vinyl Animé pour Enregistrement Audio
Reprendre le composant `VinylPlayer` existant (TamTamCreatePost.tsx) et l'adapter pour GriotStudio:
- Rotation fluide pendant l'enregistrement
- Barre de progression circulaire SVG
- Aiguille de lecture animée
- Avatar du narrateur au centre du disque
- Indicateur d'enregistrement pulsant (point rouge)
- Affichage du temps écoulé

### 2. Preview Audio/Vidéo Optimisé
- Lecteur canvas avec audio synchronisé
- Contrôles play/pause clairs et accessibles
- Timeline avec indicateurs de scènes
- Volume toggle (mute/unmute)
- Progression fluide avec temps affiché

### 3. Export MP4 avec MediaRecorder
- Utiliser `encodeWithMediaRecorder` du VideoEncoder
- Capturer le canvas en stream vidéo
- Mixer l'audio ElevenLabs avec la vidéo
- Générer thumbnail automatique à 1s
- Fallback WebM si MP4 non supporté

### 4. Publication dans le Feed Vidéo
- Intégrer `useVideoPublish` hook existant
- Upload vers Supabase Storage (bucket 'videos')
- Insert dans table 'videos' avec métadonnées
- Génération automatique du thumbnail
- Navigation vers /fitila après publication

### 5. Style Inclusif Voice-First
- Moins de texte, plus d'icônes et emojis
- Boutons larges avec feedback haptique
- Labels en français + Bariba
- Instructions vocales minimales
- Couleurs contrastées et accessibles

---

## Fichiers à Créer

### 1. `src/components/griot-studio/VinylRecorder.tsx`
Composant d'enregistrement audio avec disque vinyl animé:
- Props: `onRecordingComplete`, `maxDuration`, `avatarUrl`
- Animation framer-motion pour rotation
- SVG pour progression circulaire
- Gestion MediaRecorder pour capture audio
- Timer visible avec format mm:ss

### 2. `src/components/griot-studio/StoryPreviewPlayer.tsx`
Lecteur de preview avec audio:
- Canvas avec animations slideshow
- Contrôles de lecture intégrés
- Timeline des scènes cliquables
- Indicateur audio (waveform ou volume)
- Bouton mute/unmute

### 3. `src/components/griot-studio/PublishStep.tsx`
Écran de finalisation/publication:
- Formulaire titre (auto-généré)
- Sélection visibilité (public/privé)
- Boutons export MP4 / partage / publication
- Barre de progression publication
- État de succès avec liens

---

## Fichiers à Modifier

### 1. `src/components/griot-studio/GriotStudio.tsx`
Refonte majeure:
- Remplacer StoryInput par VinylRecorder
- Ajouter étape 'preview' avec StoryPreviewPlayer
- Ajouter étape 'finalize' avec PublishStep
- Ajouter étape 'success' avec confirmation
- Intégrer useVideoPublish hook
- Optimiser UI pour moins de texte

### 2. `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts`
Améliorer la gestion d'état:
- Ajouter support audio local (enregistrement utilisateur)
- Gérer la transcription audio → texte
- Combiner audio utilisateur + TTS narrateur
- Progress callbacks plus granulaires

### 3. `src/engines/GriotAnimationEngine.ts`
Ajouter méthode d'export vidéo:
- `exportVideoBlob(duration, style, fps)`: retourne Blob vidéo
- Utiliser canvas.captureStream() + MediaRecorder
- Mixer audio avec piste vidéo
- Générer thumbnail à partir du canvas

---

## Détails Techniques

### Vinyl Recorder Component
```typescript
interface VinylRecorderProps {
  avatarUrl?: string;
  maxDuration?: number; // secondes
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  style?: AnimeStyleName;
}

// Animation de rotation avec framer-motion
const rotateTransform = useTransform(rotation, (r) => `rotate(${r}deg)`);

// Progression circulaire SVG
<circle
  cx={size/2} cy={size/2} r={size/2 - 4}
  fill="none" stroke={isRecording ? "#ef4444" : "#fbbf24"}
  strokeWidth="4" strokeLinecap="round"
  strokeDasharray={circumference}
  strokeDashoffset={strokeDashoffset}
/>
```

### Export Vidéo avec Audio
```typescript
async exportVideoBlob(): Promise<Blob> {
  const stream = this.canvas.captureStream(24);
  
  // Ajouter piste audio si disponible
  if (this.audioElement) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(this.audioElement);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    stream.addTrack(destination.stream.getAudioTracks()[0]);
  }
  
  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1' : 'video/webm;codecs=vp9';
  
  const recorder = new MediaRecorder(stream, { mimeType });
  // ... capture frames and return blob
}
```

### Publication vers Feed
```typescript
const { publishVideo, isPublishing, publishProgress } = useVideoPublish();

const handlePublish = async () => {
  const videoBlob = await engineRef.current.exportVideoBlob();
  const thumbnailBlob = await generateThumbnail(canvasRef.current);
  
  const result = await publishVideo({
    video: videoBlob,
    thumbnail: thumbnailBlob,
    title: storyTitle,
    description: story.slice(0, 200),
    templateId: 'griot-anime',
    templateName: 'Griot Animé IA',
    duration: duration
  });
  
  if (result.success) {
    setStep('success');
  }
};
```

---

## Workflow Utilisateur Optimisé

| Étape | Action Utilisateur | UI | Technique |
|-------|-------------------|-----|-----------|
| 1. Avatar | Optionnel: prendre photo | Cercle avec caméra | Camera API |
| 2. Style | Toucher un style anime | 4 boutons avec emojis | State selection |
| 3. Durée | Toucher durée souhaitée | 3 boutons (15/30/60s) | State selection |
| 4. Enregistrer | Maintenir disque vinyl | Disque qui tourne | MediaRecorder audio |
| 5. Confirmer | Relâcher pour arrêter | Animation confirmation | Auto-transition |
| 6. Générer | Automatique | Progress avec scènes | Edge function |
| 7. Preview | Toucher play | Vidéo avec audio | Canvas + Audio |
| 8. Finaliser | Choisir action | 3 boutons (Save/Share/Publish) | Actions multiples |
| 9. Succès | Voir résultat | Confettis + liens | Navigation |

---

## Optimisations UX Voice-First

### Moins de Texte
- Remplacer labels par emojis + pictogrammes
- Instructions courtes (max 5 mots)
- Feedback par sons/vibrations
- Progression visuelle (couleurs, animations)

### Boutons Accessibles
- Taille minimum 48x48px (touch target)
- Contraste WCAG AA minimum
- États visuels clairs (hover, active, disabled)
- Feedback haptique (vibration) sur mobile

### Labels Bilingues Minimalistes
```
🎙️ Parler / Sɔ̀
🎨 Style  
⏱️ Durée
▶️ Jouer / Gbà
📤 Publier / Sɔ̀ɔ́
```

---

## Résumé des Modifications

| Fichier | Action | Complexité |
|---------|--------|------------|
| `VinylRecorder.tsx` | CRÉER | ⭐⭐⭐ |
| `StoryPreviewPlayer.tsx` | CRÉER | ⭐⭐⭐ |
| `PublishStep.tsx` | CRÉER | ⭐⭐ |
| `GriotStudio.tsx` | MODIFIER (majeur) | ⭐⭐⭐⭐ |
| `useAnimeStoryGenerator.ts` | MODIFIER | ⭐⭐ |
| `GriotAnimationEngine.ts` | MODIFIER (ajouter export) | ⭐⭐⭐ |

---

## Tests de Validation

1. **Enregistrement Audio**: Vinyl tourne, temps s'affiche, audio capturé
2. **Génération IA**: Scènes créées, images générées, narration TTS
3. **Preview**: Slideshow fluide, audio synchronisé, avatar visible
4. **Export MP4**: Fichier téléchargeable, qualité correcte, audio présent
5. **Publication Feed**: Vidéo visible sur /fitila, thumbnail affiché
6. **Mobile**: Touch targets accessibles, animations fluides, chargement rapide
