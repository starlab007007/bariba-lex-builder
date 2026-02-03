
# Plan: Griot Digital v6.1 - Griot Animé IA (Style NovelAI/Pika)

## Vision

Transformer le Griot Studio en un créateur de **contes animés avec images générées par IA** dans un style anime/illustration (comme NovelAI), avec narration vocale professionnelle et signature du narrateur.

L'utilisateur:
1. **Écrit ou dicte** son histoire
2. **Choisit un style anime** (manga, chibi, fantasy, conte africain stylisé)
3. **L'IA génère automatiquement** une série d'images anime pour illustrer le conte
4. **Narration vocale** via ElevenLabs synchronisée aux images
5. **Photo du narrateur** en cercle (signature) dans le coin supérieur

---

## Architecture du Nouveau Pipeline

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GRIOT ANIMÉ STUDIO v6.1                                 │
│                     "Ton conte, illustré par l'IA"                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ÉTAPE 1: CRÉATION DU CONTE                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📷 Photo optionnelle du narrateur (avatar rond en signature)       │   │
│  │  🎤 Raconte ton histoire (voix → transcription ou texte)            │   │
│  │  🎨 Style visuel: [Manga] [Chibi] [Fantasy] [Conte Africain]        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   ▼                                         │
│  ÉTAPE 2: GÉNÉRATION IA (Automatic)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Gemini analyse le conte → découpe en 3-6 scènes                 │   │
│  │  2. Gemini Image génère 1 illustration anime par scène             │   │
│  │  3. ElevenLabs génère la narration vocale française                │   │
│  │  4. Synchronisation audio-images avec Ken Burns                     │   │
│  │  5. Overlay VFX (lens flares, particules) selon l'émotion          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   ▼                                         │
│  ÉTAPE 3: PREVIEW & EXPORT                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ▶️ Preview vidéo avec:                                              │   │
│  │     - Défilement fluide des illustrations anime                     │   │
│  │     - Narration vocale synchronisée                                 │   │
│  │     - Avatar du narrateur en cercle (coin supérieur droit)          │   │
│  │     - VFX contextuels (sparkles, lumière, particules)               │   │
│  │  📤 Partager / Télécharger MP4                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fonctionnalités Clés

### 1. Génération d'Images Anime IA (Style NovelAI)
- Utilise `google/gemini-3-pro-image-preview` pour générer des illustrations
- Prompts optimisés pour styles anime/manga
- 3-6 images générées par conte (1 par segment narratif)
- Cohérence visuelle entre les images (même personnage, même ambiance)

### 2. Styles Visuels Disponibles
| Style | Description | Prompt Keywords |
|-------|-------------|-----------------|
| **Manga** | Style manga japonais classique | manga, detailed, anime eyes, dynamic pose |
| **Chibi** | Personnages mignons déformés | chibi, cute, big head, simple background |
| **Fantasy** | Épique, magique | fantasy, magical, ethereal, detailed scenery |
| **Conte Africain** | Fusion africaine + anime | african patterns, warm colors, anime style, tribal motifs |

### 3. Narration Vocale Intégrée
- ElevenLabs TTS avec voix française professionnelle
- Synchronisation automatique: durée audio = durée vidéo
- Chaque segment narratif correspond à une illustration

### 4. Avatar du Narrateur (Signature)
- Photo circulaire dans le coin supérieur droit
- Bordure dorée/ambrée animée
- Reste visible pendant toute la vidéo
- Optionnel: si pas de photo, affiche emoji 🌙

### 5. VFX Automatiques selon l'Émotion
- Particules dorées pour la joie
- Lucioles pour la sagesse
- Étincelles pour la magie
- Flocons/pluie pour la tristesse

---

## Structure des Fichiers

### Nouveaux Fichiers à Créer

```
supabase/functions/generate-anime-story/index.ts      # Edge function principale
  - Découpe le conte en segments
  - Génère les prompts d'images anime
  - Appelle Gemini Image pour chaque segment
  - Génère la narration ElevenLabs

src/components/griot-studio/
├── GriotStudio.tsx                    # Refonte pour le nouveau flux
├── NarratorCapture.tsx                # Capture photo du narrateur (cercle)
├── StoryInput.tsx                     # Inchangé (voix ou texte)
├── AnimeStyleSelector.tsx             # Nouveau: sélection style anime
├── StoryPreview.tsx                   # Preview avec illustrations anime
└── hooks/
    ├── useAnimeStoryGenerator.ts      # Nouveau hook principal
    └── useVFXEngine.ts                # Existant, enrichi

src/engines/GriotAnimationEngine.ts    # Modifier pour supporter slideshow anime
```

