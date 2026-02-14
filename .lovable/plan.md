
# Correction : Animations Magic IA non fluides/naturelles dans l'enregistrement

## Diagnostic

Le probleme vient d'une **divergence majeure entre les animations DOM (preview) et les animations Canvas (enregistrement)**. Ce sont deux systemes completement differents qui produisent des resultats visuellement incompatibles :

| Aspect | Preview (DOM/Framer Motion) | Enregistrement (Canvas) |
|--------|---------------------------|------------------------|
| **Coeurs** | 35 particules, emoji coeur, trajectoires multi-points (6 keyframes x/y), scale 0.5-1.2, easing `easeInOut` | 25 particules, bezier geometrique, mouvement lineaire ascendant simple |
| **Sparkles** | 40 particules, emoji etoile, rotation 0-360, 6 keyframes de position | 40 particules, cercles jaunes, leger drift sin/cos |
| **Confetti** | 50 particules, rectangles colores, rotation jusqu'a 1080deg, 6 keyframes | 35 particules, rectangles, chute lineaire simple |
| **Neige** | 50 flocons emoji, derive laterale multi-points, rotation 180deg | 45 cercles blancs, chute lineaire + derive basique |
| **Bulles** | 35 bulles CSS, mouvement ascendant multi-points, scale pulse | 20 cercles, ascension lineaire |
| **Lucioles** | 40 points, trajectoire 7 keyframes x/y, scale 0.8-1.4, glow CSS | 30 points, drift sin/cos basique |
| **Pluie** | 60 gouttes, gradient CSS, chute rapide | 60 lignes, chute lineaire |

**Resultat** : l'utilisateur voit des animations riches et fluides en preview, mais l'enregistrement produit des effets "comprimes", rigides et mecaniques.

## Solution

Reecrire le `CanvasCompositor.ts` pour reproduire fidelement le comportement des animations DOM :

### 1. Aligner les nombres de particules avec le DOM

Utiliser les memes quantites que les composants React (35 coeurs au lieu de 25, 50 confetti au lieu de 35, etc.)

### 2. Implementer une interpolation multi-keyframes

Au lieu de simples formules sin/cos, reproduire les trajectoires multi-points de Framer Motion avec une fonction d'interpolation par keyframes :

```text
Exemple pour les coeurs (DOM) :
  x: [0, 25, -25, 15, -15, 0]  (6 etapes)
  y: [0, -40, 20, -30, 10, 0]
  scale: [0.5, 1.2, 0.9, 1.1, 0.8, 0.5]
  opacity: [0, 1, 0.8, 1, 0.6, 0]

-> Canvas : interpoler lineairement entre ces keyframes 
   en fonction du temps normalise (t = 0..1)
```

### 3. Appliquer un easing `easeInOut` au lieu de lineaire

Ajouter une fonction easeInOut pour que le mouvement soit naturel et non mecanique.

### 4. Enrichir le rendu visuel

- Coeurs : dessiner des coeurs plus grands, avec des couleurs variees (rouge, rose, magenta)
- Sparkles : ajouter la croix scintillante + rotation + taille pulsante
- Neige : ajouter la derive laterale multi-points, taille plus grande
- Bulles : augmenter la taille, ajouter le reflet lumineux
- Lucioles : trajectoires complexes 7 points, halo plus large, pulsation scale

### 5. Harmoniser les durees et delais

Les durations/delays du canvas doivent correspondre aux valeurs DOM pour un rythme identique.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/utils/CanvasCompositor.ts` | Reecrire toutes les fonctions `drawAREffect` pour reproduire les animations DOM avec interpolation multi-keyframes, easing, et memes parametres visuels |

## Detail technique

### Nouvelle fonction utilitaire : `interpolateKeyframes`

```text
interpolateKeyframes(keyframes: number[], t: number): number
  - t est normalise entre 0 et 1
  - interpole lineairement entre les valeurs du tableau
  - ex: interpolateKeyframes([0, 25, -25, 15, 0], 0.3) 
    -> interpole entre 25 et -25

easeInOut(t: number): number
  - formule cubique standard pour mouvement naturel
```

### Parametres alignes sur le DOM

```text
sparkles:       40 particules, duration 3-4s, rotation 0->360, 6 keyframes x/y
floating-hearts: 35 particules, duration 4-5s, scale [0.5,1.2,0.9,1.1,0.8,0.5]
rain:           60 gouttes, duration 0.8-1.2s, chute rapide lineaire
confetti:       50 particules, duration 3-4s, rotation 0->1080deg, 6 keyframes
snow:           50 flocons, duration 4-6s, derive laterale 7 keyframes x
bubbles:        35 bulles, duration 4-6s, montee multi-points, scale pulse
fireflies:      40 lucioles, duration 5-8s, 7 keyframes x/y, scale [0.8,1.4]
```

## Impact

- Les animations dans l'enregistrement video seront visuellement identiques a la preview
- Les photos capturees auront des effets naturels et expressifs
- Le rendu dans le feed sera fluide et dynamique, exactement comme pendant la creation
- Aucun changement sur la preview DOM (elle reste inchangee)
- Performance preservee : l'interpolation multi-keyframes est tres legere en calcul
