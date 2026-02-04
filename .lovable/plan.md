
# Plan : Bibliothèque d'Images Anime Pré-générées

## Objectif
Créer une bibliothèque d'illustrations anime pré-générées et classifiées qui seront **matchées intelligemment** aux scènes des contes au lieu de générer de nouvelles images à chaque création.

---

## Architecture de la Solution

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SYSTÈME DE BIBLIOTHÈQUE ANIME                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: PRÉ-GÉNÉRATION (Admin/Batch)                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Edge Function: generate-anime-library                                  │ │
│  │                                                                        │ │
│  │  1. Générer images pour chaque combinaison:                            │ │
│  │     - 4 Styles × 7 Émotions × 10 Types de scènes = ~280 images         │ │
│  │                                                                        │ │
│  │  2. Pour chaque image générée:                                         │ │
│  │     - Générer embedding sémantique (description)                       │ │
│  │     - Stocker dans Supabase Storage (bucket anime-library)             │ │
│  │     - Enregistrer métadonnées dans table anime_scene_library           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  PHASE 2: STOCKAGE (Supabase)                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Table: anime_scene_library                                            │ │
│  │  ├── id (uuid)                                                         │ │
│  │  ├── style (manga/chibi/fantasy/african)                               │ │
│  │  ├── emotion (joy/sadness/wonder/fear/excitement/peace/tension)        │ │
│  │  ├── scene_type (village/forest/river/mountain/market/home/night...)   │ │
│  │  ├── character_type (child_boy/child_girl/elder/animal/spirit...)      │ │
│  │  ├── action (standing/walking/running/talking/sleeping/dancing...)     │ │
│  │  ├── time_of_day (dawn/morning/noon/afternoon/dusk/night)              │ │
│  │  ├── weather (clear/cloudy/rain/storm/fog/snow)                        │ │
│  │  ├── tags (JSONB) - mots-clés additionnels                             │ │
│  │  ├── description_fr (text) - description en français                   │ │
│  │  ├── description_en (text) - description en anglais                    │ │
│  │  ├── embedding (vector) - pour recherche sémantique                    │ │
│  │  ├── image_url (text) - URL publique Supabase Storage                  │ │
│  │  ├── usage_count (int) - statistiques d'utilisation                    │ │
│  │  └── created_at (timestamp)                                            │ │
│  │                                                                        │ │
│  │  Storage Bucket: anime-library (public)                                │ │
│  │  └── /{style}/{emotion}/{scene_type}_{character}_{action}.webp         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  PHASE 3: MATCHING INTELLIGENT (Runtime)                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Nouveau flow dans generate-anime-story:                               │ │
│  │                                                                        │ │
│  │  1. Analyser texte du conte → Extraire scènes + émotions               │ │
│  │  2. Pour chaque scène:                                                 │ │
│  │     a. Générer embedding de la description                             │ │
│  │     b. Rechercher images similaires dans anime_scene_library           │ │
│  │     c. Sélectionner meilleur match (score > 0.7)                       │ │
│  │  3. Si pas de match suffisant:                                         │ │
│  │     → Fallback: générer image en temps réel (comme avant)              │ │
│  │  4. Retourner scènes avec URLs d'images pré-existantes                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Classification des Images

### Par Style (4 catégories)
| Style | Description | Couleurs dominantes |
|-------|-------------|---------------------|
| manga | Noir et blanc, traits fins, expressif | Monochrome, gris |
| chibi | Mignon, têtes grosses, pastel | Rose, bleu clair, jaune |
| fantasy | Magique, détaillé, lumineux | Violet, or, bleu |
| african | Tons chauds, motifs africains, coucher de soleil | Orange, brun, ocre |

### Par Émotion (7 catégories)
| Émotion | Ambiance visuelle | Éléments |
|---------|-------------------|----------|
| joy | Lumineuse, chaleureuse | Soleil, sourires, couleurs vives |
| sadness | Bleue, mélancolique | Pluie, nuages, larmes |
| wonder | Magique, scintillante | Étoiles, particules, lueur |
| fear | Sombre, contrastée | Ombres, nuit, formes menaçantes |
| excitement | Dynamique, énergique | Lignes de mouvement, action |
| peace | Douce, sereine | Coucher de soleil, nature calme |
| tension | Intense, dramatique | Rouge, ombres dures |

### Par Type de Scène (10+ catégories)
| Type | Description | Éléments typiques |
|------|-------------|-------------------|
| village | Village africain traditionnel | Cases, marché, arbres |
| forest | Forêt mystique ou dense | Arbres, feuillage, animaux |
| river | Rivière, lac, point d'eau | Eau, reflets, végétation |
| mountain | Montagne, colline | Rochers, hauteur, vue |
| market | Marché local, commerce | Étals, foule, produits |
| home | Intérieur maison | Feu, famille, objets |
| night | Scène nocturne | Lune, étoiles, feu de camp |
| journey | Voyage, chemin | Route, paysage, horizon |
| gathering | Rassemblement, fête | Groupe, danse, musique |
| spirit | Rencontre spirituelle | Esprit, lueur, magie |

### Par Personnage (6 catégories)
| Type | Description |
|------|-------------|
| child_boy | Jeune garçon africain (6-12 ans) |
| child_girl | Jeune fille africaine (6-12 ans) |
| elder | Ancien/sage du village (60+ ans) |
| animal | Animal africain (lion, éléphant, oiseau, etc.) |
| spirit | Entité spirituelle/magique |
| group | Groupe de personnes |

