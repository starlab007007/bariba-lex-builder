
# Plan: Griot Digital v5.0 - Montage 3D Animé IA Immersif

## Diagnostic du Problème Actuel

Le moteur `GriotDigital.ts` v4.0 présente ces limitations majeures :

1. **Rendu purement 2D** : Le canvas utilise uniquement `ctx.drawImage()` - aucune intégration Three.js dans le pipeline final
2. **Assets sous-utilisés** : Les 455 lens flares, 22 light leaks et modèles 3D ne sont pas exploités au maximum
3. **Animations statiques** : Ken Burns basique sur photos, pas d'animation 3D dynamique
4. **Pas de profondeur visuelle** : Pas de parallaxe, pas de scènes 3D immersives

## Solution: Architecture Hybride 3D/2D

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    GRIOT DIGITAL v5.0 - MOTEUR 3D IMMERSIF              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  COUCHE 1: THREE.JS SCENE (Background)                                  │
│  ├─ Griot Character Animé (idle, speaking, gesturing)                   │
│  ├─ Village Africain Procédural (huttes, baobabs, feu de camp)          │
│  ├─ Particules GPU (poussière, lucioles, étincelles magiques)           │
│  └─ Éclairage Cinématique Dynamique (lumière chaude → froide)           │
│                                                                         │
│  COUCHE 2: USER CONTENT (Middle Layer)                                  │
│  ├─ Photos avec Ken Burns IA (zoom, orbit, pan selon émotion)           │
│  └─ Vidéo utilisateur intégrée                                          │
│                                                                         │
│  COUCHE 3: VFX PREMIUM (Foreground)                                     │
│  ├─ Light Leaks CDN (WebM alpha channel)                                │
│  ├─ Lens Flares Émotionnels (455 PNG par palette)                       │
│  ├─ Particules Vidéo (WebM overlay)                                     │
│  └─ Transitions Cinématiques (à chaque moment clé)                      │
│                                                                         │
│  COUCHE 4: UI/TEXTE (Top Layer)                                         │
│  ├─ Titre Animé avec Glow                                               │
│  ├─ Sous-titres Synchronisés                                            │
│  └─ Indicateur de Progression                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Nouvelles Fonctionnalités

### 1. Scène 3D Animée Intégrée au Rendu
- Le personnage Griot bouge les lèvres synchronisé avec l'audio (lip-sync basique)
- Animation idle avec respiration, clignement des yeux
- Gestes automatiques aux moments clés détectés par l'IA

### 2. Environnement 3D Dynamique
- Village qui s'illumine selon l'heure narrative (aube → jour → crépuscule)
- Feu de camp central avec particules de fumée
- Parallaxe multi-couches pour profondeur

### 3. Système de Caméra Cinématique
- Travelling avant/arrière synchronisé avec l'intensité émotionnelle
- Orbite autour du personnage pendant les moments épiques
- Gros plans automatiques sur les climax

### 4. VFX Émotionnels Amplifiés
- Chaque émotion déclenche une palette visuelle complète
- Transitions fluides entre les segments narratifs
- Effets de particules dynamiques (lumineux pour joie, sombres pour tension)

## Fichiers à Modifier

### 1. `src/templates/GriotDigital.ts` (Refonte Majeure)
- Intégrer `THREE.WebGLRenderer` dans le pipeline de rendu
- Combiner le rendu 3D avec le canvas 2D via `preserveDrawingBuffer`
- Ajouter système d'animation de personnage

### 2. `src/lib/GriotFallbackScene.ts` (Améliorer les Animations)
- Ajouter système de morph targets pour expressions faciales
- Créer animations de gestes (bras, mains)
- Implémenter feu de camp animé avec particules

### 3. Nouveau: `src/lib/Griot3DRenderPipeline.ts`
- Pipeline hybride Three.js + Canvas 2D
- Gestion de la composition multi-couches
- Synchronisation audio → animation 3D

