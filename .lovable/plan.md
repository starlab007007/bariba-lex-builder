
# Finalisation du module Dictionnaire

## Objectif
Rendre la page dictionnaire intuitive, responsive, scrollable, avec mode clavier par defaut, un formulaire "Proposer un mot" adapte a tous les ecrans, les soumissions sauvegardees en base de donnees, et un systeme de recompenses pour les contributeurs.

---

## Modifications prevues

### 1. Mode clavier par defaut

Dans `TamTamDictionary.tsx`, changer l'etat initial de `inputMode` de `'voice'` a `'keyboard'` :

```text
const [inputMode, setInputMode] = useState<InputMode>('keyboard');
```

Supprimer egalement l'annonce vocale automatique au chargement (le `useEffect` qui appelle `speakCurrentLang` au montage) pour ne pas deranger l'utilisateur qui arrive en mode clavier.

### 2. Rendre la page scrollable et responsive

**KuaishouLayout.tsx** : Le layout actuel utilise `min-h-screen` sans gestion du scroll interne. Modifier pour utiliser `h-[100dvh] flex flex-col` sur le conteneur principal et `flex-1 overflow-y-auto` sur le `<main>`.

**TamTamDictionary.tsx** : Ajouter `pb-8` au conteneur de contenu principal et s'assurer que le contenu (input, resultats, historique) est dans un conteneur scrollable avec des paddings adaptatifs (`px-3 sm:px-4`).

### 3. Ameliorer le modal "Proposer un mot"

**NewWordSubmission.tsx** : Rendre le modal bottom-sheet responsive :
- Utiliser `max-h-[85vh]` au lieu de `max-h-[90vh]` pour laisser de l'espace
- Ajouter `safe-area-inset` en bas du formulaire
- Rendre les champs plus compacts sur mobile avec `py-2.5` au lieu de `py-3`
- Le bouton "Proposer un mot" doit etre `w-full` pour occuper toute la largeur
- Ajouter une indication du nombre de mots deja proposes par l'utilisateur

### 4. Sauvegarder les mots proposes en base

Le hook `useVocalFeedback.ts` insere deja dans la table `word_submissions` -- cette partie fonctionne. Verifier que les politiques RLS permettent l'insertion par les utilisateurs authentifies.

### 5. Systeme de recompenses pour les contributeurs

**Nouvelle table** : `user_contributions` pour tracker les points

```text
CREATE TABLE public.user_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,  -- 'word_submission', 'feedback', 'word_approved'
  points INTEGER NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can read their own contributions
-- RLS: system can insert (via trigger)
```

**Trigger automatique** : Quand une ligne est inseree dans `word_submissions`, un trigger ajoute automatiquement des points dans `user_contributions` :
- Proposition de mot : +10 points
- Avec audio : +5 points bonus
- Avec exemple : +3 points bonus

**Affichage dans le dictionnaire** : Ajouter une section en haut de la page montrant le niveau du contributeur :
- 0-49 points : Debutant
- 50-199 points : Contributeur
- 200-499 points : Expert
- 500+ points : Maitre du dictionnaire

### 6. Afficher les contributions de l'utilisateur

Ajouter un petit badge/compteur dans le header de la page dictionnaire montrant les points et le niveau actuel de l'utilisateur. Cliquer dessus affiche un mini-resume de ses contributions.

---

## Details techniques

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/tamtam/TamTamDictionary.tsx` | Mode clavier par defaut, suppression annonce auto, ajout badge contributeur, responsive padding, scroll |
| `src/components/tamtam/KuaishouLayout.tsx` | `h-[100dvh] flex flex-col` + `flex-1 overflow-y-auto` sur main |
| `src/components/tamtam/NewWordSubmission.tsx` | Modal responsive, max-height ajuste, safe-area, bouton full-width, afficher compteur submissions |

### Fichiers crees

| Fichier | Description |
|---------|-------------|
| `src/hooks/useContributionPoints.ts` | Hook pour lire les points et le niveau de l'utilisateur depuis `user_contributions` |

### Migration SQL

Creation de la table `user_contributions` + trigger sur `word_submissions` pour attribuer des points automatiquement + politiques RLS.

### Scroll architecture

```text
KuaishouLayout (h-[100dvh], flex flex-col)
  +-- KuaishouHeader (flex-shrink-0)
  +-- main (flex-1, overflow-y-auto)
  |     +-- Toggles mode/direction
  |     +-- Zone input (vocal ou clavier)
  |     +-- Bouton "Proposer un mot"
  |     +-- Resultat selectionne
  |     +-- Historique
  |     +-- Badge contributeur
  +-- KuaishouBottomNav (flex-shrink-0)
```
