
# Conte Vivant -- Storytelling Interactif a Embranchements

## Resume

Le document decrit un systeme de storytelling interactif ou le spectateur choisit la direction de l'histoire toutes les 15 secondes, avec 2-3 options par embranchement. Actuellement, le bouton "Conte Live" dans l'interface camera ouvre simplement le GriotStudio existant (meme fonctionnement que Griot). L'objectif est de transformer "Conte Live" en un veritable systeme de contes a embranchements.

## Etat actuel vs Cible

**Ce qui existe deja** :
- Bouton "Conte Live" dans l'interface camera (ouvre GriotStudio)
- GriotStudio : enregistrement audio, transcription, generation de scenes, export video
- K-Engine / GriotAnimationEngine pour le rendu video
- Asset Library pour le matching d'images
- Feed video TikTok-style (table `videos`)
- Supabase Realtime (peut remplacer Redis/WebSocket)

**Ce qui doit etre construit** :
- Story Graph Engine (graphe DAG pour les embranchements)
- Story Builder UI (editeur pour creer les branches)
- Branching Player (lecteur avec pre-cache multi-segments)
- Choice UI (overlay de choix + timer 5s)
- Mode Communaute (vote en temps reel via Supabase Realtime)
- Systeme de badges par chemin
- Tables base de donnees (contes, segments, progression, votes)

## Plan d'implementation -- Phase 1 MVP

On suit l'approche Phase 1 du document : mode solo, 2 niveaux, 2 choix par noeud.

### Etape 1 : Base de donnees

Creer 3 tables :

```text
conte_vivant_stories
  - id (UUID PK)
  - creator_id (UUID)
  - title (VARCHAR)
  - description (TEXT)
  - languages (TEXT[])
  - graph (JSONB) -- le DAG complet (segments, choix, liens)
  - status (published/draft)
  - total_segments (INT)
  - total_endings (INT)
  - thumbnail_url (TEXT)
  - created_at, published_at (TIMESTAMPTZ)

conte_vivant_progress
  - id (UUID PK)
  - user_id (UUID)
  - story_id (UUID FK)
  - path_taken (TEXT[])
  - choices (JSONB)
  - endings_unlocked (TEXT[])
  - completed_at (TIMESTAMPTZ)
  - replay_count (INT DEFAULT 0)
  - UNIQUE(user_id, story_id)

conte_vivant_votes
  - id (UUID PK)
  - session_id (UUID)
  - story_id (UUID FK)
  - segment_id (TEXT)
  - results (JSONB)
  - winner (VARCHAR)
  - voter_count (INT)
  - resolved_at (TIMESTAMPTZ)
```

RLS : lecture publique pour les contes publies, ecriture reservee au createur. Progression liee a l'utilisateur authentifie.

### Etape 2 : Types et modele de donnees

Creer `src/features/conte-vivant/types/story.types.ts` :
- `StoryGraph` : structure JSONB du DAG (entry_segment, segments map)
- `StorySegment` : video_url, duration, is_choice_point, choices[], is_ending, ending_badge
- `StoryChoice` : id, label, icon, next_segment, is_default
- `ConteVivantStory` : metadonnees + graph

### Etape 3 : Story Builder UI (simplifie)

Creer `src/features/conte-vivant/components/StoryBuilder.tsx` :
- Interface formulaire (pas de graphe visuel pour le MVP)
- Etape 1 : Ecrire/enregistrer le segment d'intro
- Etape 2 : Definir 2 choix avec labels + icones
- Etape 3 : Pour chaque branche, ecrire/enregistrer le segment suivant
- Etape 4 : Definir les fins ou ajouter un niveau supplementaire
- Reutilise le VinylRecorder existant pour l'enregistrement audio
- Reutilise l'AssetGallery pour la selection d'images par segment
- Chaque segment = audio + visuels, rendu par le GriotAnimationEngine existant

### Etape 4 : Branching Player

Creer `src/features/conte-vivant/components/BranchingPlayer.tsx` :
- Lecteur video qui charge et joue les segments un par un
- Pre-cache : pendant la lecture du segment actuel, telecharge les 2-3 segments suivants possibles en parallele
- Quand le segment approche de la fin (5s avant), affiche le ChoiceOverlay
- A la selection d'un choix, transition fluide (crossfade 300ms) vers le segment suivant
- Timeout 5s : si aucun choix, selectionne le choix par defaut

### Etape 5 : Choice Overlay UI

