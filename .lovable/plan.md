
# Simplification du Studio Griot + Galerie d'Assets Pre-generes

## Vue d'ensemble

Supprimer les menus de style (Manga/Chibi/Fantasy/Conte Africain) et de duree visibles sur l'ecran de creation. Le style "african" sera utilise par defaut en arriere-plan. A la place de ces menus, ajouter sous l'enregistreur audio une **galerie de selection d'assets** (photos et videos pre-generes de la bibliotheque `anime_scene_library`) que l'utilisateur peut parcourir, selectionner et utiliser pour le montage final de son conte.

---

## Ce qui va changer

### 1. Suppressions dans `GriotStudio.tsx` (etape "create")

**Supprimer** :
- Le composant `AnimeStyleSelector` (le menu 4 styles en capture jointe)
- Le selecteur de duree (15s/30s/60s)
- Forcer `style = 'african'` en dur (valeur par defaut, jamais affichee)
- La duree sera calculee automatiquement en fonction de la longueur de l'enregistrement audio

L'import de `AnimeStyleSelector` sera retire. Le state `style` gardera sa valeur initiale `'african'` sans UI pour le changer.

### 2. Nouveau composant : `AssetGallery.tsx`

Un composant galerie place **sous le VinylRecorder** qui affiche les images pre-generees de la bibliotheque `anime_scene_library` avec :

**Categories de navigation** (inspirees de Kuaishou/TikTok) :
- Tous (toutes les images)
- Village (scene_type: village)
- Foret (scene_type: forest)
- Montagne (scene_type: mountain)
- Riviere (scene_type: river)
- Marche (scene_type: market)
- Nuit (scene_type: night)
- Voyage (scene_type: journey)
- Maison (scene_type: home)
- Rassemblement (scene_type: gathering)
- Esprits (scene_type: spirit)

**Sous-filtres par personnage** :
- Ancien/Sage (elder)
- Garcon (child_boy)
- Fille (child_girl)
- Groupe (group)
- Animal (animal)
- Esprit (spirit)

**Interface** :
- Barre de categories horizontale scrollable (pills/chips style TikTok)
- Grille 3 colonnes de miniatures (aspect ratio 9:16)
- Tap pour selectionner/deselectionner une image
- Badge compteur des images selectionnees
- Les images selectionnees seront utilisees pour le montage video a la place du matching automatique

**Donnees** : Requete directe sur la table `anime_scene_library` (54 images disponibles, toutes avec `image_url` publique)

### 3. Modifications dans `GriotStudio.tsx`

**Nouveau state** :
- `selectedAssets`: tableau d'images selectionnees depuis la galerie
- Suppression du state `style` expose a l'utilisateur (garde en interne = `'african'`)

**Nouveau flux** :
```text
AVANT:
VinylRecorder → AnimeStyleSelector → DureeSelector → (enregistrer)

APRES:
VinylRecorder → AssetGallery (photos/videos pre-generes) → (enregistrer)
```

La duree sera determinee automatiquement :
- Si audio < 20s : duree = 15
- Si audio 20-45s : duree = 30
- Si audio > 45s : duree = 60

### 4. Integration des assets selectionnes dans le pipeline

Quand l'utilisateur a selectionne des assets ET enregistre sa voix :

**Option A** (assets selectionnes) : Les images choisies par l'utilisateur sont utilisees directement pour le montage, reparties uniformement sur la duree de l'audio. Le matching IA est saute.

**Option B** (aucune selection) : Le comportement actuel est preserve - le matching intelligent avec la bibliotheque est utilise apres transcription et edition des scenes.

Modification dans `useAnimeStoryGenerator.ts` : ajouter une methode `generateFromSelectedAssets(assets, audioDuration)` qui :
- Prend les images selectionnees
- Les repartit equitablement sur la duree totale
- Cree des objets `StoryScene` avec les metadonnees existantes (emotion, scene_type)
- Skip completement l'appel a l'Edge Function (pas de matching necessaire)

### 5. Modification du flux apres enregistrement

Si des assets sont pre-selectionnes :
```text
Enregistrer → Transcription → Edition scenes (avec previews des assets choisis) → Preview → Publish
```

Si aucun asset selectionne :
```text
Enregistrer → Transcription → Edition scenes → Matching auto (comportement actuel) → Preview → Publish
```

---

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/components/griot-studio/AssetGallery.tsx` | Galerie de photos/videos pre-generees avec filtres par categorie et personnage |

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/GriotStudio.tsx` | Supprimer AnimeStyleSelector + DureeSelector, ajouter AssetGallery, forcer style='african', auto-calculer duree, gerer selectedAssets |
| `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` | Ajouter methode `generateFromSelectedAssets` pour montage direct |

## Donnees disponibles dans la bibliotheque

La table `anime_scene_library` contient **54 images** reparties comme suit :

**Par lieu** : village (10), foret (9), montagne (5), riviere (5), marche (5), nuit (4), journey (4), home (4), gathering (4), spirit (1)

**Par personnage** : elder (16), child_boy (14), child_girl (12), group (5), animal (1), spirit (2)

**Par emotion** : joy (29), sadness (11), wonder (2), peace (2), excitement (2), fear (1), tension (1)

Toutes les images sont hebergees sur le bucket public `anime-library` avec des URLs directement accessibles.

---

## Details techniques de l'AssetGallery

### Chargement des donnees
- Requete `supabase.from('anime_scene_library').select('*').eq('style', 'african')` au montage
- Cache avec `useQuery` (staleTime: 5min)
- Affichage d'un skeleton loader pendant le chargement

### Interface utilisateur
- Header avec titre "Choisis tes illustrations" et compteur de selection
- Barre de categories horizontale (scrollable, style chips TikTok)
- Grille responsive : 3 colonnes sur mobile, 4 sur tablette
- Chaque image : coin arrondi, overlay au tap avec numero de selection
- Maximum 10 images selectionnables
- Bouton "Tout deselectionner" si > 0 selectionne

### Performance
- Images chargees en `loading="lazy"`
- Thumbnails optimisees (les images sont deja en WebP depuis le bucket)
- Pas d'API externe, tout est gratuit (lecture directe de la base)
