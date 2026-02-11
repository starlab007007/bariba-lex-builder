

# Ajouter le template "Conte Live" a cote de Griot

## Objectif

Creer un nouveau bouton "Conte Live" place juste a cote de "Griot" dans l'interface camera, avec le meme fonctionnement (ouvre le GriotStudio).

## Modifications

### Fichier : `src/components/tamtam/FullscreenCreator.tsx`

**1. Nouvel etat**
- Ajouter `const [showConteLiveMode, setShowConteLiveMode] = useState(false);` a cote des autres etats premium (ligne ~593)

**2. Nouveau bouton mini-carte**
- Inserer un 3eme bouton "Conte Live" dans le `<div className="flex gap-2">` (ligne 3437), place entre Griot et Chronicle
- Icone : `🎪` (chapiteau / spectacle vivant)
- Fond transparent identique : `bg-white/10 backdrop-blur-sm border border-white/25`
- Animation distinctive : pulsation de scale (`scale: [1, 1.05, 1]`) + lueur verte/dorée alternante via `boxShadow`
- Badge "LIVE" anime en rouge au lieu de "PRO"
- Texte : "Conte Live"

**3. Nouveau panneau fullscreen**
- Ajouter un bloc `AnimatePresence` apres celui de Griot (ligne ~3876) qui affiche `<GriotStudio />` quand `showConteLiveMode` est true
- Bouton X pour fermer via `setShowConteLiveMode(false)`
- Fonctionnement strictement identique a Griot

## Detail technique

```text
// Nouvel etat (ligne ~593)
const [showConteLiveMode, setShowConteLiveMode] = useState(false);

// Mini-carte "Conte Live" (entre Griot et Chronicle)
<motion.button
  onClick={() => {
    if (navigator.vibrate) navigator.vibrate(50);
    setShowConteLiveMode(true);
    setToast('🎪 Conte Live activé');
  }}
  animate={{ 
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 8px rgba(34, 197, 94, 0.3)',
      '0 0 16px rgba(234, 179, 8, 0.5)',
      '0 0 8px rgba(34, 197, 94, 0.3)'
    ]
  }}
  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.3 }}
  whileTap={{ scale: 0.9 }}
  className="w-14 h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/25 flex flex-col items-center justify-center gap-1 relative overflow-hidden"
>
  <motion.div 
    className="absolute top-0.5 right-0.5 bg-red-500 rounded-full px-1 py-0.5"
    animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
    transition={{ repeat: Infinity, duration: 1 }}
  >
    <span className="text-[6px] font-bold text-white">LIVE</span>
  </motion.div>
  <span className="text-2xl">🎪</span>
  <span className="text-[8px] font-semibold text-white/90 leading-tight text-center">Conte</span>
</motion.button>

// Panneau fullscreen (apres le bloc Griot)
<AnimatePresence>
  {showConteLiveMode && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] bg-background"
    >
      <button
        onClick={() => setShowConteLiveMode(false)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 backdrop-blur"
      >
        <X className="w-5 h-5" />
      </button>
      <GriotStudio />
    </motion.div>
  )}
</AnimatePresence>
```

## Fichier modifie

1. `src/components/tamtam/FullscreenCreator.tsx` : ajout etat + mini-carte + panneau fullscreen

