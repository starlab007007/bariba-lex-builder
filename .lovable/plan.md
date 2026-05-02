
# Nouvelle barre de navigation avec bouton "+" central et Fitila Tem IA

## Layout propose

```text
┌─────────────────────────────────────────────────────────────┐
│  Fil    Apprendre   Classe    [+]    Dico   Traducteur  IA │
│  (1)      (2)        (3)    floatt   (4)      (5)      (6) │
└─────────────────────────────────────────────────────────────┘
```

- **Gauche** : Fil, Apprendre, Classe
- **Centre** : Bouton "+" flottant (rond, gradient cyan/rouge, depasse au-dessus de la barre)
- **Droite** : Dico, Traducteur, Fitila Tem IA

Le bouton "+" est positionne en `absolute` au centre exact de la barre, remonte de moitie au-dessus. Les 6 boutons reguliers sont repartis en 2 groupes de 3 avec un espace central reserve.

## Modifications

### 1. `src/components/tamtam/KuaishouBottomNav.tsx`

- Retirer le bouton "create" du tableau `navItems`
- Ajouter le nouvel item `{ id: 'tem-ia', icon: Bot, labelFr: 'Fitila IA', labelBa: 'Fitila IA', path: '/fitila/tem-ia' }`
- Decouper les 6 items en `leftItems` (indices 0-2) et `rightItems` (indices 3-5)
- Rendre le layout en grille : `flex` avec gauche (3 items) + spacer central (pour le "+") + droite (3 items)
- Bouton "+" en `absolute left-1/2 -translate-x-1/2 -top-5` : cercle de 48px avec gradient, ombre portee

### 2. Aucun autre fichier a modifier

La route `/fitila/tem-ia` existe deja. Le composant `KuaishouBottomNav` est utilise via `KuaishouLayout` partout.
