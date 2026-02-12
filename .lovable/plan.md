

# Plan : Boutons principaux en bleu + texte blanc sur tout le parcours Conte Vivant

## Analyse des boutons actuels

En parcourant tous les fichiers du flux de creation (de l'accueil jusqu'a la publication), voici chaque bouton "payload" (action principale) et sa couleur actuelle :

### ConteVivantStudio.tsx (Accueil)
- "Creer un conte" / "Demo" / "Mes contes" : fond `#1a1a2a`, bordure `#444` -- pas de couleur d'action claire
- "Creer mon premier conte" : couleur par defaut du composant Button (violet/primary)
- "Jouer" (liste des contes) : variant outline, bordure blanche

### StoryBuilder.tsx (Builder)
- Step indicators actifs : `bg-amber-500` (orange)
- Bouton "Suivant" : `bg-amber-500` (orange)
- Bouton "Precedent" : outline blanc
- "Tester mon conte" : gradient amber-to-orange
- "Publier le conte" : couleur par defaut Button
- Dialog confirmation "Publier" : couleur par defaut Button

### SegmentEditor.tsx (Editeur de segment)
- "Visuel" : variant outline (gris)
- "Narration" : variant outline (gris)
- "Generer IA" : outline violet

### ChoiceOverlay.tsx (Player - choix)
- Boutons de choix : couleur dynamique par choix (orange/teal/etc.) -- ceux-ci restent tels quels car ils sont thematiques

---

## Corrections a appliquer

### Regle : Tout bouton d'action principale = `bg-blue-600 hover:bg-blue-500 text-white`

### Fichier 1 : `ConteVivantStudio.tsx`
- Boutons d'action "Creer un conte", "Demo", "Mes contes" : changer la bordure active et ajouter un accent bleu sur hover
- "Creer mon premier conte" (ligne 203) : ajouter `className="mt-4 bg-blue-600 hover:bg-blue-500 text-white"`
- "Jouer" (ligne 212-213) : changer en `bg-blue-600 hover:bg-blue-500 text-white` au lieu de outline
- Bouton "Retour" (ligne 197) : reste ghost (bouton secondaire, pas payload)

### Fichier 2 : `StoryBuilder.tsx`
- Bouton "Suivant" (ligne 383) : remplacer `bg-amber-500 hover:bg-amber-400` par `bg-blue-600 hover:bg-blue-500`
- Bouton "Tester mon conte" (ligne 348) : remplacer le gradient amber/orange par `bg-blue-600 hover:bg-blue-500 text-white`
- Bouton "Publier le conte" (ligne 363) : ajouter `bg-blue-600 hover:bg-blue-500 text-white`
- Bouton "Publier" dans la dialog de confirmation (ligne 405) : ajouter `bg-blue-600 hover:bg-blue-500 text-white`
- Step indicators actifs (ligne 227) : changer `bg-amber-500` par `bg-blue-600` et les steps passes en `bg-blue-600/20 text-blue-300`
- Bouton "Precedent" : reste outline (bouton secondaire)

### Fichier 3 : `SegmentEditor.tsx`
- Bouton "Visuel" (ligne 209) : changer en `bg-blue-600 hover:bg-blue-500 text-white` (c'est une action primaire de l'editeur)
- Bouton "Narration" (ligne 226) : changer en `bg-blue-600 hover:bg-blue-500 text-white`
- Bouton "Generer IA" (ligne 238) : garder en violet distinct (action secondaire speciale IA)

### Fichier 4 : `ChoiceOverlay.tsx`
- Pas de changement : les boutons de choix utilisent des couleurs thematiques dynamiques liees au conte

---

## Resume visuel

| Bouton | Fichier | Avant | Apres |
|--------|---------|-------|-------|
| Creer mon premier conte | ConteVivantStudio | default/primary | `bg-blue-600 text-white` |
| Jouer | ConteVivantStudio | outline blanc | `bg-blue-600 text-white` |
| Suivant | StoryBuilder | `bg-amber-500` | `bg-blue-600 text-white` |
| Tester mon conte | StoryBuilder | gradient amber/orange | `bg-blue-600 text-white` |
| Publier le conte | StoryBuilder | default | `bg-blue-600 text-white` |
| Publier (confirm) | StoryBuilder | default | `bg-blue-600 text-white` |
| Step actif | StoryBuilder | `bg-amber-500` | `bg-blue-600` |
| Steps passes | StoryBuilder | `bg-amber-500/20` | `bg-blue-600/20` |
| Visuel | SegmentEditor | outline gris | `bg-blue-600 text-white` |
| Narration | SegmentEditor | outline gris | `bg-blue-600 text-white` |
| Generer IA | SegmentEditor | outline violet | Inchange (action IA speciale) |
| Choix interactifs | ChoiceOverlay | couleurs dynamiques | Inchange |

## Details techniques

### Classe CSS standard pour tous les boutons payload
```text
bg-blue-600 hover:bg-blue-500 text-white font-semibold
```

### Fichiers modifies
- `src/features/conte-vivant/components/ConteVivantStudio.tsx`
- `src/features/conte-vivant/components/StoryBuilder.tsx`
- `src/features/conte-vivant/components/SegmentEditor.tsx`

