
# Griot Digital v6.0 - Studio d'Animation IA Style Pika/Kaiber

## Vision

Créer un studio de création de contes animés qui transforme une simple image + texte en vidéo animée fluide, exactement comme Pika Labs et Kaiber. L'utilisateur importe une image ou prend une photo, écrit/dicte son histoire, et l'IA génère une animation stylisée avec effets visuels premium.

## Problèmes du Système Actuel

1. **Complexité excessive** : 1368 lignes de code pour le moteur, workflow confus
2. **Pas de vrai Image-to-Animation** : Utilise des overlays statiques, pas d'animation de l'image
3. **Interface non intuitive** : Trop d'options, pas de magic moment
4. **Assets sous-utilisés** : 455 lens flares mais rendu basique
5. **Pas d'IA générative** : Pas de transformation d'image en animation

## Nouvelle Architecture - Pipeline Simplifié

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GRIOT ANIMATION STUDIO v6.0                             │
│                     "Your Story, Animated by AI"                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ÉTAPE 1: CAPTURE CREATIVE (1 écran)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📸 Prends une photo / Importe une image                            │   │
│  │  🎤 Raconte ton histoire (voix ou texte)                            │   │
│  │  🎨 Choisis un style: [Traditionnel] [Aquarelle] [Papier découpé]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   ▼                                         │
│  ÉTAPE 2: MAGIE IA (automatique)                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Gemini Image Generation: Génère variations animables            │   │
│  │  2. Motion Vectors: Calcule mouvement naturel (Ken Burns IA)        │   │
│  │  3. VFX Mapping: Lens flares + light leaks selon émotion            │   │
│  │  4. Audio Sync: Synchronise animation avec narration                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   ▼                                         │
│  ÉTAPE 3: PREVIEW & EXPORT (1 écran)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ▶️ Preview 15s animé                                                │   │
│  │  📤 Partager / Télécharger                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Fonctionnalités Clés Inspirées de Pika/Kaiber

### 1. Image-to-Animation IA (comme Pika)
- Upload ou capture d'une image unique
- L'IA génère un mouvement naturel dans l'image
- Effet "photo qui prend vie" avec parallaxe 2.5D

### 2. Style Transfer Musical (comme Kaiber)
- Styles artistiques: Traditionnel Africain, Aquarelle, Papier Découpé, Conte de Fées
- Audio-réactif: les effets visuels pulsent avec la voix/musique

### 3. Motion Synthesis
- Ken Burns IA: zoom/pan intelligent basé sur les points d'intérêt
- Parallax 2.5D: séparation avant-plan/arrière-plan pour profondeur
- Particle Overlay: particules contextuelles (lucioles, poussière, magie)

### 4. VFX Premium Automatique
- 455 lens flares mappés aux émotions détectées
- Light leaks synchronisés avec les moments clés
- Transitions cinématiques aux changements de segment

## Structure des Fichiers

### Fichiers à SUPPRIMER (trop complexes)
```
src/templates/GriotDigital.ts (1368 lignes → remplacer)
src/components/GriotDigitalCreator.tsx (1264 lignes → remplacer)
src/lib/Griot3DRenderLayer.ts (optionnel, pas utilisé efficacement)
```

### Nouveaux Fichiers à CRÉER

```
src/components/griot-studio/
├── GriotStudio.tsx              # Composant principal (300 lignes max)
├── ImageCapture.tsx             # Capture/upload image
├── StoryInput.tsx               # Input voix/texte  
├── StyleSelector.tsx            # Choix du style artistique
├── AnimationPreview.tsx         # Preview temps réel
└── hooks/
    ├── useImageAnimation.ts     # Hook animation image
    └── useVFXEngine.ts          # Hook effets visuels

src/engines/
├── GriotAnimationEngine.ts      # Moteur simplifié (500 lignes max)
└── ImageMotionSynthesizer.ts    # Génération de mouvement IA

supabase/functions/
├── generate-image-animation/    # Gemini Image Generation pour variations
└── analyze-emotion/             # Analyse émotion simplifiée
```

## Pipeline Technique Détaillé

### Phase 1: Capture & Input
```typescript
interface GriotStudioInput {
  image: File | Blob;           // Image source unique
  story: string;                // Texte de l'histoire (transcrit ou saisi)
  audioNarration?: File;        // Narration audio optionnelle
  style: 'traditional' | 'watercolor' | 'cutout' | 'fairytale';
  duration: 15 | 30 | 60;       // Durée en secondes
}
```

