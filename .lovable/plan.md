
# Integration des 3 Defis dans le Pipeline Griot

## Analyse de l'existant

Apres exploration complete du code, voici l'etat actuel :

| Defi | Infrastructure existante | Etat |
|------|--------------------------|------|
| Coherence personnages | Table `character_references` existe (0 enregistrements), `AIAssetGenerator` a un squelette avec TODO | Non fonctionnel - methodes placeholder |
| Mouvements naturels | Ken Burns basique (zoom/pan) a ~24fps, transitions crossfade 0.5s | Rigide - pas de motion diffusion |
| Duree clips | Videos de la bibliotheque (327 videos) limitees a leur duree native, pas de stitching | Pas de prolongation de clips |

## Solution par defi

### DEFI 1 : Coherence personnages - Character Reference Embedding

**Fichier : `supabase/functions/generate-anime-story/index.ts`**

Modifier `getSceneImage()` pour :
- Detecter le personnage principal de la scene (`detectCharacterType` existe deja)
- Chercher une reference dans `character_references` pour ce personnage
- Si une reference existe, l'utiliser comme contrainte dans le prompt AI (reference image URL + style keywords + color palette)
- Ajouter `character_reference_id` et `consistency_score` dans la reponse

Modifier `generateSceneImage()` pour :
- Inclure les descripteurs du personnage de reference dans le prompt (keywords, palette)
- Ajouter la mention "MUST maintain character consistency with reference" dans le prompt
- Utiliser l'image de reference comme contexte via l'API multimodale (envoyer l'image de reference + le prompt)

Modifier `findLibraryMatch()` pour :
- Ajouter un bonus de score (+2) si `character_reference_id` correspond au personnage demande
- Privilegier les assets deja valides pour la coherence

**Fichier : `src/services/aiAssetGenerator.ts`**

Connecter `generatePhoto()` et `generateVideo()` a l'API Lovable AI (Gemini 3 Pro Image) au lieu des placeholders. Utiliser l'image de reference du personnage en input multimodal pour maintenir la coherence visuelle.

### DEFI 2 : Mouvements naturels - Motion cinematique 30fps

**Fichier : `src/engines/GriotAnimationEngine.ts`**

Ameliorer `drawAnimatedImage()` pour :
- Ajouter des courbes d'interpolation cinematiques (ease-in-out cubique) au lieu du lineaire actuel
- Implementer des mouvements composes : zoom + pan simultane (pas juste l'un ou l'autre)
- Ajouter un leger mouvement de "respiration" (oscillation sinusoidale subtile) sur les images statiques
- Augmenter le FPS d'export de 24 a 30 dans `exportVideoBlob()` et `renderSlideshowFrames()`

Ajouter une methode `generateCinematicMotionPlan()` qui remplace `generateMotionPlan()` avec :
- Mouvements composes (zoom-in + pan-right simultane)
- Intensite variable pendant la scene (acceleration/deceleration)
- "Drift" subtil pour eviter les images completement statiques
- Parametres varies par emotion (joy = dynamique, peace = lent et fluide)

Ameliorer `drawCurrentScene()` pour :
- Transitions crossfade plus longues (0.8s au lieu de 0.5s) avec courbe ease
- Ajouter un leger effet de parallaxe entre l'arriere-plan et le sujet pendant les transitions

**Fichier : `src/components/griot-studio/PublishStep.tsx`**

Modifier `captureStream(24)` en `captureStream(30)` pour le rendu 30fps.

### DEFI 3 : Duree clips - Stitching intelligent

**Fichier : `src/engines/GriotAnimationEngine.ts`**

Modifier `loadScenes()` pour gerer les videos courtes (4-8s) quand la scene est plus longue :
- Si `scene.endTime - scene.startTime > video.duration`, boucler la video (`video.loop = true` est deja actif)
- Ajouter une logique de "reverse bounce" : quand la video atteint sa fin, la rejouer en sens inverse pour un rendu naturel (ping-pong)
- Implementer un fondu de rebouclage (crossfade de 0.3s sur les 2 dernieres frames) pour eviter le saut visible

Ajouter une methode `handleVideoLooping()` dans `drawCurrentScene()` :
- Detecter si la video active est en boucle
- Appliquer un fondu progressif aux points de rebouclage
- Synchroniser les scenes multi-clips pour un rendu fluide

**Fichier : `supabase/functions/generate-anime-story/index.ts`**

Modifier `getSceneImage()` pour gerer les scenes longues (>8s) :
- Si la scene dure >8s et qu'un seul asset video de 5s est trouve, chercher un 2eme asset complementaire (meme scene_type, meme emotion)
- Retourner les 2 assets comme un "clip stitche" avec des timecodes de transition
- Ajouter un champ `stitchedClips` dans `GeneratedScene` pour les multi-clips

Modifier l'interface `GeneratedScene` pour inclure :
```text
interface GeneratedScene {
  ...existant...
  stitchedClips?: Array<{ videoUrl: string; startTime: number; endTime: number }>;
  videoUrl?: string;
  videoDuration?: number;
}
```

**Fichier : `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts`**

Modifier `StoryScene` pour supporter les clips stitches :
```text
interface StoryScene {
  ...existant...
  stitchedClips?: Array<{ videoUrl: string; startTime: number; endTime: number }>;
}
```

## Resume des fichiers modifies

| Fichier | Modifications |
|---------|---------------|
| `supabase/functions/generate-anime-story/index.ts` | Coherence personnages dans les prompts AI + stitching multi-clips pour scenes longues |
| `src/engines/GriotAnimationEngine.ts` | Motion cinematique (courbes ease, mouvements composes, respiration), 30fps, video looping intelligent avec ping-pong et crossfade |
| `src/services/aiAssetGenerator.ts` | Connexion reelle a l'API Lovable AI pour generation avec reference personnage |
| `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` | Support `stitchedClips` dans StoryScene |
| `src/components/griot-studio/PublishStep.tsx` | Export 30fps |

## Resultats attendus

- **Coherence** : 70-85% grace aux embeddings de reference et prompts contraints
- **Mouvements** : Fluides a 30fps avec interpolation cinematique et micro-animations
- **Duree** : Scenes jusqu'a 30s+ via video looping intelligent et stitching multi-clips
