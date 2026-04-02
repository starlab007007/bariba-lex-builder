

# Barre de navigation bas de page — 5 items finaux

## Changement demandé

Remplacer les 5 items actuels (Fil, Apprendre, Créer, Traducteur, Fitila IA) par : **Fil, Apprendre, Créer (+), Dico, Traducteur**.

## Modifications

**Fichier : `src/components/tamtam/KuaishouBottomNav.tsx`**

1. Remplacer l'import `Bot` par `Book` (icone pour Dico/Dictionnaire)
2. Modifier le tableau `navItems` (lignes 20-26) :

```typescript
const navItems: NavItem[] = [
  { id: 'home', icon: Home, labelFr: 'Fil', labelBa: 'Soo', path: '/fitila/social' },
  { id: 'learn', icon: BookOpen, labelFr: 'Apprendre', labelBa: 'Dɔnku', path: '/fitila/learn' },
  { id: 'create', icon: Plus, labelFr: 'Create', labelBa: 'Ko', path: '/fitila/creator', isCreate: true },
  { id: 'dictionary', icon: Book, labelFr: 'Dico', labelBa: 'Gãnsɛ', path: '/fitila/dictionary' },
  { id: 'translator', icon: BookText, labelFr: 'Traducteur', labelBa: 'Tɛnyɛ̃ɛ̃ru', path: '/fitila/translator' },
];
```

- **Dico** pointe vers `/fitila/dictionary` (page dictionnaire existante `TamTamDictionary`)
- **Traducteur** reste inchangé, pointe vers `/fitila/translator`
- **Fitila IA** est supprimé de la barre

## Vérification de la route

Je confirmerai que la route `/fitila/dictionary` existe dans le routeur avant d'implémenter. Si elle n'existe pas, elle sera ajoutée.

