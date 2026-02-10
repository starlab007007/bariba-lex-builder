
# Correction de l'interface camera

## Modifications a effectuer

### 1. Barre laterale droite (Right Rail)

Supprimer uniquement ces boutons :
- **Magic** (ChevronUp) - ligne 3117-3122
- **Template** (Layers) - ligne 3123-3131
- **V3** (Sparkles) - ligne 3132-3138
- **Switch** (RotateCcw) - ligne 3066-3070 (le premier dans le rail)

Les boutons suivants sont **conserves** : Timer, Flash, Beautify, Graphics, Stickers, Speed, et tous les boutons post-capture (Texte, Couper, Son).

### 2. Badge resolution

Supprimer le composant `CameraResolutionIndicator` affiche en haut a droite (lignes 3050-3059).

### 3. Mode selector (pill)

Retirer "text" de la liste des modes. Le selecteur passera de `["burst", "photo", "video", "text"]` a `["burst", "photo", "video"]` uniquement (ligne 3342).

## Details techniques

### Fichier : `src/components/tamtam/FullscreenCreator.tsx`

**A. Supprimer le badge HD** (lignes 3050-3059)
- Retirer le bloc conditionnel contenant `CameraResolutionIndicator`

**B. Supprimer Switch du rail** (lignes 3066-3070)
- Retirer le `RailButton` avec `RotateCcw` et label "Switch"

**C. Supprimer Magic** (lignes 3117-3122)
- Retirer le `RailButton` avec `ChevronUp` et label "Magic"

**D. Supprimer Template** (lignes 3123-3131)
- Retirer le `RailButton` avec `Layers` et label "Template"

**E. Supprimer V3** (lignes 3132-3138)
- Retirer le `RailButton` avec `Sparkles` et label "V3"

**F. Retirer "text" du mode selector** (ligne 3342)
- Changer `["burst", "photo", "video", "text"]` en `["burst", "photo", "video"]`
- Supprimer la condition `m === "text" ? "Texte"` du label (ligne 3351)