### Fichiers à Modifier

1. **`supabase/functions/generate-image-animation/index.ts`**
   - Ajouter action `generate_anime_scenes` 
   - Générer images anime via Gemini Image

2. **`src/components/griot-studio/GriotStudio.tsx`**
   - Remplacer ImageCapture par NarratorCapture (optionnel)
   - Ajouter AnimeStyleSelector
   - Nouveau flux de génération

3. **`src/engines/GriotAnimationEngine.ts`**
   - Ajouter mode slideshow (plusieurs images)
   - Ajouter rendu avatar circulaire en overlay
   - Transitions entre images (fade, slide)

---

## Pipeline Technique Détaillé

### Phase 1: Découpage du Conte en Scènes

```typescript
// Edge function: generate-anime-story
interface StoryScene {
  sceneNumber: number;
  text: string;           // Segment de narration
  emotion: string;        // joy, wonder, tension, peace...
  visualDescription: string; // Description pour l'image
  durationSeconds: number;
}

// Gemini analyse le conte et retourne les scènes
const scenePrompt = `Analyse ce conte et découpe-le en 3-6 scènes visuelles.
Pour chaque scène, donne:
- Le texte à narrer
- L'émotion dominante
- Une description visuelle pour une illustration anime
- La durée suggérée (5-15 secondes)

Conte: "${storyText}"

Réponds en JSON...`;
```

### Phase 2: Génération des Images Anime

```typescript
// Pour chaque scène, générer une image avec Gemini Image
const imagePrompt = `Create an anime illustration in ${style} style.

Scene: ${scene.visualDescription}
Mood: ${scene.emotion}
Style requirements:
- High quality anime art
- ${STYLE_KEYWORDS[style]}
- 9:16 vertical format for mobile
- Vibrant colors, detailed background
- Characters with expressive anime eyes

Important: This is scene ${i + 1} of a story. Maintain visual consistency.`;

const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  body: JSON.stringify({
    model: 'google/gemini-3-pro-image-preview',
    messages: [{ role: 'user', content: imagePrompt }],
    modalities: ['image', 'text']
  })
});
```

### Phase 3: Narration Audio

```typescript
// Combiner tous les textes de scènes et générer l'audio
const fullNarration = scenes.map(s => s.text).join(' ... ');

const { data } = await supabase.functions.invoke('french-tts', {
  body: { 
    text: fullNarration, 
    voice: 'narrator',
    returnAudio: true 
  }
});

// audioBase64 contient l'audio MP3
```

### Phase 4: Rendu Vidéo avec Avatar

```typescript
// GriotAnimationEngine: nouveau mode slideshow
class GriotAnimationEngine {
  private scenes: AnimatedScene[] = [];
  private narratorAvatar: HTMLImageElement | null = null;

  // Dessiner l'avatar circulaire du narrateur
  drawNarratorAvatar(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.narratorAvatar) return;
    
    const size = 80;
    const margin = 20;
    const x = this.width - size - margin;
    const y = margin;
    
    // Dessiner cercle avec bordure dorée animée
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2 + 3, 0, Math.PI * 2);
    const gradient = ctx.createConicGradient(time * 0.5, x + size/2, y + size/2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#FFA500');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Clip et dessiner l'avatar
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(this.narratorAvatar, x, y, size, size);
    ctx.restore();
  }

  // Dessiner la scène courante avec transition
  drawCurrentScene(time: number): void {
    const currentSceneIndex = this.getSceneIndex(time);
    const scene = this.scenes[currentSceneIndex];
    
    // Ken Burns sur l'image anime
    this.drawAnimatedImage(scene.image, time, scene.duration, scene.motionPlan);
    
    // Transition fade si changement de scène
    const transitionProgress = this.getTransitionProgress(time);
    if (transitionProgress > 0) {
      const nextScene = this.scenes[currentSceneIndex + 1];
      ctx.globalAlpha = transitionProgress;
      this.drawAnimatedImage(nextScene.image, time, nextScene.duration, nextScene.motionPlan);
      ctx.globalAlpha = 1;
    }
  }
}
```

---

## Interface Utilisateur

### Écran 1: Création

