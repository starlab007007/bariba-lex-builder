

## Plan: Auto-illustration intelligente des scenes dans Conte Vivant

### Probleme actuel
Les illustrations des scenes dans le Conte Vivant sont choisies manuellement par l'utilisateur depuis la galerie, sans analyse du contenu textuel. Les images restent statiques et ne correspondent pas au sens des scenes.

### Solution
Ajouter un systeme d'auto-illustration qui analyse le texte de chaque segment et trouve l'asset (video ou photo) le plus similaire dans la bibliotheque anime, en prioritisant les videos.

### Architecture

Le edge function `generate-anime-story` possede deja toute la logique de matching semantique (detection scene/personnage/action/emotion, similarite textuelle avec description_fr/description_en). On va la reutiliser directement.

### Etapes d'implementation

**1. Ajouter un bouton "Auto-illustrer" dans StoryBuilder**
- Ajouter un bouton `✨ Auto-illustrer les scenes` dans la barre d'outils du StoryBuilder
- Au clic, il collecte tous les segments (intro + branches + sub-branches) avec leur `text_content`

**2. Creer une fonction client `autoIllustrateSegments`** dans StoryBuilder
- Pour chaque segment ayant du `text_content` et pas encore de `media_url` :
  - Requeter `anime_scene_library` avec les 50 meilleurs candidats du meme style
  - Scorer chaque asset en analysant le texte du segment contre les metadonnees (emotion, scene_type, character_type, action, description_fr, description_en) en utilisant la meme logique de normalisation et matching de mots/racines que `findLibraryMatch`
  - **Bonus +3 pour les videos** afin de les prioriser sur les photos
  - Assigner automatiquement le meilleur match (media_url, mediaType) au segment

**3. Modifier `SegmentEditor`**
- Ajouter un petit bouton `✨` individuel par segment pour auto-illustrer un seul segment
- Quand l'auto-illustration trouve un match, mettre a jour le segment avec `media_url` et `mediaType`

**4. Logique de scoring (client-side)**
```text
Score = base(3) 
  + emotion_match(2) 
  + scene_type_match(2) 
  + character_type_match(1) 
  + action_match(1)
  + text_similarity(0-4)
  + video_bonus(3 si asset_type='video')
Seuil minimum: 5
```

### Fichiers modifies
- `src/features/conte-vivant/components/StoryBuilder.tsx` : bouton auto-illustrer global + logique
- `src/features/conte-vivant/components/SegmentEditor.tsx` : bouton auto-illustrer par segment
- `src/features/conte-vivant/utils/autoIllustrate.ts` (nouveau) : logique de matching semantique client-side reutilisant les memes keywords/scoring que l'edge function

### Detail technique : `autoIllustrate.ts`
- Reprend les dictionnaires SCENE_KEYWORDS, CHARACTER_KEYWORDS, ACTION_KEYWORDS, EMOTION depuis l'edge function
- Fonction `findBestMatch(text, style)` qui :
  1. Detecte scene_type, character_type, action, emotion du texte
  2. Requete anime_scene_library (50 candidats, tries par usage_count asc)
  3. Score chaque candidat avec bonus video (+3)
  4. Retourne le meilleur match au-dessus du seuil

