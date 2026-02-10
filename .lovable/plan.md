
# Remplacement du bouton "Template" par des mini-cartes visuelles animees

## Objectif
Remplacer le bouton unique "Template" (icone Layers) dans la vue camera par **deux mini-cartes visuelles** representant chaque template actif (Griot Anime IA et Village Chronicle). Chaque carte sera cliquable et activera directement le template correspondant.

## Design Vision

La zone actuelle du bouton Template sera transformee en un **carrousel horizontal compact** avec deux cartes miniatures premium:

- **Cartes 56x80px** avec coins arrondis (12px) et bordure luminescente
- **Arriere-plan gradient unique** par template (violet/or pour Griot, bleu/orange pour Chronicle)
- **Emoji large** au centre comme identifiant visuel (🎭 et 📺)
- **Nom court** en bas (10px, blanc)
- **Animation idle**: leger effet de "breathing" (scale pulse) pour attirer l'attention
- **Animation au tap**: scale bounce + haptic feedback
- **Badge "PRO"** dore en haut a droite pour Griot
- **Glassmorphism** avec backdrop-blur pour s'integrer au-dessus de la camera

## Comportement
- Cliquer sur "Griot Anime IA" -> active directement le mode Griot Studio
- Cliquer sur "Village Chronicle" -> active directement le mode News Studio
- Pas de passage par la gallery intermediaire (acces direct)

## Modifications techniques

### Fichier: `src/components/tamtam/FullscreenCreator.tsx`

**1. Remplacer le bloc Template Button (lignes ~3437-3452)**

L'ancien code:
```tsx
<button onClick={() => { setTemplateFlowPhase('selecting'); setDrawer('template'); }}>
  <div className="w-12 h-12 rounded-full ...">
    <Layers className="h-5 w-5" />
  </div>
  <span>Template</span>
</button>
```

Sera remplace par un composant inline avec deux mini-cartes:
```tsx
<div className="flex gap-2">
  {/* Griot Anime IA */}
  <motion.button
    onClick={() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setShowGriotDigitalMode(true);
      setToast('🎭 Griot Anime active');
    }}
    animate={{ scale: [1, 1.03, 1] }}
    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
    whileTap={{ scale: 0.9 }}
    className="w-14 h-20 rounded-xl bg-gradient-to-br from-purple-600/80 to-amber-500/80 
               backdrop-blur-md border border-white/20 flex flex-col items-center justify-center 
               gap-1 shadow-lg shadow-purple-500/20 relative overflow-hidden"
  >
    <div className="absolute top-0.5 right-0.5 bg-amber-400 rounded-full px-1 py-0.5">
      <span className="text-[6px] font-bold text-black">PRO</span>
    </div>
    <span className="text-2xl">🎭</span>
    <span className="text-[8px] font-semibold text-white/90 leading-tight text-center">
      Griot
    </span>
  </motion.button>

  {/* Village Chronicle */}
  <motion.button
    onClick={() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setShowNewsStudioMode(true);
      setToast('📺 Chronicle active');
    }}
    animate={{ scale: [1, 1.03, 1] }}
    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 1.5 }}
    whileTap={{ scale: 0.9 }}
    className="w-14 h-20 rounded-xl bg-gradient-to-br from-blue-600/80 to-orange-500/80 
               backdrop-blur-md border border-white/20 flex flex-col items-center justify-center 
               gap-1 shadow-lg shadow-blue-500/20 relative overflow-hidden"
  >
    <span className="text-2xl">📺</span>
    <span className="text-[8px] font-semibold text-white/90 leading-tight text-center">
      Chronicle
    </span>
  </motion.button>
</div>
```

**2. Ajuster l'alignement du bottom bar**

Le conteneur `flex items-center justify-center gap-8` devra potentiellement etre ajuste (gap reduit) pour accommoder les deux cartes a la place du bouton unique, tout en gardant le bouton de capture central proéminent.

### Aucun nouveau fichier requis
Le changement est localise dans un seul fichier. Les deux templates sont deja importees et les handlers (`setShowGriotDigitalMode`, `setShowNewsStudioMode`) existent deja dans le composant.