```text
┌────────────────────────────────────────────┐
│  🌙 GRIOT ANIMÉ STUDIO                     │
├────────────────────────────────────────────┤
│                                            │
│  ┌─────────┐                              │
│  │  📷    │ Ta photo (optionnel)         │
│  │ Avatar  │ Apparaîtra en signature      │
│  └─────────┘                              │
│                                            │
│  🎤 Raconte ton histoire...                │
│  ┌────────────────────────────────────┐   │
│  │ Il était une fois dans un village  │   │
│  │ au cœur de l'Afrique, un jeune    │   │
│  │ garçon nommé Kofi...               │   │
│  └────────────────────────────────────┘   │
│  [🎙️ Dicter] ou écrire                    │
│                                            │
│  🎨 Style des illustrations:              │
│  [🎌 Manga] [😊 Chibi] [✨ Fantasy] [🌍 Africain] │
│                                            │
│            [ ✨ CRÉER MON CONTE ✨ ]       │
│                                            │
└────────────────────────────────────────────┘
```

### Écran 2: Génération

```text
┌────────────────────────────────────────────┐
│                                            │
│          🎨 L'IA illustre ton conte...    │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │   [Preview de la première image   │   │
│  │    anime générée avec sparkles]   │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│      ████████░░░░░░░░░ 40%                │
│      "Création de la scène 2/4..."        │
│                                            │
│  ✅ Scène 1: Le village au matin          │
│  🔄 Scène 2: La rencontre magique         │
│  ⏳ Scène 3: L'aventure commence          │
│  ⏳ Scène 4: La fin heureuse              │
│                                            │
└────────────────────────────────────────────┘
```

### Écran 3: Résultat

```text
┌────────────────────────────────────────────┐
│  🎬 Ton conte animé est prêt!             │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                   ┌────┐           │   │
│  │  [IMAGE ANIME    │ 📷 │           │   │
│  │   EN MOUVEMENT]  │Avatar│          │   │
│  │                   └────┘           │   │
│  │         ▶️                         │   │
│  │                                    │   │
│  │  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ 0:45        │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌──────────┐  ┌──────────┐              │
│  │ 📤 Share │  │ ⬇️ Save  │              │
│  └──────────┘  └──────────┘              │
│                                            │
│          [🔄 Créer un autre]              │
│                                            │
└────────────────────────────────────────────┘
```

---

## Utilisation des Assets Envato

### Lens Flares par Émotion
| Émotion | Range Flares | Effet |
|---------|--------------|-------|
| Joy | 001-050 | Doré, chaleureux |
| Wonder | 051-100 | Violet, magique |
| Tension | 101-150 | Rouge, dramatique |
| Peace | 151-200 | Bleu, serein |
| Excitement | 201-300 | Multicolore, dynamique |
| Magic | 301-400 | Arc-en-ciel, sparkles |

### Light Leaks
- `leak-001.webm` à `leak-022.webm`
- Appliqués en overlay `screen` pendant les transitions
- Intensité basée sur l'émotion du segment

### Particules (à ajouter)
- Dust particles pour ambiance
- Sparkles pour magie
- Fireflies pour nuit/mystère

---

## Résumé des Fichiers à Modifier/Créer

### Nouveaux Fichiers
1. `supabase/functions/generate-anime-story/index.ts` - Edge function génération complète
2. `src/components/griot-studio/NarratorCapture.tsx` - Capture avatar circulaire
3. `src/components/griot-studio/AnimeStyleSelector.tsx` - Sélection style anime
4. `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` - Hook principal

### Fichiers à Modifier
1. `src/components/griot-studio/GriotStudio.tsx` - Nouveau flux UI
2. `src/engines/GriotAnimationEngine.ts` - Mode slideshow + avatar overlay
3. `supabase/config.toml` - Ajouter nouvelle edge function

### Fichiers à Supprimer/Remplacer
1. `src/components/griot-studio/ImageCapture.tsx` - Remplacé par NarratorCapture
2. `supabase/functions/generate-image-animation/index.ts` - Remplacé par generate-anime-story

---

## Comparaison Avant/Après

| Aspect | v6.0 Actuel | v6.1 Griot Animé |
|--------|-------------|------------------|
| Source image | Photo utilisateur | Générées par IA |
| Style visuel | Photo animée | Illustrations anime |
| Nombre d'images | 1 | 3-6 (par scène) |
| Avatar narrateur | Non | Oui, cercle signature |
| Génération IA | Analyse seulement | Génération complète |
| Narration | Optionnelle | Intégrée (ElevenLabs) |
| Workflow | 3 étapes manuelles | 2 étapes (écrire + générer) |
| Inspiration | Pika Labs | NovelAI + Kaiber |
