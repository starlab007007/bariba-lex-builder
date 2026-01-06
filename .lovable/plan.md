# Plan: Refactoring Interface Creator - Mode Pill Fonctionnel et Navigation Simplifiée

## Objectif
Simplifier l'interface en:
1. Enlevant les icônes/emojis du carousel template (afficher UNIQUEMENT les labels)
2. Rendant chaque mode du Mode Pill (Burst/Photo/Video/Text) pleinement fonctionnel
3. Reconfigurant les Bottom Tabs pour inclure les durées vidéo, Story, Album, Template

---

## Modifications Détaillées

### 1. Carousel Templates - Enlever les icônes

**Fichier:** `src/components/tamtam/creator/TemplateOverlay.tsx`

**Changements:**
- Modifier `TemplateCarousel` pour afficher UNIQUEMENT le label (pas d'emoji visible)
- Le cercle devient un simple bouton texte avec fond semi-transparent
- Style épuré: juste le texte sur fond dark

**Avant:**
```tsx
<span className="drop-shadow-lg">{tpl.emoji}</span>
```

**Après:**
```tsx
// Suppression de l'emoji, affichage label seul dans le cercle
<span className="text-[10px] text-center font-medium">{tpl.label}</span>
```

---

### 2. Mode Pill - Fonctionnalités Complètes

**Fichier:** `src/components/tamtam/FullscreenCreator.tsx`

Actuellement les modes (burst, photo, video, text) changent juste l'état mais n'activent pas leur fonctionnalité propre.

**Implémentation par mode:**

#### 2.1 - Mode BURST (Rafale)
- Capture continue de photos en rafale (toutes les 300ms)
- Affiche un compteur de photos prises
- Maintenir appuyé le bouton capture pour rafale
- Animation flash à chaque capture

#### 2.2 - Mode PHOTO
- Capture simple d'une photo
- Son d'obturateur
- Pas de durée limite

#### 2.3 - Mode VIDEO
- Enregistrement vidéo
- Affiche le timer de durée
- Limite selon `lengthSec` (15s, 30s, 45s, 60s)
- Indicateur rouge clignotant pendant l'enregistrement

#### 2.4 - Mode TEXT
- Pas de caméra, fond dégradé ou couleur
- Zone de texte centrale pour écrire
- Clavier automatiquement ouvert
- Choix de couleur de fond
- Police stylisée

---

### 3. Bottom Tabs - Nouvelle Configuration

**Fichier:** `src/components/tamtam/FullscreenCreator.tsx`

**Ancienne configuration (à remplacer):**
```tsx
{ id: "graphics", label: "Graphics" },
{ id: "video", label: "Video" },
{ id: "story", label: "Story" },
{ id: "template", label: "Template" },
{ id: "live", label: "Live" },
```

**Nouvelle configuration:**

| Tab | ID | Action |
|-----|-----|--------|
| 15s | duration_15 | Définit lengthSec = 15, mode = video |
| 30s | duration_30 | Définit lengthSec = 30, mode = video |
| 45s | duration_45 | Définit lengthSec = 45, mode = video |
| 60s | duration_60 | Définit lengthSec = 60, mode = video |
| Story | story | Active mode story (15s éphémère) |
| Album | album | Ouvre sélecteur de fichiers locaux |
| Template | template | Affiche drawer avec liste templates |

**UI des tabs:**
- Sans icônes, texte seul
- Tab actif = fond blanc + texte noir
- Tabs inactifs = texte blanc/60

---

### 4. Nouveau Type TopTab

**Modifications TypeScript:**

```typescript
type TopTab = 
  | "duration_15" 
  | "duration_30" 
  | "duration_45" 
  | "duration_60" 
  | "story" 
  | "album" 
  | "template";
```

---

### 5. Album - Sélecteur de Fichiers Local

**Nouvelle fonctionnalité:**
- Input file hidden avec accept="image/*,video/*"
- Permet de sélectionner des photos/vidéos de la galerie
- Après sélection, va directement à l'étape preview

**Code:**
```tsx
const fileInputRef = useRef<HTMLInputElement>(null);

const handleAlbumSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCapturedType(file.type.startsWith('video') ? 'video' : 'photo');
    setStep('preview');
  }
};

<input
  ref={fileInputRef}
  type="file"
  accept="image/*,video/*"
  className="hidden"
  onChange={handleAlbumSelect}
/>
```

---

### 6. Template Drawer - Liste Complète

**Nouveau drawer pour templates:**
- Liste verticale scrollable des 19 templates
- Groupés par catégorie (Contes, Sagesse, Marché, Conseils, Création)
- Chaque item = emoji + label + description courte
- Sélection applique le template et ferme le drawer

---

## Fichiers à Modifier

1. **`src/components/tamtam/FullscreenCreator.tsx`**
   - Modifier `TopTab` type
   - Implémenter logique Burst mode
   - Implémenter logique Text mode (overlay texte)
   - Remplacer Bottom Tabs par nouvelle config
   - Ajouter Album file input
   - Ajouter Template drawer

2. **`src/components/tamtam/creator/TemplateOverlay.tsx`**
   - Modifier `TemplateCarousel` pour enlever emojis du cercle
   - Afficher label seul ou cercle avec label à l'intérieur

3. **`src/components/tamtam/creator/CreatorEffectsData.ts`**
   - Ajouter `lengthSec: 45` aux options si manquant

---

## Flow Utilisateur Final

```
1. OUVRIR CREATOR
   └─ Par défaut: mode Video, durée 30s

2. BOTTOM TABS
   └─ Tap "15s" → mode video + durée 15s
   └─ Tap "30s" → mode video + durée 30s  
   └─ Tap "45s" → mode video + durée 45s
   └─ Tap "60s" → mode video + durée 60s
   └─ Tap "Story" → mode story (15s éphémère)
   └─ Tap "Album" → ouvre galerie locale
   └─ Tap "Template" → ouvre drawer templates

3. MODE PILL (toujours visible)
   └─ Burst → capture rafale
   └─ Photo → capture photo unique
   └─ Video → enregistrement vidéo
   └─ Text → création texte stylisé

4. TEMPLATE CAROUSEL
   └─ Affiche labels seuls (sans emoji dans cercle)
   └─ Sélection applique overlay + config
```

---

## Estimation
- Lignes modifiées: ~150-200
- Complexité: Moyenne
- Fichiers: 2-3

---

## Critical Files for Implementation

- `src/components/tamtam/FullscreenCreator.tsx` - Core logic for modes, tabs, album input
- `src/components/tamtam/creator/TemplateOverlay.tsx` - Template carousel UI to remove icons
- `src/components/tamtam/creator/CreatorEffectsData.ts` - Data definitions for templates
