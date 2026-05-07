# 📋 Tableau de Fonctionnement des Templates TAM-TAM

## Vue d'ensemble

Ce document décrit l'état de fonctionnement de chaque template, les fichiers à modifier pour les corriger/améliorer, et le flow de bout en bout jusqu'à la publication.

---

## 🎯 Templates Fonctionnels (End-to-End)

| Template | ID | Status | Description |
|----------|-----|--------|-------------|
| ✅ **Radio Village Pro** | `radio_village_pro` | **100% Fonctionnel** | Template audio-first avec génération vidéo réelle. Flow complet: Audio → Photos → Style → Processing → Publication |
| ✅ **One-Take Pro** | `one_take_pro` | **100% Fonctionnel** | Template vidéo 15s avec effets Kuaishou Horse, sparkles, calligraphie, beat sync |
| ✅ **Quick Story** | `quick_story` | **90% Fonctionnel** | Story rapide 10-15s. Capture → Effets → Publication |
| ✅ **Photo Slideshow** | `photo_slideshow` | **85% Fonctionnel** | Transformation photos en vidéo avec Ken Burns |

---

## 🔧 Templates Partiellement Fonctionnels

| Template | ID | Status | Problème | Solution |
|----------|-----|--------|----------|----------|
| ⚠️ **Dance Challenge** | `dance_challenge_01` | **70%** | Assets vidéo (intro/outro) manquants | Ajouter fichiers dans `/public/templates/assets/dance_01/` |
| ⚠️ **Smart Captions** | `smart_captions` | **65%** | ASR Bariba incomplet | Améliorer modèle STT dans `supabase/functions/bariba-stt/` |
| ⚠️ **Beat Sync Ultra** | `beat_sync_ultra` | **60%** | Détection beat approximative | Améliorer `KaraokeSyncService.ts` |
| ⚠️ **Magic Transform** | `magic_transform` | **55%** | Style transfer non implémenté | Implémenter dans edge function |
| ⚠️ **Karaoke Mode** | `karaoke_mode` | **50%** | Sync paroles/audio non précis | Améliorer `KaraokeSyncService.ts` |

---

## ❌ Templates Non Fonctionnels (UI Only)

| Template | ID | Raison | Fichiers à créer |
|----------|-----|--------|------------------|
| ❌ **Voice Clone Hook** | `voice_clone_hook` | API voice clone non intégrée | `supabase/functions/voice-clone/` |
| ❌ **Style Transfer Local** | `style_transfer_local` | ML model non déployé | Edge function + WebGL |
| ❌ **Auto B-Roll Booster** | `auto_broll_booster` | Stock video API non configurée | Intégrer Pexels/Pixabay API |
| ❌ **Neon Glow** | `neon_glow` | Effets WebGL complexes manquants | `AREffectsLayer.tsx` |
| ❌ **Grass Cutout** | `grass_cutout` | Segmentation personne non fonctionnelle | MediaPipe ou TensorFlow.js |

---

## 📁 Architecture des Fichiers Templates

```
public/templates/
├── index.json                    # Index de tous les templates
├── manifests/                    # Manifestes JSON par template
│   ├── one_take_pro.json
│   ├── radio_village_pro_01.json
│   ├── quick_story.json
│   └── ... (27 templates)
├── packs/                        # Assets réutilisables
│   ├── audio/sfx_pack.json
│   ├── filters/warm_soft.filter.json
│   ├── stickers/cta_blink_pack.json
│   └── textStyles/*.style.json
└── assets/                       # Assets visuels
    └── horse_silhouette.svg

src/
├── data/
│   ├── KuaishouTemplateData.ts   # 5 templates Kuaishou natifs
│   └── RadioVillageProData.ts    # Config Radio Village Pro
├── components/tamtam/creator/
│   ├── AdvancedTemplateData.ts   # 24 templates avancés + types KSE
│   ├── AdvancedTemplateDrawer.tsx # Drawer sélection templates
│   ├── UnifiedTemplateSelector.tsx # Sélecteur unifié
│   ├── TemplateSlotPicker.tsx    # Picker médias Kuaishou-style
│   ├── RecognizingScreen.tsx     # Écran "Recognizing XX%"
│   ├── OverridesEditor.tsx       # Éditeur post-template
│   └── TemplateEngine.ts         # Moteur de rendu
├── hooks/
│   ├── useUnifiedTemplates.ts    # Agrège tous les templates
│   ├── useTemplateCapture.ts     # Capture avec template
│   └── useTemplateLibrary.ts     # Chargement bibliothèque
└── services/
    ├── TemplatePackLoader.ts     # Chargeur packs/manifests
    ├── KaraokeSyncService.ts     # Sync audio/texte
    └── TemplateVideoCache.ts     # Cache vidéos templates
```

