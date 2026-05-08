
# Guide interactif d'onboarding Fitila

## Objectif
Créer un guide d'onboarding en plein écran, interactif et illustré qui s'affiche automatiquement au premier lancement. Deux sections : découverte de l'app + activation du clavier Bariba. Possibilité de sauter à tout moment.

## Ce qui existe déjà
- `BaribaKeyboardActivationGuide.tsx` — guide statique pour le clavier (sera enrichi/remplacé)
- Aucun système d'onboarding existant

## Architecture

### 1. Composant `OnboardingGuide` (nouveau)
Fichier : `src/components/onboarding/OnboardingGuide.tsx`

- Fullscreen overlay avec slides swipables (framer-motion)
- Indicateur de progression (dots)
- Boutons "Suivant" / "Passer" toujours visibles
- Sauvegarde dans `localStorage` (`fitila_onboarding_done`)
- 6-8 slides au total, répartis en 2 sections

### 2. Slides Section A — Découverte de l'app (4 slides)
Chaque slide : illustration générée + titre + courte description

| Slide | Titre | Contenu |
|-------|-------|---------|
| 1 | Bienvenue sur Fitila 🔥 | Logo, message de bienvenue, "La première app 100% Bariba" |
| 2 | Votre fil social | Publiez, partagez, discutez en Bariba avec TamTam |
| 3 | Outils de langue | Dictionnaire, traducteur, cours d'apprentissage |
| 4 | Créez du contenu | Studio Griot, radio, IA pour le Bariba |

### 3. Slides Section B — Clavier Bariba (3-4 slides)
| Slide | Titre | Contenu |
|-------|-------|---------|
| 5 | Le clavier Bariba ⌨️ | Présentation : touches ɔ ɛ ŋ ã ĩ ũ exclusives |
| 6 | Activation étape 1 | Illustration : Paramètres → Langue et saisie → Activer |
| 7 | Activation étape 2 | Illustration : Changer de clavier (barre d'espace longue / 🌐) |
| 8 | Prêt ! | Confirmation + bouton "Commencer" |

### 4. Illustrations
- 8 images générées via l'outil `generate_image` avec style africain moderne
- Stockées dans `src/assets/onboarding/`
- Style cohérent : couleurs chaudes (orange #FF5722, fond sombre), personnages stylisés africains

### 5. Intégration dans l'app
- Dans `FitilaApp.tsx` → `AppContent` : afficher `OnboardingGuide` si `localStorage` n'a pas le flag
- Un bouton "Revoir le guide" dans le menu latéral (Settings)

### 6. Composant `OnboardingSlide` (réutilisable)
Fichier : `src/components/onboarding/OnboardingSlide.tsx`
- Props : `image`, `title`, `description`, `highlight`
- Layout : image en haut (60%), texte en bas (40%)

## Fichiers modifiés
- `src/pages/fitila/FitilaApp.tsx` — import et affichage conditionnel du guide
- Nouveau : `src/components/onboarding/OnboardingGuide.tsx`
- Nouveau : `src/components/onboarding/OnboardingSlide.tsx`
- 8 images dans `src/assets/onboarding/`

## Détails techniques
- Geste swipe via framer-motion `drag="x"` + `onDragEnd`
- Transition entre slides : fade + slide horizontal
- Bouton "Passer" en haut à droite, toujours accessible
- Responsive : max-w-md centré, fonctionne sur mobile et tablette
- Aucune dépendance supplémentaire requise
