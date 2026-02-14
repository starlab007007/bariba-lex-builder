

# Correction : Les effets Magic IA ne s'affichent pas dans le rendu final

## Probleme identifie

Le bug est un **probleme de mapping entre les identifiants des effets et les noms d'animation** dans le compositor canvas.

Voici ce qui se passe :

1. Quand vous selectionnez "Coeurs" dans Magic IA, l'effet a l'ID `hearts` et le champ animation `floating-hearts`
2. Le code filtre les effets et passe les **IDs** (`hearts`) au compositor
3. Le compositor fait un `switch` sur le nom recu et cherche `floating-hearts` -- il ne trouve jamais `hearts`
4. Resultat : l'effet n'est jamais dessine sur le canvas final

Ce probleme affecte **tous les effets dont l'ID differe du nom d'animation**. Actuellement, `hearts` / `floating-hearts` est le cas le plus visible, mais le probleme structurel affecte potentiellement tout le pipeline.

De plus, le code de filtrage ne transmet que les IDs bruts au lieu des noms d'animation, ce qui casse systematiquement le rendu.

## Solution

### 1. Corriger le mapping ID vers animation (`FullscreenCreator.tsx`)

Dans les 3 endroits ou `overlayArEffects` est calcule (photo, video, et filtre CSS), remplacer le filtre qui retourne les IDs par un filtre qui retourne les **noms d'animation** :

```text
AVANT (bugge) :
  overlayArEffects = effects.arEffects.filter(arId => {
    const ar = AR_EFFECTS.find(e => e.id === arId);
    return ar?.type === 'overlay' && ar?.animation;
  });
  // Retourne ['hearts'] -- le compositor ne reconnait pas 'hearts'

APRES (corrige) :
  overlayArEffects = effects.arEffects
    .map(arId => AR_EFFECTS.find(e => e.id === arId))
    .filter(ar => ar?.type === 'overlay' && ar?.animation)
    .map(ar => ar!.animation!);
  // Retourne ['floating-hearts'] -- le compositor reconnait et dessine
```

### 2. Appliquer cette correction dans 3 endroits

| Emplacement | Ligne approximative | Usage |
|-------------|-------------------|-------|
| `capturePhotoFromVideo()` | ~276-279 | Capture photo statique |
| `startRecording()` bloc composite | ~1410-1413 | Enregistrement video |
| Tout autre endroit calculant `overlayArEffects` | A verifier | Coherence |

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/tamtam/FullscreenCreator.tsx` | Corriger le mapping `overlayArEffects` pour passer les noms d'animation au lieu des IDs dans `capturePhotoFromVideo` et `startRecording` |

## Impact

- Tous les effets AR overlay (coeurs, etincelles, pluie, confetti, neige, bulles, lucioles) seront correctement dessines dans les photos et videos capturees
- Le rendu final dans le feed correspondra exactement a la preview en temps reel
- Aucun changement de comportement pour les effets de type "face" (filtre CSS) qui fonctionnent deja correctement
- Correction simple et ciblee, pas de risque de regression