### 4. `src/lib/AssetEmotionMapper.ts` (Enrichir)
- Mapper émotions → animations 3D (gestures, expressions)
- Mapper émotions → configurations d'éclairage
- Mapper moments clés → mouvements de caméra épiques

## Pipeline de Rendu Hybride

```typescript
// Pseudo-code du nouveau pipeline
class Griot3DRenderPipeline {
  // Layer 1: 3D Scene
  render3DScene(currentTime: number, segment: StorySegment) {
    this.updateCharacterAnimation(segment.emotion, currentTime);
    this.updateEnvironmentLighting(segment.intensity);
    this.updateCameraPosition(segment.cameraMove, currentTime);
    this.renderer.render(this.scene, this.camera);
  }
  
  // Layer 2: Composite to main canvas
  compositeToMainCanvas() {
    ctx.drawImage(this.renderer.domElement, 0, 0);
  }
  
  // Layer 3: VFX Overlays
  renderVFXLayer(emotion: Emotion, intensity: number) {
    ctx.globalCompositeOperation = 'screen';
    this.drawLightLeaks(intensity);
    this.drawEmotionFlares(emotion);
  }
  
  // Final frame
  renderFrame(currentTime: number) {
    this.render3DScene(currentTime, segment);
    this.compositeToMainCanvas();
    this.renderUserContent();
    this.renderVFXLayer();
    this.renderUI();
  }
}
```

## Animations du Personnage Griot

| Émotion | Animation | Éclairage | Particules |
|---------|-----------|-----------|------------|
| Joy | Bras levés, sourire | Doré chaud | Étincelles dorées |
| Wisdom | Mains jointes, tête inclinée | Ambré doux | Poussière lumineuse |
| Tension | Bras croisés, corps rigide | Rouge sombre | Fumée, braises |
| Sadness | Épaules basses, tête penchée | Bleu froid | Pluie légère |
| Excitement | Gestes dynamiques | Multicolore | Confettis |
| Neutral | Idle basique | Lumière neutre | Particules douces |

## Optimisations Performance

1. **Rendu Offscreen** : Three.js rend dans un canvas séparé, composite vers le principal
2. **LOD Dynamique** : Réduire la complexité 3D sur mobile
3. **Frame Skipping** : 24 FPS pour le rendu final, animations internes à 30 FPS
4. **Asset Preloading** : Charger les assets du prochain segment pendant le rendu

## Résumé des Améliorations

| Aspect | v4.0 Actuel | v5.0 Proposé |
|--------|-------------|--------------|
| Rendu 3D | Aucun | Scène Three.js complète |
| Personnage | Statique | Animé avec lip-sync |
| Environnement | Gradient 2D | Village 3D avec parallaxe |
| Éclairage | Fixe | Dynamique selon émotion |
| Caméra | Ken Burns basique | Cinématique 3D |
| VFX | Overlays simples | Multi-couches composées |
| Synchronisation | Audio → durée | Audio → animations 3D |

## Section Technique Détaillée

### Intégration Three.js dans le Pipeline MediaRecorder

Le défi principal est que `MediaRecorder` capture depuis `canvas.captureStream()`. Pour intégrer Three.js :

1. Créer un `WebGLRenderer` avec `preserveDrawingBuffer: true`
2. Rendre la scène 3D dans son canvas dédié
3. Dessiner ce canvas sur le canvas principal avec `ctx.drawImage()`
4. Les VFX 2D sont ensuite composités par-dessus
5. `captureStream()` capture le résultat final composite

### Gestion de la Mémoire GPU

- Limiter la scène 3D à 50k triangles max
- Utiliser des textures compressées (ASTC/ETC2)
- Disposer les ressources Three.js à la fin du rendu
- Partager les géométries entre instances similaires

### Fallback Graceful

Si WebGL n'est pas disponible ou échoue :
1. Détecter via `canvas.getContext('webgl')`
2. Basculer automatiquement vers le rendu 2D enrichi actuel
3. Utiliser les fonctions `draw2DFallback` existantes dans `Griot3DPreview.tsx`
