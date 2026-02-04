

# Plan : Génération de 280 Images pour la Bibliothèque Anime

## Objectif
Pré-générer et stocker **10 images par catégorie combinée** dans la bibliothèque anime, spécialement adaptées pour les contes africains.

---

## Stratégie de Génération

### Priorité 1 : Style "african" (le plus utilisé pour les contes)
Générer en priorité les combinaisons du style africain car c'est le style principal pour les contes.

### Structure de Génération
Pour chaque combinaison **Style × Emotion × Scene_type**, générer 10 images avec des variations de :
- **Personnages** : child_boy, child_girl, elder, animal, spirit, group
- **Actions** : standing, walking, talking, dancing, discovering
- **Moments** : morning, afternoon, dusk, night

---

## Calcul du Volume

| Style | Émotions | Scènes | Total combinaisons |
|-------|----------|--------|-------------------|
| african | 7 | 10 | 70 |
| fantasy | 7 | 10 | 70 |
| manga | 7 | 10 | 70 |
| chibi | 7 | 10 | 70 |
| **TOTAL** | - | - | **280** |

**Objectif : 10 images × 280 combinaisons = 2800 images**

---

## Approche par Phases

### Phase 1 : Style African (Prioritaire) - 700 images
Combinaisons essentielles pour les contes africains :

```text
AFRICAN × joy × [village, gathering, home, journey, forest] × 10 variations
AFRICAN × wonder × [spirit, night, forest, river, mountain] × 10 variations
AFRICAN × peace × [village, river, home, journey, forest] × 10 variations
AFRICAN × fear × [forest, night, spirit, mountain, journey] × 10 variations
AFRICAN × excitement × [gathering, journey, market, forest, river] × 10 variations
AFRICAN × sadness × [home, village, river, journey, forest] × 10 variations
AFRICAN × tension × [forest, night, village, spirit, journey] × 10 variations
```

### Phase 2 : Style Fantasy - 700 images
Pour les contes magiques et les esprits.

### Phase 3 : Styles Manga + Chibi - 1400 images
Pour diversifier les options visuelles.

---

## Modifications Requises

### 1. Edge Function : Nouvelle commande `generate_full_library`
Ajouter une commande batch qui génère automatiquement toutes les combinaisons.

```typescript
// Nouvelle commande dans generate-anime-library
case 'generate_full_library':
  return await handleGenerateFullLibrary(params, supabase, LOVABLE_API_KEY);
```

### 2. Logique de génération séquentielle avec reprise
```typescript
async function handleGenerateFullLibrary(params, supabase, apiKey) {
  const { style, start_from = 0, batch_size = 5 } = params;
  
  // Récupérer les combinaisons manquantes
  const allCombinations = generateAllCombinations(style);
  
  // Filtrer celles déjà générées
  const existing = await getExistingCombinations(supabase, style);
  const missing = allCombinations.filter(c => !existing.has(c.key));
  
  // Générer par batch
  const batch = missing.slice(start_from, start_from + batch_size);
  for (const combo of batch) {
    await generateAndStoreImage({...combo, apiKey, supabase});
  }
  
  return { generated: batch.length, remaining: missing.length - batch.length };
}
```

### 3. Page Admin : Gestionnaire de bibliothèque
Interface pour :
- Lancer la génération par style
- Voir la progression en temps réel
- Visualiser les images générées

---

## Variations de Personnages/Actions pour 10 images par combo

Pour chaque combinaison (style × emotion × scene), générer avec ces variations :

| # | Personnage | Action | Moment |
|---|------------|--------|--------|
| 1 | child_boy | standing | afternoon |
| 2 | child_girl | walking | morning |
| 3 | elder | talking | dusk |
| 4 | child_boy | discovering | night |
| 5 | child_girl | dancing | afternoon |
| 6 | animal | standing | dawn |
| 7 | group | gathering | noon |
| 8 | spirit | standing | night |
| 9 | elder | walking | afternoon |
| 10 | child_boy | running | morning |

---

## Interface Admin de Génération

### Composants à créer

1. **AnimeLibraryManager.tsx** - Page complète de gestion
2. **LibraryStats.tsx** - Statistiques visuelles
3. **GenerationControls.tsx** - Boutons de génération par catégorie
4. **LibraryGrid.tsx** - Grille d'images avec filtres

### Fonctionnalités :
- Bouton "Générer Style African" → Lance 700 images
- Barre de progression en temps réel
- Filtres par style/emotion/scene
- Prévisualisation des images générées

---

## Estimation de Temps et Coûts

| Phase | Images | Temps estimé | Coût API |
|-------|--------|--------------|----------|
| African | 700 | ~6 heures | ~$7 |
| Fantasy | 700 | ~6 heures | ~$7 |
| Manga | 700 | ~6 heures | ~$7 |
| Chibi | 700 | ~6 heures | ~$7 |
| **TOTAL** | **2800** | **~24 heures** | **~$28** |

Note: Les générations peuvent être lancées en parallèle pour réduire le temps total.

---

## Fichiers à Créer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/generate-anime-library/index.ts` | MODIFIER | Ajouter commande generate_full_library |
| `src/pages/admin/AnimeLibraryManager.tsx` | CRÉER | Page admin de gestion |
| `src/components/admin/LibraryStats.tsx` | CRÉER | Statistiques visuelles |
| `src/components/admin/GenerationControls.tsx` | CRÉER | Contrôles de génération |
| `src/components/admin/LibraryGrid.tsx` | CRÉER | Grille d'images |
| `src/hooks/useAnimeLibrary.ts` | MODIFIER | Ajouter generateFullLibrary |

---

## Workflow de Génération

```text
┌─────────────────────────────────────────────────────────────────┐
│                    INTERFACE ADMIN                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │  AFRICAN    │ │  FANTASY    │ │   MANGA     │ │   CHIBI    │ │
│  │  4/700 ▓░░░ │ │  1/700 ▓░░░ │ │  0/700 ░░░░ │ │  0/700 ░░░ │ │
│  │ [Générer]   │ │ [Générer]   │ │ [Générer]   │ │ [Générer]  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PROGRESSION GLOBALE: 5/2800 (0.2%)                      │   │
│  │  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Filtres: Style ▼] [Emotion ▼] [Scene ▼]                       │
│                                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │        │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Résumé

1. **Modifier l'Edge Function** pour supporter la génération batch complète
2. **Créer l'interface Admin** pour lancer et suivre les générations
3. **Générer par priorité** : African → Fantasy → Manga → Chibi
4. **10 variations** par combinaison style×emotion×scene = 2800 images totales

Cette approche permettra d'avoir une bibliothèque complète où **95%+ des scènes de contes** trouveront une correspondance instantanée.

