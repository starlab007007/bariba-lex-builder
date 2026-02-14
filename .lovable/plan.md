
# Refonte du module "Apprendre" - Plateforme bidirectionnelle Bariba / Francais

## Objectif
Transformer le module FitilaLearn en une plateforme d'apprentissage bidirectionnelle gamifiee : les francophones apprennent le bariba, les locuteurs bariba apprennent le francais. L'interface, les exercices et les explications s'adaptent selon la langue maternelle choisie.

## Vue d'ensemble

Le module se compose de 4 ecrans principaux :
1. **Selection de langue** (premier lancement) - Choix "Je parle Francais" ou "N nee Bariba"
2. **Dashboard** - Profil, XP, progression, badges, themes d'apprentissage
3. **Lecon** - Exercices QCM bidirectionnels avec explications adaptees
4. **Fin de lecon** - Score, XP gagnes, badges debloques

## Donnees utilisees

Les fichiers joints seront copies dans le projet et utilises comme sources de donnees :
- **idiomes.json** (69 expressions) - Exercices contextuels par categorie
- **system_structure.json** - Configuration gamification (niveaux, badges, themes, defis)
- **bariba_learning_module.jsx** - Exercices de traduction par theme
- Le dictionnaire existant (`public/dictionnaire_ameliore.json`) sera egalement exploite pour enrichir le vocabulaire

## Architecture technique

### Fichiers a creer

1. **`public/data/learning_idiomes.json`** - Copie de idiomes.json
2. **`public/data/learning_system.json`** - Copie de system_structure.json  
3. **`src/data/learningExercises.ts`** - Exercices extraits de bariba_learning_module.jsx + exercices bidirectionnels supplementaires
4. **`src/data/learningConfig.ts`** - Configuration LANGUAGE_CONFIG (textes UI bilingues), LEVELS, BADGES
5. **`src/hooks/useLearningProgress.ts`** - Hook pour gerer XP, niveaux, badges, streak via localStorage
6. **`src/pages/fitila/FitilaLearn.tsx`** - Refonte complete avec les 4 vues

### Fichier a modifier

- **`src/pages/fitila/FitilaLearn.tsx`** - Remplacement complet du contenu actuel

## Structure detaillee

### 1. Configuration bilingue (`learningConfig.ts`)

Contient :
- `LANGUAGE_CONFIG` avec deux cles (`french`, `bariba`), chacune definissant tous les textes UI (dashboard, lecons, score, XP, boutons, felicitations, etc.)
- `LEVELS` : 8 niveaux avec noms en francais et bariba (Debutant/Tentemaa, Apprenti/Kaakumaa, etc.), XP requis, icone, couleur
- `BADGES` : 8 badges bilingues (Premier Pas/Gbunaaari tentemaa, Regularite, Rapide, Centurion, Parfait, Social, Expert culturel, Polyglotte)

### 2. Exercices bidirectionnels (`learningExercises.ts`)

10 themes extraits des fichiers fournis :
- Salutations (avec les idiomes IDM_SAL_001 a IDM_SAL_015)
- Famille (avec IDM_SOC_066 a IDM_SOC_069 + vocabulaire)
- Nourriture, Sante, Commerce, Transport, Temps, Travail, Emotions, Proverbes

Chaque exercice a :
- `french` : le mot/phrase en francais
- `bariba` : la traduction bariba (reponse correcte)
- `options` : 4 choix

En mode FR vers Bariba : question en francais, reponses en bariba
En mode Bariba vers FR : question en bariba, reponses en francais

### 3. Hook de progression (`useLearningProgress.ts`)

Stockage localStorage :
- Langue choisie (`userLanguage`)
- XP total, niveau calcule
- Streak (jours consecutifs)
- Lecons completees, mots maitrises, scores parfaits
- Badges debloques
- Derniere visite (pour calcul du streak)

Fonctions :
- `addXP(amount)` - Ajouter XP + detecter level-up
- `completeLesson(themeId, score, total)` - Enregistrer fin de lecon
- `checkBadges()` - Verifier et debloquer badges
- `shareProgress()` - Generer message de partage bilingue
- `selectLanguage(lang)` / `changeLanguage(lang)`

### 4. Page principale refaite (`FitilaLearn.tsx`)

**Vue Selection de Langue** (si pas de langue sauvegardee) :
- 2 gros boutons : "Je parle Francais" (bleu) et "N nee Bariba" (vert)
- Chaque bouton liste ce que l'apprenant va decouvrir
- Sauvegarde dans localStorage

**Vue Dashboard** :
- Header avec bouton retour + toggle de langue (petit bouton en haut a droite)
- Carte profil : avatar emoji du niveau, nom, niveau bilingue, streak
- Barre de progression XP vers le niveau suivant
- 4 cartes stats (Lecons, Mots, Parfaits, Badges)
- Section badges debloques
- Grille de themes (10 themes) avec icone, nom bilingue, nombre de lecons, XP par lecon
- Bouton "Commencer" sur chaque theme

**Vue Lecon** :
- Barre de progression (question X/Y)
- Score en cours
- Indicateur de direction (Francais --> Bariba ou Bariba --> Francais)
- Question adaptee selon la direction :
  - FR vers BA : "Traduisez en Bariba :" + mot francais + 4 options bariba
  - BA vers FR : "Debu Fasei soo :" + mot bariba + 4 options francais
- Feedback visuel (vert = correct, rouge = incorrect)
- Bouton "Question suivante" / "Terminer"

**Vue Fin de Lecon** :
- Animation de felicitations
- Score final (X/Y)
- XP gagnes (+bonus si parfait)
- Nouveaux badges eventuels
- Boutons "Recommencer" et "Retour au tableau de bord"
- Bouton Partager (Web Share API)

## Design

Le module respecte le design system FITILA :
- Fond sombre `#08080c`
- Orange `#FF5722` pour les elements primaires
- Glassmorphism (bg-white/5, bg-white/10)
- Coins arrondis (rounded-2xl)
- Cibles tactiles 44px minimum
- Animations framer-motion (transitions entre vues)
- Layout `h-[100dvh]` avec scroll sur le contenu

## Audio

Conformement a la politique linguistique, l'audio TTS (speechSynthesis) est disponible uniquement pour les mots/phrases en francais. Les mots bariba n'ont pas de synthese vocale. Un bouton audio apparait a cote des mots francais dans les exercices.