### Phase 2: Traitement IA
```typescript
// 1. Analyse de l'image avec Gemini Vision
const imageAnalysis = await analyzeImageContent(input.image);
// Retourne: { subjects: [], depth_map: [], focus_points: [], mood: string }

// 2. Génération de motion vectors
const motionPlan = generateMotionPlan(imageAnalysis, input.duration);
// Retourne: { keyframes: [], camera_path: [], parallax_layers: [] }

// 3. Analyse émotionnelle du texte
const emotions = await analyzeStoryEmotions(input.story);
// Retourne: { segments: [{ time, emotion, intensity }] }

// 4. Mapping VFX automatique
const vfxPlan = mapEmotionsToVFX(emotions, motionPlan);
// Retourne: { flares: [], leaks: [], particles: [] }
```

### Phase 3: Rendu Animation
```typescript
class GriotAnimationEngine {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  
  async render(input: GriotStudioInput, vfxPlan: VFXPlan): Promise<Blob> {
    const frames = [];
    const fps = 24;
    const totalFrames = input.duration * fps;
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / fps;
      
      // 1. Draw animated image with Ken Burns + Parallax
      this.drawAnimatedImage(time, vfxPlan.motionPlan);
      
      // 2. Apply style filter
      this.applyStyleFilter(input.style);
      
      // 3. Overlay VFX (flares, leaks, particles)
      this.drawVFXLayer(time, vfxPlan);
      
      // 4. Add audio-reactive pulse
      if (input.audioNarration) {
        this.applyAudioPulse(time, vfxPlan.audioAnalysis);
      }
      
      frames.push(this.canvas.toDataURL());
    }
    
    return this.encodeVideo(frames, input.audioNarration);
  }
}
```

## Styles Artistiques

| Style | Description | Filtres CSS/Canvas | Assets Envato |
|-------|-------------|-------------------|---------------|
| **Traditionnel** | Couleurs chaudes, grain film | sepia(0.3) contrast(1.1) | flares 001-100 |
| **Aquarelle** | Bords doux, bleeding colors | blur(0.5px) saturate(1.2) | flares 100-200 |
| **Papier Découpé** | Ombres portées, textures | contrast(1.3) + shadow | flares 200-300 |
| **Conte de Fées** | Sparkles, dreamlike | brightness(1.1) hue-rotate | flares 300-455 |

## Animation de l'Image (Image-to-Animation)

### Technique Ken Burns IA
```typescript
function animateImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  time: number,
  focusPoints: Point[],
  duration: number
): void {
  const progress = time / duration;
  
  // Calculer le point focal basé sur l'analyse IA
  const currentFocus = interpolateFocusPoints(focusPoints, progress);
  
  // Ken Burns: zoom progressif vers le point focal
  const scale = 1 + (progress * 0.2); // Zoom de 20%
  const offsetX = (currentFocus.x - 0.5) * 100 * progress;
  const offsetY = (currentFocus.y - 0.5) * 100 * progress;
  
  ctx.save();
  ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
  ctx.scale(scale, scale);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();
}
```

### Parallax 2.5D (Depth Separation)
```typescript
// Séparer l'image en couches de profondeur
interface DepthLayer {
  canvas: HTMLCanvasElement;  // Couche isolée
  depth: number;              // 0 = arrière-plan, 1 = premier plan
  parallaxSpeed: number;      // Vitesse de mouvement relatif
}

function renderParallax(layers: DepthLayer[], mouseOffset: Point): void {
  layers.forEach(layer => {
    const offsetX = mouseOffset.x * layer.parallaxSpeed;
    const offsetY = mouseOffset.y * layer.parallaxSpeed;
    ctx.drawImage(layer.canvas, offsetX, offsetY);
  });
}
```

## VFX Engine Simplifié

```typescript
class VFXEngine {
  private flareCache: Map<string, HTMLImageElement> = new Map();
  private leakVideos: HTMLVideoElement[] = [];
  
  // Précharger les assets par style
  async preloadForStyle(style: string): Promise<void> {
    const ranges = STYLE_FLARE_RANGES[style];
    for (let i = ranges[0]; i <= Math.min(ranges[1], ranges[0] + 20); i++) {
      const img = await loadImage(`/assets/envato/lens-flare/flare-${i.toString().padStart(3, '0')}.png`);
      this.flareCache.set(`flare-${i}`, img);
    }
  }
  
  // Appliquer VFX basé sur l'émotion
  applyEmotionalVFX(ctx: CanvasRenderingContext2D, emotion: string, intensity: number): void {
    const flareRange = EMOTION_FLARE_RANGES[emotion];
    const flareIndex = Math.floor(flareRange[0] + Math.random() * (flareRange[1] - flareRange[0]));
    const flare = this.flareCache.get(`flare-${flareIndex}`);
    
    if (flare) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = intensity * 0.7;
      ctx.drawImage(flare, 
        Math.random() * ctx.canvas.width * 0.8,
        Math.random() * ctx.canvas.height * 0.3,
        ctx.canvas.width * 0.4,
        ctx.canvas.height * 0.4
      );
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }
}
```

