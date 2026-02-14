
# Correction : Preview sans effets superposés + Indicateur de publication

## Problèmes identifiés

### 1. Effets Magic IA toujours visibles après capture
L'`AREffectsLayer` (coeurs, étincelles, pluie, etc.) et la `StickerLayer` s'affichent **en permanence**, même après la capture. Comme les effets sont déjà "cuits" dans le blob vidéo/photo par le `CanvasCompositor`, ils apparaissent **en double** lors de la prévisualisation.

De plus, le canvas preview draw loop ré-applique le `cssFilter` (filtres face AR) sur la vidéo prévisualisée, ce qui double aussi l'effet des filtres visuels.

### 2. Pas d'indicateur de publication en cours
Le bouton "Publier" dans le `showPublish` overlay n'utilise pas l'état `isPublishing` existant. Il reste cliquable pendant toute la durée de la publication, sans feedback visuel.

---

## Solution

### Correction 1 : Masquer les effets DOM après capture

Dans `FullscreenCreator.tsx`, conditionner l'affichage des couches d'effets :

**AREffectsLayer** (ligne ~3093) :
```
// AVANT
<AREffectsLayer activeEffects={effects.arEffects} />

// APRES
{!hasCapture && <AREffectsLayer activeEffects={effects.arEffects} />}
```

**StickerLayer** (ligne ~3098-3104) :
```
// AVANT
<StickerLayer stickers={effects.stickers} ... isEditing={true} ... />

// APRES  
<StickerLayer stickers={effects.stickers} ... isEditing={!hasCapture} ... />
```
Note : la StickerLayer en mode `isEditing={false}` ne rend rien, donc elle disparait visuellement après capture.

**ShotTipOverlay** (ligne ~3096) :
```
{!hasCapture && <ShotTipOverlay tipId={effects.shotTipId} />}
```

### Correction 2 : Ne plus ré-appliquer le cssFilter sur le preview

Dans le preview canvas draw loop (ligne ~1332), quand `hasCapture` est vrai, le filtre CSS est déjà baked dans le blob. Ne pas le ré-appliquer :

```
// AVANT
ctx.filter = cssFilter && cssFilter !== "none" ? cssFilter : "none";

// APRES
ctx.filter = "none"; // Effects already baked into the captured blob
```

### Correction 3 : Indicateur animé de publication

Modifier le bouton "Publier" (ligne ~2880-2886) pour utiliser l'état `isPublishing` existant :

```
<button
  onClick={publish}
  disabled={isPublishing}
  className="mt-4 w-full h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-500 
             text-white font-semibold flex items-center justify-center gap-2 
             disabled:opacity-60 disabled:cursor-not-allowed"
>
  {isPublishing ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin" />
      Publication en cours...
    </>
  ) : (
    <>
      <Send className="h-5 w-5" />
      Publier
    </>
  )}
</button>
```

Ajouter `setIsPublishing(true)` au début de `publish()` et `setIsPublishing(false)` dans le `finally` block.

Également ajouter un overlay de progression animé sous le bouton quand `isPublishing` ou `isProcessingTemplate` est actif :

```
{(isPublishing || isProcessingTemplate) && (
  <div className="mt-3 flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse" 
           style={{ width: processingProgress ? processingProgress.percent + '%' : '60%' }} />
    </div>
    <span className="text-xs text-white/60">
      {processingProgress?.message_fr || "Préparation de la publication..."}
    </span>
  </div>
)}
```

---

## Fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `src/components/tamtam/FullscreenCreator.tsx` | 1. Conditionner AREffectsLayer, StickerLayer, ShotTipOverlay sur `!hasCapture`. 2. Supprimer cssFilter dans le preview draw loop. 3. Ajouter isPublishing au bouton publier avec spinner + barre de progression. 4. Wrapper publish() avec setIsPublishing. |

## Impact

- La prévisualisation après capture montre le produit final tel qu'il sera publié, sans effets superposés en double
- La musique (si sélectionnée) continue d'être mixée dans le blob avant publication
- Le bouton "Publier" donne un feedback visuel clair avec un spinner animé et une barre de progression
- Le bouton est désactivé pendant la publication pour éviter les doubles clics
