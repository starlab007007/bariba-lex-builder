
# Guide interactif IA — Bulles sur l'app réelle

## Concept
Un système de **bulles/tooltips animées** qui se superposent directement sur les vrais éléments de l'app (bouton menu ☰, onglets du fil, bouton +, barre du bas, etc.). Chaque étape met en surbrillance le vrai bouton avec une bulle explicative et une animation "pulsante" pour guider l'utilisateur visuellement. Conçu pour les utilisateurs qui ne savent pas lire : texte très court + emoji + audio TTS.

## Architecture

### 1. Système de "tour" — `AppTourProvider`
Fichier : `src/components/onboarding/AppTourProvider.tsx`

- Context React global qui gère : étape courante, visible/caché, langue
- Se déclenche au premier lancement (`localStorage: fitila_tour_done`)
- Expose `startTour()` / `skipTour()` / `nextStep()` / `prevStep()`

### 2. Composant `TourSpotlight`
Fichier : `src/components/onboarding/TourSpotlight.tsx`

- Overlay sombre semi-transparent sur toute l'app
- "Trou" lumineux découpé autour de l'élément ciblé (via `data-tour="step-id"` sur les éléments)
- Bulle flottante animée avec :
  - Emoji grand (pour la compréhension visuelle)
  - Texte court (1-2 lignes max, français simple)
  - Bouton ▶️ pour écouter l'explication (TTS français via `useFrenchTTS`)
  - Bouton "Suivant" / "Passer" avec icônes
- Animation pulse sur l'élément mis en surbrillance
- Le trou + bulle suivent la position réelle du DOM via `getBoundingClientRect()`

### 3. Étapes du tour (sur les vrais éléments de l'app)

| # | Cible (`data-tour`) | Emoji | Texte FR | Audio |
|---|---------------------|-------|----------|-------|
| 1 | `tour-menu` | ☰ 📋 | "Appuyez ici pour ouvrir le menu" | TTS |
| 2 | `tour-feed-indicator` | 🎬🏛️📢 | "Glissez à gauche ou droite pour changer de fil" | TTS |
| 3 | `tour-create-btn` | ➕🎙️ | "Appuyez ici pour créer un contenu" | TTS |
| 4 | `tour-tab-learn` | 📚 | "Apprenez le Bariba ici" | TTS |
| 5 | `tour-tab-dico` | 📖 | "Le dictionnaire Bariba-Français" | TTS |
| 6 | `tour-tab-translate` | 🌍 | "Traduisez entre Bariba et Français" | TTS |
| 7 | `tour-tab-ia` | 🤖 | "Fitila IA vous aide en Bariba" | TTS |

### 4. Section clavier Bariba (étapes supplémentaires)

| # | Type | Emoji | Texte |
|---|------|-------|-------|
| 8 | Plein écran | ⌨️ | "Activez le clavier Bariba pour taper ɔ ɛ ŋ" |
| 9 | Plein écran | ⚙️➡️ | "Paramètres → Langue → Activer Clavier Bariba" |
| 10 | Plein écran | 🌐 | "Appuyez longuement sur espace pour changer" |

### 5. Modifications des composants existants

**`TamTamSocial.tsx`** — Ajouter des attributs `data-tour` :
- `data-tour="tour-create-btn"` sur le bouton +
- `data-tour="tour-tab-learn"` / `tour-tab-dico` / etc. sur les onglets
- `data-tour="tour-feed-indicator"` sur l'indicateur de fil
- `data-tour="tour-menu"` sur le bouton hamburger

**`FitilaApp.tsx`** :
- Remplacer l'ancien `OnboardingGuide` par `AppTourProvider`
- Ajouter "Revoir le guide" dans le menu latéral

### 6. TTS intégré
- Utiliser `useFrenchTTS` existant pour la voix française
- Chaque bulle a un bouton 🔊 qui lit le texte de l'étape
- Option : basculer vers Bariba TTS si la langue est Bariba

## Fichiers

| Action | Fichier |
|--------|---------|
| Nouveau | `src/components/onboarding/AppTourProvider.tsx` |
| Nouveau | `src/components/onboarding/TourSpotlight.tsx` |
| Nouveau | `src/components/onboarding/tourSteps.ts` (définition des étapes) |
| Modifier | `src/pages/tamtam/TamTamSocial.tsx` (ajouter `data-tour` attrs) |
| Modifier | `src/pages/fitila/FitilaApp.tsx` (remplacer ancien guide par AppTour) |
| Supprimer | `src/components/onboarding/OnboardingGuide.tsx` (remplacé) |

## Détails techniques
- Positionnement des bulles : `getBoundingClientRect()` + `ResizeObserver` pour suivre les éléments
- Overlay avec `clip-path` ou SVG pour créer le "trou" lumineux
- `framer-motion` pour les animations de transition et le pulse
- `localStorage` pour persister l'état du tour
- Aucune dépendance externe supplémentaire
