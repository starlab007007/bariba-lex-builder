
# Restauration du bouton hamburger en haut à gauche

## Problème identifié
Le bouton hamburger (≡) qui permettait d'accéder au profil, dictionnaire et traducteur a été remplacé par un bouton central. L'utilisateur souhaite restaurer le bouton hamburger classique en haut à gauche.

## Modification à effectuer

### Fichier: `src/pages/tamtam/TamTamSocial.tsx`

**Composant `FeedIndicator` (lignes 156-232)**

Ajouter un bouton hamburger séparé en haut à gauche:

```text
Structure actuelle:
┌─────────────────────────────────────┐
│         [Pilule centrale]           │ ← Bouton unique au centre
└─────────────────────────────────────┘

Structure après modification:
┌─────────────────────────────────────┐
│ [≡]       [Dots + Label]            │ ← Hamburger à gauche, indicateur au centre
└─────────────────────────────────────┘
```

**Changements:**
1. Ajouter un bouton hamburger (icône `Menu`) positionné en `fixed top-4 left-4`
2. Style du bouton: `bg-black/20 backdrop-blur-sm rounded-full w-10 h-10`
3. Le bouton central devient uniquement un indicateur de feed (sans fonction de menu)
4. Le bouton hamburger déclenche `onMenuOpen` pour ouvrir le side menu

---

## Détails techniques

Le bouton hamburger aura:
- Position: `fixed top-4 left-4 z-40`
- Fond semi-transparent: `bg-black/20`
- Icône `Menu` de lucide-react en blanc
- Animation `whileTap={{ scale: 0.9 }}`
- Accès au profil, dictionnaire, traducteur via `KuaishouSideMenu`
