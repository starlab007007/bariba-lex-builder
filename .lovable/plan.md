
# Plan: Griot Digital v5.0 - Montage 3D Immersif IA

## Diagnostic des Problèmes Actuels

Après analyse approfondie du code, j'ai identifié les limitations suivantes :

### 1. Architecture Actuelle (v4.0)
- **`src/templates/GriotDigital.ts`** : Moteur 100% Canvas 2D
- **`src/components/tamtam/Griot3DPreview.tsx`** : Scène 3D Three.js, mais uniquement pour la prévisualisation
- **`src/lib/GriotFallbackScene.ts`** : Primitives 3D (personnage Griot, village, particules)
- **Problème** : Le rendu 3D n'est PAS intégré dans le pipeline de capture `MediaRecorder`

### 2. Assets Sous-Utilisés
- 455 lens flares locaux (`flare-001.png` à `flare-455.png`)
- Light leaks CDN (`leak-001.webm` à `leak-022.webm`)
- Le mapping émotion existe mais les flares ne sont pas tous exploités

### 3. Erreur de Connexion (OfflineService.ts)
- `/robots.txt` retourne 404 → app passe incorrectement en "offline"
- Affiche "Connection Error" même quand la connexion fonctionne

---

## Solution v5.0 : Architecture Hybride 3D/2D

```text
┌────────────────────────────────────────────────────────────────────────┐
│                    GRIOT DIGITAL v5.0 - PIPELINE RENDU                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. CANVAS PRINCIPAL (1080x1920) ← captureStream() → MediaRecorder    │
│     │                                                                  │
│     ├─► LAYER 1: THREE.JS SCENE (WebGLRenderer → drawImage)           │
│     │   ├─ Personnage Griot animé (respiration, gestes selon émotion) │
│     │   ├─ Village/Environnement procédural                           │
│     │   ├─ Particules GPU dynamiques (fireflies/dust/magic)           │
│     │   └─ Éclairage cinématique (couleur selon émotion)              │
│     │                                                                  │
│     ├─► LAYER 2: USER CONTENT                                         │
│     │   └─ Photos/Vidéo avec Ken Burns IA (zoom, orbit, pan)          │
│     │                                                                  │
│     ├─► LAYER 3: VFX PREMIUM                                          │
│     │   ├─ Light Leaks CDN (intensity-driven)                         │
│     │   ├─ Lens Flares émotionnels (455 assets)                       │
│     │   └─ Transitions aux moments clés                                │
│     │                                                                  │
│     └─► LAYER 4: UI/TEXTE                                             │
│         ├─ Titre avec glow                                             │
│         └─ Barre de progression                                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à Modifier

### 1. `src/services/OfflineService.ts`
**Correction de l'erreur de connexion**
- Accepter les réponses 404 comme "en ligne" (le serveur répond)
- Ajouter fallback vers Supabase URL
- Ne déclarer "offline" que sur exception réseau

### 2. `src/templates/GriotDigital.ts` (Refonte Majeure)
**Intégration du rendu 3D dans le pipeline**
- Créer un `THREE.WebGLRenderer` avec `preserveDrawingBuffer: true`
- Ajouter méthode `init3DScene()` avec personnage et environnement
- Modifier `drawFrame()` pour composer 3D → Canvas 2D → VFX
- Animer le personnage selon l'émotion du segment actif

### 3. `src/lib/GriotFallbackScene.ts` (Améliorations)
**Animations dynamiques du personnage**
- Ajouter système de gestures par émotion
- Créer effet "feu de camp" avec particules émissives
- Implémenter animations idle (respiration, clignement)

### 4. `src/lib/AssetEmotionMapper.ts` (Enrichissement)
**Meilleur mapping émotion → effets 3D**
- Mapper émotions → configurations d'éclairage 3D
- Mapper émotions → animations de personnage
- Mapper intensité → mouvement de caméra 3D

---

## Détails Techniques

### Intégration Three.js dans MediaRecorder

```typescript
// Dans GriotDigitalEngine
private threeRenderer: THREE.WebGLRenderer | null = null;
private threeScene: THREE.Scene | null = null;
private threeCamera: THREE.PerspectiveCamera | null = null;

