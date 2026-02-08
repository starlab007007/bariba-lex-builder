
# Analyse Intelligente Automatique des Assets

## Objectif

Ajouter un systeme d'analyse IA automatique qui, des qu'un fichier est charge dans l'admin (photo, video ou musique), detecte et pre-remplit automatiquement tous les champs de classification : style, emotion, scene, personnage, action, titre, artiste, etc.

**100% gratuit** : utilise l'IA Lovable (Gemini 2.5 Flash) deja configuree dans le projet, sans API externe payante.

## Comment ca fonctionne

```text
+-------------------+     +--------------------+     +-------------------+
|  Admin charge     |     |  Edge Function     |     |  Formulaire       |
|  un fichier       | --> |  analyze-asset     | --> |  pre-rempli       |
|  (photo/video/    |     |  (Gemini Vision)   |     |  automatiquement  |
|   musique)        |     |                    |     |  + badge "IA"     |
+-------------------+     +--------------------+     +-------------------+
```

### Pour les Photos
1. L'image est convertie en base64 dans le navigateur
2. Envoyee a l'edge function `analyze-asset`
3. Gemini 2.5 Flash (vision) analyse le contenu visuel
4. Retourne : style, emotion, scene, personnage, action, moment, description EN/FR
5. Tous les champs du formulaire sont pre-remplis avec un indicateur "Suggestion IA"

### Pour les Videos
1. Une frame est extraite de la video via Canvas (a 1 seconde)
2. Cette frame est convertie en base64
3. Meme analyse que pour les photos

### Pour la Musique
1. Le nom du fichier est parse intelligemment pour detecter :
   - Patterns comme `Artiste - Titre.mp3`, `Titre_by_Artiste.mp3`
   - Mots-cles pour la categorie (djembe, tambour = traditional, etc.)
2. Les caracteristiques audio (duree, energie) sont extraites via Web Audio API
3. L'IA suggere categorie et humeur a partir du titre et des indices audio

---

## Plan technique detaille

### 1. Nouvelle Edge Function : `analyze-asset`

Fichier : `supabase/functions/analyze-asset/index.ts`

Cette fonction recoit soit une image base64 (photos/videos), soit des metadonnees textuelles (musique), et retourne des suggestions de classification.

**Endpoint** : `POST /analyze-asset`

**Requete pour photo/video** :
```json
{
  "type": "image",
  "imageBase64": "data:image/jpeg;base64,...",
  "taxonomy": {
    "styles": ["african", "fantasy", "manga", "chibi"],
    "emotions": ["joy", "sadness", "wonder", ...],
    "scenes": ["village", "forest", ...],
    "characters": ["child_boy", "child_girl", ...],
    "actions": ["standing", "walking", ...],
    "timeOfDay": ["day", "night", "dawn", "dusk"]
  }
}
```

**Requete pour musique** :
```json
{
  "type": "music",
  "filename": "Tambours_de_fete_by_Kora.mp3",
  "duration": 185,
  "taxonomy": {
    "categories": ["traditional", "educational", ...],
    "moods": ["energetic", "calm", ...]
  }
}
```

**Reponse (uniforme)** :
```json
{
  "suggestions": {
    "style": "african",
    "emotion": "joy",
    "scene_type": "gathering",
    "character_type": "group",
    "action": "dancing",
    "time_of_day": "day",
    "description_en": "A group of children dancing joyfully in a village gathering",
    "description_fr": "Un groupe d'enfants dansant joyeusement lors d'un rassemblement au village",
    "title": "Tambours de fete",
    "artist": "Kora",
    "category": "traditional",
    "mood": "energetic",
    "tags": ["percussion", "celebration", "african"],
    "confidence": 0.85
  }
}
```

**Logique interne** :
- Utilise `google/gemini-2.5-flash` (rapide, gratuit, supporte la vision)
- Le prompt systeme fournit la taxonomie exacte pour forcer des valeurs valides
- Pour les images : analyse visuelle directe avec `image_url` dans le message
- Pour la musique : analyse textuelle du nom de fichier + contexte