---

## 🔄 Flow Kuaishou (Bout en Bout)

```
1. DÉCOUVERTE
   └── UnifiedTemplateSelector.tsx
       └── Affiche cards avec: emoji, durée, inputSummary

2. SÉLECTION
   └── AdvancedTemplateDrawer.tsx
       └── Preview vidéo/animation
       └── Bouton "Start" → déclenche flow

3. SLOT PICKER (Kuaishou-style)
   └── TemplateSlotPicker.tsx
       └── "Done (0/1)" pour chaque slot
       └── Sélection galerie ou capture

4. RECOGNIZING (AI Pipeline)
   └── RecognizingScreen.tsx
       └── Progress "Recognizing XX%"
       └── Steps: crop → stabilize → enhance → subtitles

5. OVERRIDES EDITOR
   └── OverridesEditor.tsx
       └── 6 boutons: Music, Text, Subtitles, Cover, Change, Stickers
       └── Preview K-Engine

6. PUBLICATION
   └── PublishScreen.tsx
       └── Caption, hashtags, visibilité
       └── Export final → tamtam_posts

7. SUCCÈS
   └── SuccessScreen.tsx
       └── Animation confetti
       └── Partage social
```

---

## 🛠️ Guide de Modification des Templates

### Ajouter un nouveau template

1. **Créer le manifest JSON** dans `public/templates/manifests/mon_template.json`
2. **Ajouter dans AdvancedTemplateData.ts** (section `ADVANCED_TEMPLATES`)
3. **Configurer les slots** (inputs requis)
4. **Définir le pipeline** (étapes IA)
5. **Créer les assets** si nécessaire

### Modifier un template existant

| Aspect | Fichier |
|--------|---------|
| Nom, description, emoji | `AdvancedTemplateData.ts` → objet template |
| Durées supportées | `supportedDurations: ['15s', '30s']` |
| Inputs requis | `inputs: [{ type: 'video', minCount: 1, ... }]` |
| Effets IA | `features: { beatSync: true, smartCaptions: true }` |
| Style visuel | `color: 'from-orange-500 to-pink-500'` |
| Instructions vocales | `voiceInstructions: [...]` |

### Modifier les effets visuels

| Effet | Fichier |
|-------|---------|
| Filtres couleur | `src/components/tamtam/creator/CreatorEffectsData.ts` |
| Stickers/AR | `src/components/tamtam/creator/AREffectsLayer.tsx` |
| Overlays template | `src/components/tamtam/creator/TemplateOverlay.tsx` |
| Animations texte | `src/components/tamtam/creator/DraggableTextOverlay.tsx` |

### Modifier le pipeline IA

| Étape | Fichier |
|-------|---------|
| Détection beat | `src/services/KaraokeSyncService.ts` |
| Stabilisation | `src/engines/HybridRenderingEngine.ts` |
| Sous-titres auto | `supabase/functions/bariba-stt/index.ts` |
| Traduction | `supabase/functions/ai-translate/index.ts` |
| Génération contenu | `supabase/functions/generate-content/index.ts` |

---

## 📊 Statistiques Templates

| Catégorie | Nombre | Fonctionnels |
|-----------|--------|--------------|
| **Kuaishou Natifs** | 5 | 3 (60%) |
| **Avancés IA** | 24 | 8 (33%) |
| **Manifests JSON** | 27 | 15 (56%) |
| **Total** | 56 | 26 (46%) |

---

## 🎯 Priorités de Développement

1. **P0 - Critique**: Compléter Radio Village Pro → déjà fait ✅
2. **P1 - Haute**: Corriger Dance Challenge (ajouter assets)
3. **P1 - Haute**: Améliorer Smart Captions (STT Bariba)
4. **P2 - Moyenne**: Implémenter Beat Sync précis
5. **P2 - Moyenne**: Ajouter Karaoke sync
6. **P3 - Basse**: Voice Clone API
7. **P3 - Basse**: Style Transfer WebGL

---

## 🔗 Références

- **Memory**: `features/creation/unified-harmonized-workflow-v6`
- **Memory**: `features/creation/radio-village-pro-integrated-workflow-v2`
- **Memory**: `infrastructure/unified-template-centralization-v3`
- **Plan**: `.lovable/plan.md` (Intégration Kuaishou complété)
