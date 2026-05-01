# Plan — Ajouter le module Classe dans le menu de bas

## Diagnostic

Le menu de bas actif est `src/components/tamtam/KuaishouBottomNav.tsx`. Il contient aujourd'hui **5 items** :

```
[Fil/Soo] [Apprendre/Dɔnku] [+ Créer] [Dico/Gãnsɛ] [Traducteur/Tɛnyɛ̃ɛ̃ru]
```

Le bouton central `+` reste l'élément visuel fort (style Kuaishou cyan/rouge).

## Proposition recommandée — Menu à 6 items, "Classe" à côté d'"Apprendre"

```
┌────────────────────────────────────────────────────────────────┐
│  🏠 Fil    📖 Apprendre    🏫 Classe    [+]    📕 Dico    🔤 Trad │
│   Soo        Dɔnku           Klaasi              Gãnsɛ    Tɛnyɛ̃ɛ̃ru│
└────────────────────────────────────────────────────────────────┘
```

- **Fil** (🏠) — `/fitila/social`
- **Apprendre** (📖) — `/fitila/learn`
- **Classe** (🏫) — `/fitila/classe`  *(nouveau, juste à côté d'Apprendre comme demandé)*
- **Créer** (+ central, look Kuaishou inchangé) — `/fitila/creator`
- **Dico** (📕) — `/fitila/dictionary`
- **Traducteur** (🔤) — `/fitila/translator`

### Pourquoi cette disposition est la meilleure

1. **Cohérence pédagogique** : Apprendre + Classe sont deux faces du même module éducatif, donc collés à gauche du `+` central.
2. **Le bouton `+` reste au centre** (référence visuelle Kuaishou conservée) — pas de désorientation.
3. **6 items tiennent confortablement** sur mobile 360px : largeur ~58px par item (déjà `min-w-[52px]` aujourd'hui), juste un petit ajustement de padding.
4. **Bilingue maintenu** : libellé Bariba `Klaasi` (translittération phonétique du français "Classe", forme adoptée à l'oral).

## Adaptations responsive

- **< 360px** (très petits écrans) : réduire le padding horizontal de `px-2` à `px-1.5` et la taille texte de `text-[10px]` à `text-[9px]` pour les 5 boutons non-create. L'icône reste `w-5 h-5`.
- **≥ 360px** : aucun changement visuel notable, simplement un item de plus.
- **Bouton Créer** : taille et clip-path inchangés (-mt-3, w-12 h-8) pour préserver l'identité visuelle.

## Icône choisie pour Classe

`School` de `lucide-react` (🏫 stylisé) — cohérent avec les autres icônes du dock, déjà importée ailleurs dans le projet.

## Modifications techniques

**Un seul fichier à modifier** : `src/components/tamtam/KuaishouBottomNav.tsx`

1. Ajouter `School` à l'import `lucide-react`.
2. Insérer un nouvel item dans `navItems` entre `learn` et `create` :
   ```ts
   { id: 'classe', icon: School, labelFr: 'Classe', labelBa: 'Klaasi', path: '/fitila/classe' },
   ```
3. Adapter `isActive` pour reconnaître `/fitila/classe` et ses sous-routes (`/fitila/classe/notes`, `/fitila/classe/corrections`) — la logique `startsWith` actuelle gère déjà ça.
4. Légers ajustements responsive (`px-1.5` sur très petit écran via `sm:px-2`) pour absorber le 6e item sans casser la mise en page sur 360px.

Aucun changement de routing nécessaire — la route `/fitila/classe` existe déjà dans `App.tsx`.

## Garanties

- ✅ Bouton **Classe** visible et cliquable, ouvre `/fitila/classe`
- ✅ Tous les autres boutons (Fil, Apprendre, Créer, Dico, Traducteur) **conservés** intacts
- ✅ Bouton central **+ Créer** garde son style Kuaishou cyan/rouge
- ✅ Indicateur actif (point bleu sous l'icône) fonctionne pour Classe et ses sous-pages
- ✅ Bilingue FR/BA respecté
- ✅ Responsive testé du 320px au 1280px+
- ✅ Feedback haptique (`triggerFeedback('click')`) appliqué au nouveau bouton

## Hors scope

- Refonte graphique du dock (proposable séparément si tu veux un look plus premium)
- Badge de notification "nouvelle correction d'enseignant" sur l'icône Classe (peut s'ajouter dans une itération suivante)