### 2. Utilitaire client : `src/utils/assetAnalyzer.ts`

Module utilitaire partage entre les formulaires :

**Fonctions exposees** :
- `analyzeImage(file: File): Promise<AssetSuggestions>` - Convertit l'image en base64 reduite (max 800px), appelle l'edge function
- `analyzeVideoFrame(file: File): Promise<AssetSuggestions>` - Extrait une frame a 1s via Canvas + video element, puis appelle `analyzeImage`
- `analyzeMusicFile(file: File, duration: number): Promise<MusicSuggestions>` - Parse le nom du fichier + appelle l'edge function
- `parseFilename(filename: string): { title?: string, artist?: string }` - Detection locale de patterns (Artiste - Titre, etc.)

**Optimisations** :
- L'image est redimensionnee a max 800x800px avant conversion base64 (economie de bande passante)
- Timeout de 15 secondes avec fallback gracieux (les champs restent manuels si l'IA echoue)

### 3. Modification de `AssetUploadForm.tsx`

**Changements** :
- Ajout d'un etat `analyzing: boolean` et `aiSuggested: boolean`
- Apres selection du fichier, declenchement automatique de l'analyse :
  - Photo : appel a `analyzeImage(file)`
  - Video : appel a `analyzeVideoFrame(file)`
- Affichage d'un indicateur de chargement "Analyse IA en cours..." avec animation
- Pre-remplissage de TOUS les champs (style, emotion, scene, personnage, action, moment, descriptions)
- Badge "Suggere par IA" a cote de chaque champ modifie par l'IA
- L'utilisateur peut toujours modifier manuellement chaque champ

**UX** :
- Pendant l'analyse : skeleton/spinner sur les selects
- Apres analyse : les champs mis a jour clignotent brievement en bleu
- Si l'analyse echoue : toast discret, les champs restent aux valeurs par defaut

### 4. Modification de `MusicUploadForm.tsx`

**Changements** :
- Apres selection du fichier audio :
  1. Extraction du titre/artiste depuis le nom du fichier (local, instantane)
  2. Extraction de la duree (Web Audio API, deja en place)
  3. Appel a `analyzeMusicFile(file, duration)` pour suggestions IA
- Pre-remplissage de : titre, artiste, categorie, humeur, tags
- Meme systeme de badges "Suggere par IA"

**Parsing de noms de fichier (local)** :
| Pattern | Exemple | Resultat |
|---------|---------|----------|
| `Artiste - Titre.mp3` | `Kora Master - Sundjata.mp3` | artist="Kora Master", title="Sundjata" |
| `Titre_by_Artiste.mp3` | `Djembe_drums_by_Foli.mp3` | title="Djembe drums", artist="Foli" |
| `Titre (feat. X).mp3` | `Rythme (feat. Griot).mp3` | title="Rythme", artist="Griot" |
| `simple_titre.mp3` | `tambour_celebration.mp3` | title="Tambour celebration" |

---

## Resume des fichiers

| Fichier | Action | Role |
|---------|--------|------|
| `supabase/functions/analyze-asset/index.ts` | Nouveau | Edge function IA (Gemini Vision) |
| `src/utils/assetAnalyzer.ts` | Nouveau | Utilitaires d'analyse client |
| `src/components/admin/AssetUploadForm.tsx` | Modifie | Auto-analyse photo/video |
| `src/components/admin/MusicUploadForm.tsx` | Modifie | Auto-analyse musique |

## Contraintes respectees
- Zero API payante : utilise uniquement Lovable AI (Gemini 2.5 Flash) via le gateway gratuit
- Pas de nouvelles dependances npm
- Fallback gracieux : si l'IA echoue, l'interface reste 100% manuelle
- L'utilisateur garde le controle total et peut modifier chaque suggestion
