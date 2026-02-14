

# Correction: Integrer les effets Magic IA dans le rendu final (photos et videos)

## Probleme identifie

Les effets selectionnes dans Magic IA (filtres, AR effects comme sparkles/coeurs/pluie, stickers, cadrage, defis) ne sont PAS integres dans le rendu final publie dans le feed. Voici pourquoi :

**Photos** : La fonction `capturePhotoFromVideo` applique le filtre CSS et les stickers emoji sur le canvas, mais les effets AR (sparkles, coeurs, pluie, confetti, neige, bulles, lucioles) sont des elements HTML/DOM superposes — ils ne sont jamais dessines sur le canvas de capture.

**Videos** : Le `MediaRecorder` enregistre directement le flux camera brut (`streamRef.current`). Aucun filtre, aucun effet AR, aucun sticker n'est integre dans l'enregistrement. Un commentaire dans le code dit "effects applied at export" mais cette etape d'export n'existe pas.

**Cadrage/Graphics** : Appliques en CSS sur le container, jamais bakes dans le fichier final.

## Solution technique

### Principe : Canvas compositing

Creer un canvas de composition qui combine toutes les couches visuelles en une seule image/flux avant capture. Au lieu de capturer le flux camera brut, on capture le canvas composite qui contient :

```text
Couche 1: Video camera (avec filtre CSS traduit en canvas filter)
Couche 2: Graphics/cadrage (bordures, vignette)  
Couche 3: AR Effects (particules dessinees sur canvas)
Couche 4: Stickers (emoji positionnes)
Couche 5: Text overlays
```

### Etape 1 : Creer un utilitaire `CanvasCompositor`

Nouveau fichier `src/utils/CanvasCompositor.ts` :

- Fonction `compositeFrame(ctx, video, effects, canvasW, canvasH)` qui dessine toutes les couches sur un canvas
- Traduit les effets AR (sparkles, hearts, rain...) en primitives canvas (cercles, lignes, formes animees) au lieu de s'appuyer sur le DOM React
- Dessine les stickers, le filtre, les bordures de cadrage

### Etape 2 : Modifier `capturePhotoFromVideo` pour utiliser le compositor

Dans `FullscreenCreator.tsx`, la fonction `capturePhotoFromVideo` recevra les `arEffects` actifs et appellera les fonctions de dessin canvas correspondantes apres le filtre et avant les stickers :

- Sparkles : petits cercles dores a positions aleatoires
- Coeurs flottants : formes coeur en bezier
- Pluie : lignes diagonales semi-transparentes
- Confetti : rectangles colores a rotation aleatoire
- Neige : cercles blancs de tailles variees
- Bulles : cercles avec reflet
- Lucioles : points lumineux avec halo

### Etape 3 : Modifier `startRecording` pour capturer depuis le canvas composite

Au lieu d'enregistrer depuis `streamRef.current`, on :

1. Active un canvas de composition (`liveCanvasRef`) meme sans template
2. Lance une boucle `requestAnimationFrame` qui dessine le flux camera + tous les effets sur ce canvas
3. Capture le flux depuis `liveCanvasRef.captureStream(30)` pour le MediaRecorder
4. Ajoute les pistes audio du flux camera original

### Etape 4 : Gerer les graphics/cadrage dans le canvas

Les styles de cadrage (bordures arrondies, vignette, aspect ratio) sont traduits en operations canvas equivalentes lors de la composition.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/utils/CanvasCompositor.ts` | **Nouveau** - Fonctions de dessin canvas pour chaque type d'effet AR |
| `src/components/tamtam/FullscreenCreator.tsx` | Modifier `capturePhotoFromVideo` pour dessiner les AR effects sur le canvas |
| `src/components/tamtam/FullscreenCreator.tsx` | Modifier `startRecording` pour enregistrer depuis le canvas composite au lieu du flux brut |
| `src/components/tamtam/FullscreenCreator.tsx` | Ajouter une boucle de composition continue quand des effets sont actifs |

## Detail technique du CanvasCompositor

```text
drawAREffect(ctx, effectId, width, height, time):
  - "sparkles"       -> 40 cercles dores, tailles 2-6px, positions aleatoires, opacite pulsante
  - "floating-hearts" -> 25 coeurs rouges/roses, mouvement ascendant
  - "rain"           -> 60 lignes diagonales bleues, mouvement descendant
  - "confetti"       -> 35 rectangles multicolores, rotation + chute
  - "snow"           -> 45 cercles blancs, chute lente + derive laterale
  - "bubbles"        -> 20 cercles avec reflet, mouvement ascendant
  - "fireflies"      -> 30 points jaunes lumineux avec halo, mouvement aleatoire

drawGraphicsFrame(ctx, graphicsId, width, height):
  - Bordures arrondies, vignette, aspect ratio clip
```

## Flux de capture modifie

```text
AVANT (actuel):
  Camera -> flux brut -> MediaRecorder -> video sans effets

APRES (corrige):
  Camera -> Canvas composite (video + filtre + AR + stickers + cadrage)
         -> captureStream(30) -> MediaRecorder -> video avec TOUS les effets
```

## Impact

- Toutes les photos capturees contiendront les effets AR visibles
- Toutes les videos enregistrees auront les filtres, AR effects, stickers et cadrage bakes
- Le rendu dans le feed correspondra exactement a ce que l'utilisateur voit pendant la capture
- Les performances restent bonnes grace au dessin canvas direct (pas de capture DOM)
- Pas de changement pour les templates premium (Griot, Chronicle) qui ont leur propre pipeline

