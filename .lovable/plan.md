

# Interface Admin d'Upload Manuel - Photos, Videos et Musiques

## Objectif
Creer une interface d'administration complete permettant d'uploader manuellement des photos, videos et musiques dans la bibliotheque de contes, avec classification par categorie, emotion, personnage, etc.

## Architecture

L'interface sera integree dans le dashboard admin existant sous l'onglet "Bibliotheque Anime" (`AnimeLibraryManager.tsx`), avec 3 sous-onglets : **Photos**, **Videos**, **Musiques**.

### Structure des fichiers

```text
src/components/admin/
  AnimeLibraryManager.tsx        (modifie - ajout des onglets upload)
  AssetUploadForm.tsx            (nouveau - formulaire upload photo/video)
  MusicUploadForm.tsx            (nouveau - formulaire upload musique)
```

### Base de donnees

- **Photos et Videos** : enregistrement dans la table existante `anime_scene_library` avec `asset_type = 'photo'` ou `asset_type = 'video'`
- **Musiques** : creation d'une nouvelle table `music_library_tracks` pour stocker les musiques dans la base de donnees (actuellement les musiques sont uniquement en fichiers JSON statiques, ce qui empeche l'ajout dynamique)

---

## Plan detaille

### 1. Migration base de donnees - Table `music_library_tracks`

Nouvelle table pour stocker les pistes musicales uploadees :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant unique |
| title | text | Nom de la piste |
| artist | text | Artiste/source |
| category | text | traditional, educational, ambient, celebration, nature |
| mood | text | energetic, calm, joyful, reflective, motivating |
| duration | real | Duree en secondes |
| bpm | integer | Battements par minute (optionnel) |
| description_fr | text | Description en francais |
| tags | jsonb | Tags pour le filtrage |
| audio_url | text | URL publique du fichier audio |
| storage_path | text | Chemin dans le bucket |
| usage_count | integer | Compteur d'utilisation |
| created_at | timestamptz | Date de creation |

Politique RLS : lecture publique, ecriture reservee aux admins.

### 2. Composant `AssetUploadForm.tsx` (Photos et Videos)

Formulaire avec :
- **Selecteur de type** : Photo ou Video
- **Upload de fichier** : zone drag-and-drop ou clic, acceptant :
  - Photos : `.webp`, `.jpg`, `.png` (max 5 Mo)
  - Videos : `.mp4`, `.webm` (max 20 Mo)
- **Upload de thumbnail** (pour les videos) : image de couverture
- **Champs de classification** :
  - Style : african, fantasy, manga, chibi (select)
  - Emotion : joy, sadness, wonder, fear, excitement, peace, tension (select)
  - Scene : village, forest, river, mountain, market, home, night, journey, gathering, spirit (select)
  - Personnage : child_boy, child_girl, elder, animal, spirit, group (select)
  - Action : standing, walking, talking, dancing, working, sleeping, running, discovering (select)
  - Moment de la journee : day, night, dawn, dusk (select)
- **Description** : champ texte (FR et EN)
- **Apercu** : affichage de l'image ou video avant soumission

Logique d'upload :
1. Upload du fichier vers le bucket `anime-library` avec chemin structure : `{style}/{asset_type}/{scene_type}/{fichier}`
2. Insertion dans `anime_scene_library` avec toutes les metadonnees
3. Feedback de succes/erreur avec toast

### 3. Composant `MusicUploadForm.tsx` (Musiques)

Formulaire avec :
- **Upload de fichier** : `.mp3`, `.ogg`, `.wav` (max 10 Mo)
- **Champs de classification** :
  - Titre de la piste
  - Artiste (optionnel)
  - Categorie : traditional, educational, ambient, celebration, nature (select)
  - Humeur : energetic, calm, joyful, reflective, motivating (select)
  - BPM (optionnel, champ numerique)
  - Tags (champ texte, separes par virgules)
- **Description** : champ texte
- **Lecteur audio** : apercu du fichier avant soumission

Logique d'upload :
1. Upload du fichier vers le bucket `anime-library` avec chemin : `music/{category}/{fichier}`
2. Extraction automatique de la duree via l'API Audio
3. Insertion dans `music_library_tracks`
4. Feedback avec toast

### 4. Modification de `AnimeLibraryManager.tsx`

Ajout de 3 onglets dans le gestionnaire :
- **Galerie** : vue existante (AnimeLibraryGrid + stats)
- **Upload Photo/Video** : le formulaire AssetUploadForm
- **Upload Musique** : le formulaire MusicUploadForm

### 5. Integration avec le systeme existant

Le `MusicDrawer.tsx` et `AudioLibraryService.ts` qui servent les musiques aux contes devront etre mis a jour pour aussi charger les pistes depuis la nouvelle table `music_library_tracks`, en complement des fichiers JSON statiques existants.

---

## Taxonomie complete (reference pour les selects)

| Champ | Valeurs |
|-------|---------|
| Style | african, fantasy, manga, chibi |
| Emotion | joy, sadness, wonder, fear, excitement, peace, tension |
| Scene | village, forest, river, mountain, market, home, night, journey, gathering, spirit |
| Personnage | child_boy, child_girl, elder, animal, spirit, group |
| Action | standing, walking, talking, dancing, working, sleeping, running, discovering |
| Moment | day, night, dawn, dusk |
| Categorie musique | traditional, educational, ambient, celebration, nature |
| Humeur musique | energetic, calm, joyful, reflective, motivating |

---

## Resume des modifications

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer table `music_library_tracks` + RLS |
| `src/components/admin/AssetUploadForm.tsx` | Nouveau - Upload photo/video |
| `src/components/admin/MusicUploadForm.tsx` | Nouveau - Upload musique |
| `src/components/admin/AnimeLibraryManager.tsx` | Modifier - Ajout onglets |
| `src/services/AudioLibraryService.ts` | Modifier - Charger aussi depuis DB |
| `src/components/tamtam/creator/MusicDrawer.tsx` | Modifier - Integrer nouvelles pistes |

