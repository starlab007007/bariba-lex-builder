

# Extension Video de la Bibliotheque + Refonte AssetGallery avec Tabs Photo/Video

## Vue d'ensemble

Ajouter le support video a la bibliotheque `anime_scene_library`, creer une structure de stockage organisee pour les videos courtes pre-generees (5-8s), et refondre le composant `AssetGallery` pour afficher un selecteur Photo/Video avec 3 elements par categorie et un bouton "Voir plus" qui ouvre une vue etendue.

---

## 1. Extension de la base de donnees

**Migration SQL** : Ajouter une colonne `video_url` et un champ `asset_type` a la table `anime_scene_library`

```text
Colonnes ajoutees :
- asset_type : TEXT ('photo' ou 'video'), defaut 'photo'
- video_url : TEXT nullable (URL de la video dans le bucket anime-library)
- video_duration : REAL nullable (duree en secondes, ex: 5.5)
```

Cela permet aux assets existants (54 images) de garder leur type `photo` par defaut, et d'ajouter de nouveaux enregistrements de type `video`.

## 2. Organisation des fichiers video dans le bucket `anime-library`

Structure proposee dans le bucket public `anime-library` :

```text
anime-library/
  african/
    joy/
      village_child_boy_standing_xxx.png        (existant - photo)
      village_child_boy_standing_xxx.webm        (nouveau - video)
    sadness/
      ...
    wonder/
      ...
  videos/
    african/
      animals/
        lion_savane_01.mp4
        elephant_riviere_01.mp4
        oiseau_foret_01.mp4
      village/
        danse_village_01.mp4
        marche_village_01.mp4
        feu_camp_01.mp4
      forest/
        arbres_vent_01.mp4
        riviere_foret_01.mp4
        brume_foret_01.mp4
      mythology/
        esprit_eau_01.mp4
        masque_danse_01.mp4
        ancetre_feu_01.mp4
      nature/
        coucher_soleil_01.mp4
        pluie_savane_01.mp4
        etoiles_nuit_01.mp4
      tales/
        conte_enfant_01.mp4
        roi_palais_01.mp4
        griot_parole_01.mp4
```

**Convention de nommage** : `{sujet}_{lieu}_{numero}.mp4`

Les videos seront inserees dans la table `anime_scene_library` avec `asset_type = 'video'` et les metadonnees correspondantes (scene_type, character_type, emotion).

## 3. Refonte du composant `AssetGallery.tsx`

### Interface repensee

```text
+-----------------------------------------+
| Illustrations         [2/10 selectionnes]|
+-----------------------------------------+
|  [ 📸 Photos ]  [ 🎬 Videos ]           |  <-- Toggle tabs
+-----------------------------------------+
|  🏘️ Village  🌳 Foret  🦁 Animaux ...   |  <-- Categories scrollables
+-----------------------------------------+
|  [img1]  [img2]  [img3]                  |  <-- 3 premiers assets
|                                          |
|      [ ▶ Voir plus (8) ]                |  <-- Bouton voir plus
+-----------------------------------------+
|  👧 Enfant  🧓 Ancien  👥 Groupe  ...   |  <-- Sous-filtres caractere
+-----------------------------------------+
```

### Changements cles

- **Tabs Photo/Video** : Deux boutons en haut pour basculer entre `photo` et `video`
- **Affichage limite** : Seulement 3 assets visibles par categorie
- **Bouton "Voir plus"** : Affiche le nombre restant, ouvre un modal/drawer avec la grille complete
- **Preview video** : Les miniatures video jouent automatiquement en boucle (muted) au survol/tap
- **Selection unifiee** : Les photos et videos sont selectionnables ensemble (max 10 total)

### Modal "Voir plus"

Quand l'utilisateur clique sur "Voir plus" :
- Un drawer/modal plein ecran s'ouvre
- Affiche tous les assets de la categorie active (photos ou videos selon le tab)
- Grille 3 colonnes avec tap pour selectionner
- Bouton "Fermer" pour revenir
- Le compteur de selection reste visible

## 4. Modifications dans les fichiers existants

### `AssetGallery.tsx` (refonte majeure)

- Ajouter state `assetType: 'photo' | 'video'`
- Modifier la requete pour filtrer par `asset_type`
- Pour les videos : inclure `video_url` dans le select
- Limiter l'affichage a 3 elements, afficher le compteur restant
- Ajouter un modal `AssetExpandedView` inline pour le "Voir plus"
- Les miniatures video utilisent `<video>` avec `autoPlay muted loop playsInline`

### `GriotStudio.tsx`

- Passer la prop `selectedAssets` qui peut contenir photos et videos
- Le type `LibraryAsset` est etendu avec `video_url?`, `asset_type`, `video_duration?`

### `useAnimeStoryGenerator.ts`

- `generateFromSelectedAssets` : gerer les assets video (utiliser `video_url` si present, sinon `image_url`)
- `StoryScene` : ajouter `videoUrl?: string` optionnel pour les scenes basees sur des videos
- Adapter le calcul de duree : les scenes video utilisent leur propre duree (`video_duration`) au lieu de la repartition uniforme

### `StoryPreviewPlayer.tsx`

- Si une scene a un `videoUrl`, afficher un element `<video>` au lieu d'une image statique
- Le video element doit etre synchronise avec le timeline general
- Autoplay muted (le son vient de la narration, pas de la video template)

---

## 5. Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/AssetGallery.tsx` | Tabs Photo/Video, limite 3 items, bouton "Voir plus", modal etendu, preview video |
| `src/components/griot-studio/GriotStudio.tsx` | Etendre le type LibraryAsset |
| `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` | Support videoUrl dans StoryScene et generateFromSelectedAssets |
| `src/components/griot-studio/StoryPreviewPlayer.tsx` | Rendu video pour les scenes avec videoUrl |

## 6. Migration SQL

```text
- ALTER TABLE anime_scene_library ADD COLUMN asset_type TEXT DEFAULT 'photo'
- ALTER TABLE anime_scene_library ADD COLUMN video_url TEXT
- ALTER TABLE anime_scene_library ADD COLUMN video_duration REAL
```

## 7. Details techniques importants

- **Pas d'API payante** : tout reste gratuit. Les videos sont hebergees sur le bucket public existant `anime-library`
- **Preview video** : utilise `<video autoPlay muted loop playsInline>` natif du navigateur
- **Performance** : les videos sont courtes (5-8s) et legeres, chargement lazy
- **Compatibilite** : les assets existants (54 photos) gardent `asset_type = 'photo'` par defaut grace au DEFAULT
- **Le modal "Voir plus"** reste dans le meme composant (pas de navigation) pour garder le contexte de selection