## Edge Function: Génération IA

```typescript
// supabase/functions/generate-image-animation/index.ts
serve(async (req) => {
  const { imageBase64, prompt, style } = await req.json();
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this image for animation. Identify: 1) Main subjects 2) Depth layers 3) Focus points 4) Suggested motion path. Style: ${style}. Story context: ${prompt}` },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ]
    })
  });
  
  const data = await response.json();
  return new Response(JSON.stringify({
    analysis: parseAnalysis(data.choices[0].message.content)
  }));
});
```

## Interface Utilisateur - 3 Écrans Maximum

### Écran 1: Création
```text
┌────────────────────────────────────────────┐
│  🌙 GRIOT STUDIO                           │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │     📷 Touche pour capturer       │   │
│  │        ou importer une image       │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  🎤 Raconte ton histoire...                │
│  ┌────────────────────────────────────┐   │
│  │ [Enregistrer] ou [Écrire]         │   │
│  └────────────────────────────────────┘   │
│                                            │
│  🎨 Style:                                 │
│  [Traditionnel] [Aquarelle] [Papier] [✨]  │
│                                            │
│            [  ✨ ANIMER  ✨  ]             │
│                                            │
└────────────────────────────────────────────┘
```

### Écran 2: Génération (loading magique)
```text
┌────────────────────────────────────────────┐
│                                            │
│          🌟 Magie en cours...             │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │    ╭──────────────────────────╮    │   │
│  │    │   [Image + particules    │    │   │
│  │    │    animées pendant       │    │   │
│  │    │    le chargement]        │    │   │
│  │    ╰──────────────────────────╯    │   │
│  └────────────────────────────────────┘   │
│                                            │
│      ████████████░░░░░ 65%                │
│      "Ajout des effets lumineux..."       │
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
│  │                                    │   │
│  │      [LECTEUR VIDÉO]               │   │
│  │         ▶️ 0:15                    │   │
│  │                                    │   │
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

## Comparaison Avant/Après

| Aspect | v5.0 Actuel | v6.0 Nouveau |
|--------|-------------|--------------|
| Lignes de code | 2600+ | ~800 |
| Écrans UI | 5+ étapes | 3 étapes |
| Temps création | 5-10 min | 30 sec - 2 min |
| Input requis | Audio + Photos + Config | Image + Texte/Voix |
| Animation | Overlays statiques | Ken Burns IA + Parallax |
| IA utilisée | Analyse texte seule | Vision + Texte + Génération |
| Experience | Technique | Magique |

## Résumé de l'Implémentation

1. **Supprimer** les anciens fichiers complexes
2. **Créer** le nouveau GriotStudio minimaliste
3. **Créer** le GriotAnimationEngine simplifié
4. **Créer** l'edge function pour analyse image IA
5. **Tester** le flux complet end-to-end
6. **Optimiser** les performances mobile

## Fichiers à Modifier/Créer

### Nouveaux Fichiers
- `src/components/griot-studio/GriotStudio.tsx`
- `src/components/griot-studio/ImageCapture.tsx`
- `src/components/griot-studio/StoryInput.tsx`
- `src/components/griot-studio/StyleSelector.tsx`
- `src/components/griot-studio/AnimationPreview.tsx`
- `src/components/griot-studio/hooks/useImageAnimation.ts`
- `src/components/griot-studio/hooks/useVFXEngine.ts`
- `src/engines/GriotAnimationEngine.ts`
- `supabase/functions/generate-image-animation/index.ts`

### Fichiers à Modifier
- `src/pages/TamTamCreator.tsx` - Ajouter route vers GriotStudio
- `src/App.tsx` - Ajouter route `/griot-studio`

### Fichiers à Conserver (pour migration)
- `src/templates/GriotDigital.ts` - Garder temporairement comme fallback
- `src/lib/AssetEmotionMapper.ts` - Réutiliser le mapping