### Par Action (8 catégories)
| Action | Description |
|--------|-------------|
| standing | Debout, observant |
| walking | En marche |
| talking | En discussion |
| dancing | Dansant |
| working | Travaillant |
| sleeping | Dormant |
| running | Courant |
| discovering | Découvrant quelque chose |

---

## Fichiers à Créer

### 1. Migration Base de Données
Créer la table `anime_scene_library` avec les colonnes de classification et un index pour la recherche vectorielle.

### 2. Edge Function: `generate-anime-library`
Fonction batch pour pré-générer les images de la bibliothèque.

```text
Actions supportées:
- generate_batch: Génère N images pour une combinaison style+emotion+scene
- list_library: Liste les images disponibles avec filtres
- get_stats: Statistiques de couverture de la bibliothèque
```

### 3. Edge Function: Modifier `generate-anime-story`
Ajouter la logique de matching avant de générer:

```text
1. Analyser scène → extraire tags (emotion, scene_type, character, action)
2. Chercher dans anime_scene_library avec ces critères
3. Si match trouvé → utiliser image existante
4. Sinon → générer nouvelle image (fallback actuel)
```

### 4. Hook Admin: `useAnimeLibrary.ts`
Hook pour gérer la bibliothèque depuis l'interface admin.

### 5. Page Admin: Gestionnaire de Bibliothèque
Interface pour:
- Voir la couverture de la bibliothèque
- Lancer des générations batch
- Visualiser et tagguer les images

---

## Algorithme de Matching

```text
matchScene(sceneDescription, style, emotion):
  1. Extraire tags de la description:
     - scene_type via mots-clés (village, forêt, marché...)
     - character_type via détection (enfant, ancien, animal...)
     - action via verbes (marcher, parler, danser...)
     - time_of_day via contexte (matin, nuit, coucher de soleil...)
  
  2. Requête SQL avec scores pondérés:
     SELECT *, 
       (style = $style)::int * 3 +
       (emotion = $emotion)::int * 2 +
       (scene_type = $scene_type)::int * 2 +
       (character_type = $character_type)::int * 1 +
       (action = $action)::int * 1
     AS match_score
     FROM anime_scene_library
     WHERE style = $style  -- Style obligatoire
     ORDER BY match_score DESC
     LIMIT 3
  
  3. Si match_score >= 5 → utiliser l'image
     Sinon → fallback génération IA
```

---

## Stratégie de Pré-génération

### Phase 1: Images Essentielles (60 images)
Combinaisons les plus courantes pour les contes africains:
- Style: african + fantasy
- Émotions: joy, wonder, peace, excitement
- Scènes: village, forest, journey, gathering, spirit
- Personnages: child_boy, child_girl, elder

### Phase 2: Extension (120 images)
- Ajouter styles manga et chibi
- Couvrir toutes les émotions
- Ajouter scènes secondaires

### Phase 3: Couverture Complète (280+ images)
- Toutes les combinaisons possibles
- Variantes multiples par combinaison

---

## Avantages de cette Solution

| Aspect | Avant (Génération) | Après (Bibliothèque) |
|--------|-------------------|---------------------|
| **Temps** | 30-180 secondes | 1-3 secondes |
| **Coût API** | ~$0.10-0.30/conte | ~$0 (images pré-payées) |
| **Qualité** | Variable | Contrôlée et curatée |
| **Offline** | Impossible | Possible (cache local) |
| **Consistance** | Aléatoire | Cohérente par style |

---

## Détails Techniques

### Structure du Bucket Storage
```
anime-library/
├── african/
│   ├── joy/
│   │   ├── village_child_boy_standing.webp
│   │   ├── village_child_girl_dancing.webp
│   │   └── ...
│   ├── sadness/
│   └── ...
├── fantasy/
├── manga/
└── chibi/
```

### Format des Images
- Format: WebP (meilleur ratio qualité/taille)
- Dimensions: 540x960 (9:16 mobile)
- Qualité: 85% (bon compromis)
- Taille estimée: ~50-100 KB par image

### Estimation Stockage
- 280 images × 75 KB moyenne = ~21 MB
- Coût Supabase Storage: Négligeable

---

## Résumé des Modifications

| Fichier | Action | Priorité |
|---------|--------|----------|
| Migration `anime_scene_library` | CRÉER | ⭐⭐⭐ |
| Bucket `anime-library` | CRÉER | ⭐⭐⭐ |
| Edge Function `generate-anime-library` | CRÉER | ⭐⭐⭐ |
| Edge Function `generate-anime-story` | MODIFIER | ⭐⭐ |
| Hook `useAnimeLibrary.ts` | CRÉER | ⭐⭐ |
| Page Admin Bibliothèque | CRÉER | ⭐ |

---

## Workflow Utilisateur Final

```text
AVANT (Actuel):
Enregistrer → [ATTENTE 30-180s] → Générer images IA → Preview → Publier

APRÈS (Avec Bibliothèque):
Enregistrer → [INSTANTANÉ 1-3s] → Matcher images → Preview → Publier
```

L'utilisateur ne verra aucune différence dans l'interface, mais le temps d'attente sera réduit de 95%.
