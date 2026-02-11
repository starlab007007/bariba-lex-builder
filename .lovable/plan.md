
# Correction du bug du menu hamburger FITILA

## Diagnostic

Le bug se manifeste ainsi :
1. Le menu s'ouvre correctement
2. Cliquer sur "Profil" fonctionne (premiere fois)
3. Cliquer sur "Dictionnaire" ou "Traducteur" : la navigation se fait (URL change) mais le menu reste ouvert
4. Une fois dans cet etat, plus rien ne repond (ni le X, ni le backdrop, ni les autres boutons)

**Cause racine** : Dans `handleNavigate`, `navigate(path)` declenche un changement de route qui provoque un re-render du composant `SideMenuDrawer` (via `useLocation()`). L'appel `onClose()` qui suit se perd car le composant est en cours de reconciliation. Le menu reste bloque en position ouverte avec un etat desynchronise.

## Corrections

### Fichier 1 : `src/pages/fitila/FitilaApp.tsx`

**Fix 1 - Fermer le menu AVANT de naviguer** :
- Inverser l'ordre : appeler `onClose()` d'abord, puis `navigate(path)` apres un court delai (`setTimeout` de 150ms) pour laisser l'animation de fermeture se terminer
- Cela evite le conflit entre le changement de route et la mise a jour de l'etat du menu

**Fix 2 - Fermeture automatique sur changement de route** :
- Ajouter un `useEffect` dans `AppContent` qui ecoute `location.pathname` et ferme le menu automatiquement quand la route change
- C'est un filet de securite : meme si `onClose` echoue, le menu se fermera

**Fix 3 - Backdrop avec `pointer-events` explicite** :
- Ajouter `pointer-events: auto` sur le backdrop et le panneau du menu pour garantir que les clics sont captures meme si un element enfant a un z-index ou un positionnement qui interfere

**Fix 4 - Isolation des boutons** :
- Ajouter `position: relative` et `z-index: 10` aux boutons interactifs (X, Profil, Dictionnaire, etc.) dans le panneau du menu pour s'assurer qu'ils sont bien au-dessus de tout
- Ajouter `e.stopPropagation()` sur les clics de boutons pour eviter que les events remontent au backdrop

## Detail technique

```text
// AVANT (bugge) :
handleNavigate = (path) => {
  triggerFeedback('click');
  navigate(path);      // <-- declenche re-render via useLocation
  onClose();           // <-- se perd dans le re-render
}

// APRES (corrige) :
handleNavigate = (path) => {
  triggerFeedback('click');
  onClose();           // <-- ferme le menu immediatement
  setTimeout(() => navigate(path), 150);  // <-- navigue apres fermeture
}

// FILET DE SECURITE dans AppContent :
useEffect(() => {
  if (isMenuOpen) setIsMenuOpen(false);
}, [location.pathname]);
```

## Fichiers modifies

1. `src/pages/fitila/FitilaApp.tsx` : inverser ordre close/navigate, ajouter useEffect sur pathname, renforcer pointer-events
