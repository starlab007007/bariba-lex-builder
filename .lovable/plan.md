
# Plan d'Optimisation Complète de la Plateforme FITILA

## Vue d'Ensemble

Après analyse approfondie du code, j'ai identifié **15 optimisations critiques** réparties en 4 domaines pour rendre la plateforme rapide, fluide et sans bugs.

---

## 1. OPTIMISATION DU CHARGEMENT INITIAL (Performance au démarrage)

### 1.1 Lazy Loading des Routes
**Problème** : Toutes les pages sont importées au démarrage dans `App.tsx`, même celles rarement visitées.

**Solution** : Implémenter React.lazy() pour les routes secondaires.

```text
Routes à charger immédiatement:
- FitilaApp, TamTamSocial (page principale)

Routes à charger en différé (lazy):
- AdminDashboard, TamTamDictionary, TamTamTranslator
- GriotStudioPage, TamTamCreator, TamTamProfile
- Toutes les pages de services (Agriculture, Finance, Education, Health)
```

**Impact** : Réduction de 40-60% du bundle initial.

### 1.2 Preload des Assets Critiques
**Problème** : Les fontes et styles critiques sont chargés après le rendu initial.

**Solution** : Ajouter des liens preload dans `index.html`.

---

## 2. OPTIMISATION DU FEED SOCIAL (TamTamSocial.tsx)

### 2.1 Virtualisation du Feed
**Problème** : Le feed charge toutes les vidéos/posts en mémoire (jusqu'à 50+).

**Solution** : Implémenter un système de virtualisation pour ne rendre que les éléments visibles.

```text
Comportement actuel:
- 50 vidéos × ~10MB chacune = charge mémoire importante
- Tous les composants sont montés

Comportement optimisé:
- Rendre uniquement : [post-1] [post actif] [post+1]
- Précharger : thumbnails des 3 posts suivants
- Nettoyer : les vidéos hors écran (URL.revokeObjectURL)
```

### 2.2 Optimisation du Swipe Horizontal
**Problème** : Transitions lentes entre les feeds (patrimoine/mavoix/creation).

**Solution** : Réduire le seuil de détection et améliorer l'animation.

### 2.3 Cache des Posts
**Problème** : `useTamTamPosts` refetch à chaque changement de route.

**Solution** : Utiliser le staleTime de React Query (déjà configuré à 5min) + persistance locale.

---

## 3. OPTIMISATION DU GRIOT STUDIO (Création de contenu)

### 3.1 Préchargement des Assets VFX
**Problème** : Les effets visuels sont chargés pendant la génération.

**Solution** : Précharger les flares et particles dès l'ouverture du studio.

### 3.2 Optimisation de la Génération
**Problème** : L'Edge Function génère les images une par une.

**Solution** : 
- Prioriser les images de la bibliothèque (score >= 5)
- Afficher un placeholder animé pendant le chargement
- Générer les images en parallèle (déjà optimisé)

### 3.3 Canvas Rendering Performance
**Problème** : Le `GriotAnimationEngine` peut être lent sur appareils bas de gamme.

**Solution** : Utiliser les paramètres de `useDevicePerformance` déjà implémentés.

```text
Tier Low:
- Resolution: 480x854, FPS: 15
- Effects: Minimal sparkles, no film grain

Tier Medium:
- Resolution: 720x1280, FPS: 24
- Effects: 8 sparkles, shadows

Tier High:
- Resolution: 1080x1920, FPS: 30
- Effects: Full VFX
```

---

## 4. OPTIMISATIONS GLOBALES

### 4.1 Mémoire et Object URLs
**Problème** : Les `URL.createObjectURL()` ne sont pas toujours révoqués.

**Solution** : Audit et cleanup systématique dans les useEffect cleanups.

**Fichiers concernés** :
- `useAnimeStoryGenerator.ts` (partiellement fait dans reset())
- `VinylRecorder.tsx`
- `TamTamSocial.tsx` (audio players)

### 4.2 Re-renders Inutiles
**Problème** : Certains composants re-render trop souvent.

**Solution** : 
- Utiliser `React.memo()` sur les composants de liste (AudioFeedCard, VideoFeedCard)
- Extraire les états locaux dans des sous-composants
- Utiliser `useCallback` pour les handlers (déjà fait en partie)

### 4.3 Animation Performance
**Problème** : Framer Motion peut être coûteux avec beaucoup d'éléments.

**Solution** :
- Utiliser `layout="position"` au lieu de `layout` complet
- Désactiver les animations sur appareils bas de gamme
- Utiliser `transform` au lieu de `left/top` pour les animations

### 4.4 IndexedDB Initialization
**Problème** : `IndexedDBService` s'initialise de façon synchrone.

**Solution** : Préinitialiser au démarrage de l'app (déjà lazy avec initPromise).

### 4.5 Edge Functions Timeout Protection
**Problème** : Les appels aux Edge Functions peuvent timeout silencieusement.

**Solution** : 
- Ajouter des timeouts côté client avec AbortController
- Afficher des messages d'erreur clairs
- Implémenter un retry automatique avec backoff

---

## 5. CORRECTIFS DE BUGS IDENTIFIÉS

### 5.1 Tailwind CDN Warning
**Problème** : Console affiche un warning sur cdn.tailwindcss.com

**Solution** : S'assurer que le CDN n'est pas utilisé en production (vérifier index.html).

### 5.2 Realtime Subscriptions Cleanup
**Problème** : Potentielles fuites de subscriptions realtime.

**Solution** : Vérifier que tous les channels sont correctement supprimés.

### 5.3 Safe Area Handling
**Problème** : Certains éléments peuvent être masqués sur iPhone avec encoche.

**Solution** : Vérifier l'utilisation cohérente de `env(safe-area-inset-*)`.

---

## FICHIERS À MODIFIER

| Fichier | Optimisation | Priorité |
|---------|--------------|----------|
| `src/App.tsx` | Lazy loading routes | HAUTE |
| `src/pages/tamtam/TamTamSocial.tsx` | Virtualisation feed, memo components | HAUTE |
| `src/components/griot-studio/GriotStudio.tsx` | Préchargement VFX | MOYENNE |
| `src/hooks/useVideoFeed.ts` | Pagination + cache | MOYENNE |
| `src/hooks/useTamTamPosts.ts` | Optimisation queries | MOYENNE |
| `src/engines/GriotAnimationEngine.ts` | Performance tier adaptive | MOYENNE |
| `src/index.css` | Réduire les animations coûteuses | BASSE |
| `index.html` | Preload fonts critiques | BASSE |

---

## MÉTRIQUES CIBLES

| Métrique | Actuel (estimé) | Cible |
|----------|-----------------|-------|
| First Contentful Paint | ~2-3s | < 1.5s |
| Time to Interactive | ~4-5s | < 2.5s |
| Bundle Size (initial) | ~800KB | < 400KB |
| Memory Usage (feed) | ~200MB | < 100MB |
| FPS (animations) | Variable | 30 stable |

---

## ORDRE D'IMPLÉMENTATION

1. **Phase 1 - Quick Wins** (Impact immédiat)
   - Lazy loading des routes
   - Memo sur les composants de feed
   - Cleanup des Object URLs

2. **Phase 2 - Feed Optimization**
   - Virtualisation du feed
   - Pagination intelligente
   - Préchargement des thumbnails

3. **Phase 3 - Studio Performance**
   - Adaptive quality basé sur device tier
   - Préchargement VFX
   - Canvas optimizations

4. **Phase 4 - Polish**
   - Animation optimizations
   - Edge function resilience
   - Error boundaries
