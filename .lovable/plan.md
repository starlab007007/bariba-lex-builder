

# Griot Digital v7 — Pipeline MovieFlow-Inspired

## Vue d'ensemble

Transformer le Griot Studio en un pipeline professionnel inspiré de MovieFlow, avec un parcours en 5 etapes claires :

**Enregistrer la voix → Transcrire en texte → Editer le script en scenes → Matcher les illustrations → Previsualiser et publier**

Le changement majeur : l'audio est d'abord **transcrit en texte**, l'utilisateur peut **editer le script scene par scene**, puis chaque scene est **matchee intelligemment** avec les images/videos de la bibliotheque existante.

---

## Architecture du nouveau pipeline

```text
ETAPE 1: ENREGISTREMENT          ETAPE 2: TRANSCRIPTION
+-------------------+           +---------------------+
| VinylRecorder     |  -------> | ElevenLabs STT      |
| (audio capture)   |           | (batch transcribe)  |
+-------------------+           +---------------------+
                                         |
                                         v
ETAPE 3: EDITEUR DE SCRIPT      ETAPE 4: GENERATION
+-------------------+           +---------------------+
| SceneEditor       |  -------> | Smart Scene Matcher  |
| (phrase = scene)  |           | (library + fallback) |
| + emotion picker  |           | + transitions        |
+-------------------+           +---------------------+
                                         |
                                         v
                                ETAPE 5: PREVIEW + PUBLISH
                                +---------------------+
                                | StoryPreviewPlayer   |
                                | + PublishStep         |
                                +---------------------+
```

---

## Changements detailles

### 1. Nouvelle Edge Function : `transcribe-audio`

**Fichier** : `supabase/functions/transcribe-audio/index.ts`

- Recoit l'audio blob enregistre par le VinylRecorder
- Utilise l'API ElevenLabs STT (batch, modele `scribe_v2`) avec la cle `ELEVENLABS_API_KEY` deja configuree
- Retourne le texte transcrit + timestamps par mot
- Langue : francais (`fra`) avec auto-detection en fallback
- Fallback : si ElevenLabs echoue, utiliser Lovable AI (Gemini Flash) pour une transcription approximative depuis une description

### 2. Nouveau composant : `SceneEditor`

**Fichier** : `src/components/griot-studio/SceneEditor.tsx`

Un editeur de script interactif ou chaque phrase devient une scene :

- Affiche le texte transcrit, decoupee automatiquement en scenes (1 phrase = 1 scene)
- Chaque scene est une carte editable avec :
  - Le texte de la scene (modifiable)
  - Un selecteur d'emotion (joie, tristesse, mystere, action, sagesse, etc.)
  - Un apercu miniature de l'image matchee
  - Drag-and-drop pour reorganiser les scenes
- Boutons : ajouter une scene, supprimer une scene, fusionner deux scenes
- Interface tactile optimisee (gros boutons, swipe)

### 3. Modification du `useAnimeStoryGenerator`

**Fichier** : `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts`

Ajouter une nouvelle methode `generateFromScenes` qui :

- Recoit un tableau de scenes editees (texte + emotion + type)
- Pour chaque scene, appelle le matching intelligent de la bibliotheque `anime_scene_library` :
  - Score >= 5 : utilise l'image de la bibliotheque
  - Score < 5 : genere via IA en temps reel (fallback)
- Calcule automatiquement la duree par scene en fonction du nombre de mots
- Genere les transitions entre scenes (fondu, glissement, etc.)

### 4. Mise a jour du workflow principal `GriotStudio.tsx`

**Fichier** : `src/components/griot-studio/GriotStudio.tsx`

Nouveau flux d'etapes :

```text
'create' → 'transcribing' → 'editing' → 'generating' → 'preview' → 'finalize' → 'success'
```

- **create** : Enregistrement audio (VinylRecorder) + style + duree (inchange)
- **transcribing** (NOUVEAU) : Animation d'ecoute avec message "Ecoute de ton conte..." + appel a `transcribe-audio`
- **editing** (NOUVEAU) : Affichage du `SceneEditor` avec le script decoupage. L'utilisateur peut modifier, reorganiser, changer les emotions
- **generating** : Matching des illustrations (optimise, plus rapide car les scenes sont deja definies)
- **preview** : Previsualisation (inchange)
- **finalize** : Publication (inchange)

### 5. Smart Scene Matcher (amelioration)

**Fichier** : `supabase/functions/generate-anime-story/index.ts`

Modifier pour accepter un nouveau mode `pre_segmented: true` :

- Quand les scenes sont pre-decoupees par l'editeur, skip la segmentation IA
- Utiliser directement les emotions et types de scene fournis pour le matching
- Resultat : matching plus precis (les emotions sont choisies par l'utilisateur) et plus rapide (pas de segmentation)

### 6. Mise a jour du `handleRecordingComplete`

**Fichier** : `src/components/griot-studio/GriotStudio.tsx`

Au lieu de lancer directement la generation apres l'enregistrement :

1. Uploader l'audio vers le bucket `tamtam-audio`
2. Appeler `transcribe-audio` pour obtenir le texte
3. Decouper le texte en phrases (scenes)
4. Passer a l'etape `editing` avec le script pre-rempli
5. L'utilisateur valide/edite puis lance la generation

---

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/transcribe-audio/index.ts` | Edge Function de transcription via ElevenLabs STT |
| `src/components/griot-studio/SceneEditor.tsx` | Editeur de script scene par scene |

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/GriotStudio.tsx` | Nouveaux steps transcribing + editing, nouveau flux |
| `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` | Methode `generateFromScenes` pour scenes pre-editees |
| `supabase/functions/generate-anime-story/index.ts` | Mode `pre_segmented` pour skip la segmentation IA |

---

## Experience utilisateur finale

1. **Parler** : L'utilisateur enregistre son conte via le disque vinyle anime
2. **Transcrire** : Animation d'ecoute, le texte apparait progressivement
3. **Editer** : Le script est presente scene par scene, l'utilisateur peut modifier le texte, choisir les emotions, reorganiser
4. **Illustrer** : Les images sont matchees intelligemment depuis la bibliotheque (ultra-rapide)
5. **Previsualiser** : Diaporama anime avec effets Ken Burns synchronise sur l'audio
6. **Publier** : Export et publication dans le feed

Ce pipeline garantit un controle creatif total tout en restant simple et rapide, exactement comme MovieFlow.