private init3DScene(): void {
  // Canvas offscreen pour Three.js
  const threeCanvas = document.createElement('canvas');
  threeCanvas.width = RENDER_CONFIG.width;
  threeCanvas.height = RENDER_CONFIG.height;
  
  this.threeRenderer = new THREE.WebGLRenderer({
    canvas: threeCanvas,
    preserveDrawingBuffer: true, // CRUCIAL pour captureStream
    antialias: true,
    alpha: true
  });
  
  // Ajouter scène avec personnage et environnement
  this.threeScene = new THREE.Scene();
  this.threeCamera = new THREE.PerspectiveCamera(45, 1080/1920, 0.1, 100);
  
  // Personnage Griot fallback
  const character = createGriotCharacter(this.currentStyle);
  this.threeScene.add(character);
  
  // Environnement
  const environment = createVillageScene(this.currentStyle);
  this.threeScene.add(environment);
}

private drawFrame(currentTime: number, totalDuration: number): void {
  // 1. Rendu 3D
  this.render3DLayer(currentTime);
  
  // 2. Composite 3D sur canvas principal
  ctx.drawImage(this.threeRenderer.domElement, 0, 0, width, height);
  
  // 3. User content (photos/video)
  this.drawBackground(ctx, width, height, currentTime, cameraMove, intensity);
  
  // 4. VFX layers
  this.drawLightLeaks(...);
  this.drawEmotionLensFlares(...);
  
  // 5. UI
  this.drawTitle(...);
  this.drawProgressIndicator(...);
}
```

### Animations Personnage par Émotion

| Émotion | Animation | Éclairage 3D | Particules |
|---------|-----------|--------------|------------|
| joy | Bras levés, rotation tête | Doré chaud (0xFFD700) | Étincelles dorées (additive) |
| wisdom | Mains jointes, inclinaison | Ambré doux (0xD4A574) | Poussière lumineuse (subtle) |
| tension | Corps rigide, oscillation | Rouge sombre (0xFF4444) | Braises, fumée (overlay) |
| sadness | Épaules basses | Bleu froid (0x6495ED) | Gouttes de pluie (alpha) |
| excitement | Gestes dynamiques | Multicolore (cycling) | Confettis (burst) |
| neutral | Idle basique (respiration) | Neutre chaud | Particules douces |

### Correction OfflineService

```typescript
async checkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('/robots.txt', { method: 'HEAD', cache: 'no-store' });
    // Une réponse (même 404) signifie que le serveur répond
    this._isOnline = true;
  } catch {
    // Exception = problème réseau réel
    this._isOnline = navigator.onLine;
  }
  return this._isOnline;
}
```

---

## Optimisations Performance

1. **LOD Dynamique** : Réduire les polygones 3D sur mobile (< 10k triangles)
2. **Rendu Offscreen** : Three.js dans un canvas séparé, composé sur le principal
3. **Frame Skipping Intelligent** : 24 FPS export, 30 FPS interne pour animations fluides
4. **Cache des Lens Flares** : Précharger les flares par émotion avant le rendu

---

## Fallback Graceful

Si WebGL échoue :
1. Détecter via `canvas.getContext('webgl')`
2. Basculer vers le rendu 2D enrichi existant
3. Log warning mais continuer le rendu

---

## Résumé des Améliorations v5.0

| Aspect | v4.0 Actuel | v5.0 |
|--------|-------------|------|
| Rendu 3D | Prévisualisation seulement | Intégré dans export final |
| Personnage | Statique (2D badge) | Animé selon émotion |
| Environnement | Gradient 2D | Village 3D avec parallaxe |
| Éclairage | Fixe | Dynamique (couleur par émotion) |
| Lens Flares | 4 utilisés | 455 mappés par émotion |
| Erreur Connexion | Faux positifs | Logique corrigée |
| Synchronisation | Audio → durée | Audio → durée + animations 3D |

---

## Fichiers Créés/Modifiés

### Fichiers à Modifier
1. **`src/services/OfflineService.ts`** - Fix erreur connexion
2. **`src/templates/GriotDigital.ts`** - Intégration 3D complète
3. **`src/lib/GriotFallbackScene.ts`** - Animations par émotion
4. **`src/lib/AssetEmotionMapper.ts`** - Mapping 3D enrichi

### Nouveaux Fichiers (Optionnel)
- **`src/lib/Griot3DRenderLayer.ts`** - Couche de rendu 3D isolée (si refactoring souhaité)