Creer `src/features/conte-vivant/components/ChoiceOverlay.tsx` :
- 2-3 boutons animes avec icone + texte court
- Barre de progression (timer 5 secondes)
- Animation d'entree (slide-up + scale)
- Feedback haptic au choix
- Mode solo : clic direct
- Mode communaute (Phase 2) : barre de vote en temps reel

### Etape 6 : Ending Card

Creer `src/features/conte-vivant/components/EndingCard.tsx` :
- Ecran de fin avec badge debloque (ex: "Tu es un Guerrier!")
- Affiche "Fin X/N -- Explore les autres chemins!"
- Boutons : Rejouer / Partager / Retour au feed

### Etape 7 : Hooks de navigation

Creer `src/features/conte-vivant/hooks/useStoryGraph.ts` :
- Charge le graphe depuis la BDD
- Methodes : `getSegment(id)`, `getChoices(segmentId)`, `resolve(choiceId)`, `getDefault(segmentId)`
- Track le chemin parcouru (path_taken)

Creer `src/features/conte-vivant/hooks/useBranchPreload.ts` :
- Pre-charge les segments suivants en parallele
- Qualite adaptative selon le reseau (navigator.connection)
- Libere les segments non-choisis du cache

Creer `src/features/conte-vivant/hooks/useChoiceTimer.ts` :
- Timer de 5 secondes avec callback timeout
- Retourne le temps restant pour l'affichage de la barre

### Etape 8 : Integration dans le bouton "Conte Live"

Modifier `FullscreenCreator.tsx` :
- Le bouton "Conte Live" ouvre desormais le nouveau `ConteVivantStudio` au lieu du `GriotStudio`
- Le studio guide le createur a travers le Story Builder

### Etape 9 : Integration Feed

Modifier le feed pour afficher les contes vivants avec :
- Badge "INTERACTIF" dore
- Miniature avec legere animation pulse
- Au clic, ouvre le BranchingPlayer au lieu du player video standard

### Etape 10 : Service API

Creer `src/features/conte-vivant/services/storyGraphApi.ts` :
- CRUD complet des contes vivants via Supabase
- Sauvegarde/chargement de la progression utilisateur
- Publication (upload segments + enregistrement graphe)

## Structure de fichiers

```text
src/features/conte-vivant/
  components/
    ConteVivantStudio.tsx     -- Studio principal (orchestrateur)
    StoryBuilder.tsx           -- Editeur de conte branche
    SegmentEditor.tsx          -- Edition d'un segment (audio + visuels)
    BranchingPlayer.tsx        -- Player interactif
    ChoiceOverlay.tsx          -- UI des choix + timer
    EndingCard.tsx             -- Ecran de fin + badge
    StoryTreePreview.tsx       -- Visualisation de l'arbre
  hooks/
    useStoryGraph.ts           -- Navigation DAG
    useBranchPreload.ts        -- Pre-cache adaptatif
    useChoiceTimer.ts          -- Timer 5 secondes
    useConteVivantCRUD.ts      -- Operations BDD
  services/
    storyGraphApi.ts           -- API CRUD
  types/
    story.types.ts             -- Types TypeScript
```

## Adaptations a l'environnement Lovable

Le document mentionne des technologies non disponibles dans Lovable (Redis, ClickHouse, Socket.io). Voici les adaptations :

| Document | Implementation Lovable |
|---|---|
| Redis Pub/Sub pour votes | Supabase Realtime (postgres_changes) |
| Socket.io WebSocket | Supabase Realtime channels |
| ClickHouse analytics | Table PostgreSQL + requetes simples |
| Cloudflare R2 CDN | Supabase Storage (bucket existant) |
| React Flow (editeur graphe) | Formulaire etape par etape (MVP) |
| HLS streaming adaptatif | Lecture MP4 directe avec pre-cache fetch() |

## Ce qui est hors scope Phase 1

- Mode Communaute (vote en temps reel) → Phase 3
- Story Builder visuel drag-and-drop (React Flow) → Phase 2
- Analytics avancees / heatmap decisions → Phase 4
- Support offline / pre-download complet → Phase 4
- Adaptive bitrate HLS → utilisation MP4 direct

## Fichiers modifies

1. `src/components/tamtam/FullscreenCreator.tsx` -- pointer Conte Live vers le nouveau studio
2. `src/pages/tamtam/TamTamSocial.tsx` -- badge interactif dans le feed
3. Nouveaux fichiers dans `src/features/conte-vivant/` (10+ fichiers)
4. Migration SQL pour les 3 tables + RLS
