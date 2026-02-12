

# Plan : Emoji Picker pour les fins + Texte noir + Verification du flux

## Probleme identifie

Dans l'etape "Branches" du StoryBuilder, quand "C'est une fin" est coche, les deux champs actuels sont :
1. Un champ texte libre pour le badge emoji -- difficile a utiliser, l'utilisateur doit connaitre les emojis
2. Un champ titre avec texte blanc sur fond sombre -- peu lisible selon la demande

## Changements prevus

### 1. `src/features/conte-vivant/components/SegmentEditor.tsx`

**Remplacer le champ texte `ending_badge` par un selecteur d'emojis :**

- Remplacer l'Input libre par un bouton qui affiche l'emoji selectionne (ou un placeholder)
- Au clic, ouvrir un Popover contenant une grille d'emojis predefinies :
  - `👍` Like / `👎` Dislike / `❤️` Amour / `💔` Triste
  - `⚔️` Combat / `🏆` Victoire / `💀` Defaite / `🌟` Etoile
  - `🎭` Theatre / `🔥` Feu / `😂` Rire / `😢` Pleure
  - `🦁` Lion / `🐉` Dragon / `👑` Roi / `🌍` Monde
- Cliquer sur un emoji le selectionne et ferme le popover
- L'emoji selectionne est affiche dans le bouton

**Champ titre de la fin en texte noir :**

- Ajouter les classes `bg-white text-black placeholder:text-gray-400` au champ `ending_title` pour garantir la lisibilite sur fond sombre

### 2. Verification du flux complet (analyse)

Le flux actuel du conte vivant est le suivant :

| Etape | Composant | Etat |
|-------|-----------|------|
| Introduction (30s) | SegmentEditor avec VinylRecorder | OK - transcription auto Mistral |
| Choix | Emoji + label par choix | OK |
| Branches (30s chacune) | SegmentEditor avec narration + visuel | OK - transcription auto |
| Fins | Badge emoji + titre | A ameliorer (emoji picker) |
| Apercu | StoryTreePreview + BranchingPlayer | OK - graphe DAG |
| Publication | buildGraph + collectBlobs + onPublish | OK - upload blobs |
| Lecture | BranchingPlayer avec narration + musique | OK - Ken Burns + choix |

Le flux de bout en bout est fonctionnel : les narrations enregistrees sont uploadees via `storyAssetUploader`, le graphe est construit correctement avec `buildGraph()`, et le `BranchingPlayer` lit les segments avec les audios et visuels associes.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/features/conte-vivant/components/SegmentEditor.tsx` | Emoji picker Popover + texte noir pour le titre de fin |

