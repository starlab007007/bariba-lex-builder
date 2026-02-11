

# Fond transparent et animations attractives pour les mini-cartes Griot et Chronicle

## Etat actuel

Les deux mini-cartes dans l'interface camera (`FullscreenCreator.tsx`, lignes 3439-3471) ont :
- **Griot** : fond `bg-gradient-to-br from-purple-600/80 to-amber-500/80` (opaque a 80%)
- **Chronicle** : fond `bg-gradient-to-br from-blue-600/80 to-orange-500/80` (opaque a 80%)
- Animation : simple `scale [1, 1.03, 1]` lente (3s) -- peu visible

## Modifications

### Fichier : `src/components/tamtam/FullscreenCreator.tsx`

**1. Fond transparent**
- Remplacer les fonds gradient opaques par `bg-white/10 backdrop-blur-sm` pour un effet vitré transparent
- Garder la bordure `border-white/20` pour la lisibilité

**2. Animations attractives**

Pour la carte **Griot** :
- Animation de pulsation lumineuse : `boxShadow` qui alterne entre une lueur violette/ambrée
- Leger mouvement de rebond vertical (`y: [0, -3, 0]`) toutes les 2.5s
- Le badge PRO aura une animation de rotation/pulse

Pour la carte **Chronicle** :
- Animation de lueur bleue pulsante via `boxShadow`
- Leger mouvement de rotation (`rotate: [-1, 1, -1]`) toutes les 3s en decalage
- Effet de brillance (shimmer) qui traverse la carte periodiquement

Les deux cartes garderont leur `whileTap={{ scale: 0.9 }}` pour le feedback tactile.

## Detail technique

```text
// Griot card
className="w-14 h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/25 ..."
animate={{ 
  y: [0, -3, 0],
  boxShadow: [
    '0 0 8px rgba(168, 85, 247, 0.3)',
    '0 0 16px rgba(245, 158, 11, 0.5)',
    '0 0 8px rgba(168, 85, 247, 0.3)'
  ]
}}
transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}

// Chronicle card  
className="w-14 h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/25 ..."
animate={{
  rotate: [-1, 1, -1],
  boxShadow: [
    '0 0 8px rgba(59, 130, 246, 0.3)',
    '0 0 16px rgba(249, 115, 22, 0.5)',
    '0 0 8px rgba(59, 130, 246, 0.3)'
  ]
}}
transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 0.5 }}

// PRO badge animation
animate={{ scale: [1, 1.15, 1] }}
transition={{ repeat: Infinity, duration: 1.5 }}
```

### Fichier modifie

1. `src/components/tamtam/FullscreenCreator.tsx` (lignes 3436-3472) : fond transparent + animations enrichies
