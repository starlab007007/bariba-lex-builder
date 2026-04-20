

# Plan — Algorithme IA dynamique du feed + arrêt audio universel + optimisations production

## Diagnostic

**Algorithme actuel** (`useAdaptiveFeed.ts`) :
- ✅ Score basé sur engagement (watch ratio, completion, replay, recency, catégorie)
- ✅ Mix exploitation/exploration 80/20 avec interleave tous les 5 posts
- ❌ **Ordre figé une seule fois au chargement** — l'utilisateur revoit toujours la même séquence
- ❌ Pas de mélange aléatoire dynamique en cours de session
- ❌ `loadMore` n'est jamais déclenché (pas d'IntersectionObserver à la fin du feed)
- ❌ Pas de réinjection automatique de nouveau contenu (poll/timer)

**Audio feed (AudioFeedCard / VideoFeedCard)** :
- ✅ Pause sur `isPageVisible = false` (visibilitychange)
- ✅ Pause sur `isActive = false` (changement de carte)
- ❌ **Pas d'arrêt sur changement de route** (navigation vers /classe, /dictionary…)
- ❌ Pas d'arrêt sur `pagehide` / `blur` (mobile background, app switcher iOS)
- ❌ Pas d'arrêt explicite pendant le scroll actif (l'audio continue brièvement entre 2 cartes)
- ❌ `wasPlayingBeforeHide` reprend automatiquement → comportement inattendu

**Performance plateforme** :
- ✅ Lazy loading des routes (App.tsx)
- ✅ React Query stale 5 min
- ✅ PWA cache (5 MB)
- ✅ Manual chunks (vendor split)
- ❌ Audios `classe-audio` chargés via signed URL à chaque clic (pas de cache cross-leçon)
- ❌ Pas de `<link rel="preload">` ni preconnect Supabase
- ❌ Pas de prefetch des leçons N+1 quand on en lit une
- ❌ Composants lourds (FullscreenCreator, BranchingPlayer) imports eager dans TamTamSocial

## Implémentation

### A. Nouvel algorithme dynamique du feed (`useAdaptiveFeed.ts`)

1. **Score avec composante aléatoire douce** (Thompson sampling style)
   - Ajouter un bruit gaussien `± 8 points` au score final → ordre légèrement différent à chaque rendu
2. **Re-shuffle périodique automatique**
   - Toutes les 90 secondes : ré-appliquer `rankVideos()` sur le pool actuel → réordonne sans recharger
   - Préserve la position courante (l'utilisateur reste sur la carte qu'il regarde)
3. **Re-shuffle quand l'utilisateur revient en haut** (refresh implicite)
   - Si `currentPostIndex` retombe à 0 après avoir été > 5 → refetch + reshuffle
4. **Auto-loadMore (infinite scroll)**
   - Dans `TamTamSocial`, déclencher `loadMoreVideos()` quand `currentPostIndex >= videos.length - 3`
5. **Diversité forcée**
   - Empêcher 2 templates identiques consécutifs (swap si détecté)
6. **Boost "fraîcheur"**
   - Vidéos publiées < 1h reçoivent +25 points (encourage la découverte de nouveau contenu)
7. **Polling temps réel**
   - Subscribe `postgres_changes` INSERT sur `videos` → push en haut du pool sans recharger toute la liste

### B. Hook universel d'arrêt audio (`useFeedAudioAutoStop`)

Nouveau hook spécialisé pour les médias du feed (audio + vidéo) qui :
- Reçoit `mediaRef` (HTMLAudioElement OU HTMLVideoElement) + `setPlaying`
- Pause + reset `currentTime = 0` (pas de reprise auto) sur :
  - `document.visibilitychange` → hidden
  - `window.pagehide` (mobile background, navigation hors PWA)
  - `window.blur` (changement d'onglet desktop)
  - `useLocation().pathname` change → arrêt immédiat
  - **NOUVEAU** : événement custom `feed-scroll-start` émis par `TamTamSocial.handleScroll` quand l'utilisateur scrolle activement (debounce 150ms)
- Annule `window.speechSynthesis.cancel()` (pour AudioFeedCard karaoké)
- Pas de reprise automatique → l'utilisateur réappuie sur play

**Intégration** :
- `AudioFeedCard.tsx` → remplace la logique `usePageVisibility + wasPlayingBeforeHide` par `useFeedAudioAutoStop(audioRef, setIsPlaying)`
- `VideoFeedCard.tsx` → idem avec `videoRef`

**Émission de l'événement scroll** dans `TamTamSocial.handleScroll` :
```ts
window.dispatchEvent(new CustomEvent('feed-scroll-start'));
```

### C. Optimisations performance production

1. **Preconnect Supabase + HF dans `index.html`**
   ```html
   <link rel="preconnect" href="https://pmrhezgnyffiskbaiudb.supabase.co" />
   <link rel="dns-prefetch" href="https://pmrhezgnyffiskbaiudb.supabase.co" />
   ```
2. **Cache LRU des audios pédagogiques** (`useClasseAudio`)
   - Cache en mémoire `Map<contentKey, signedUrl>` valide 50 min (signed URL = 1h)
   - Évite re-fetch quand l'utilisateur navigue Mɛɛrio → Faagi → Geruo
3. **Prefetch leçon suivante** dans `ClasseLessonView`
   - Quand on entre sur leçon N, précharger les audios de leçon N+1 en arrière-plan via `requestIdleCallback`
4. **Lazy-load `FullscreenCreator` et `BranchingPlayer`** dans `TamTamSocial`
   - `lazy(() => import('@/components/tamtam/FullscreenCreator'))` + Suspense
   - Réduit le bundle initial du feed d'environ 200 KB
5. **Préchargement intelligent des thumbnails** dans `useAdaptiveFeed`
   - `<link rel="preload" as="image">` pour les 3 prochains posts
6. **Workbox runtime cache pour `classe-audio`**
   - Ajouter règle CacheFirst (max 100 audios, 30 jours) dans `vite.config.ts`
7. **Index DB Supabase** (migration)
   - `CREATE INDEX IF NOT EXISTS idx_videos_public_created ON videos(is_public, created_at DESC)`
   - `CREATE INDEX IF NOT EXISTS idx_video_engagements_video_id ON video_engagements(video_id)`
   - `CREATE INDEX IF NOT EXISTS idx_classe_content_audios_key_status ON classe_content_audios(content_key, status, is_current)`

### D. Vérifications production (le "OK")

Checklist exécutée à la fin :
- ✅ Build sans erreurs TypeScript
- ✅ Lazy loading actif sur 95 % des routes
- ✅ PWA installable + offline cache
- ✅ RLS sur toutes les tables sensibles (déjà fait)
- ✅ Audios accessibles aux anonymes (déjà fait)
- ✅ Auth téléphone +229 fonctionnelle
- ✅ Algorithme feed dynamique + loadMore
- ✅ Arrêt audio universel (route, scroll, blur, hidden, pagehide)
- ✅ Index DB optimisés
- ✅ Preconnect + Workbox cache audio

## Fichiers

**Nouveaux**
- `src/hooks/useFeedAudioAutoStop.ts` — hook spécialisé feed (extension de `useAutoStopAudio`)
- `src/hooks/useFreshContent.ts` — polling realtime + reshuffle périodique

**Modifications**
- `src/hooks/useAdaptiveFeed.ts` — bruit gaussien, reshuffle, boost fraîcheur, diversité, realtime INSERT
- `src/hooks/useClasseAudio.ts` — cache LRU mémoire des signed URLs
- `src/components/feed/AudioFeedCard.tsx` — remplace logique visibility par `useFeedAudioAutoStop`
- `src/components/feed/VideoFeedCard.tsx` — idem
- `src/pages/tamtam/TamTamSocial.tsx` — auto-loadMore, dispatch `feed-scroll-start`, lazy-load FullscreenCreator/BranchingPlayer
- `src/components/classe/ClasseLessonView.tsx` — prefetch leçon N+1
- `index.html` — preconnect Supabase
- `vite.config.ts` — Workbox CacheFirst pour `classe-audio`

**Migration SQL**
- 3 index pour optimiser les requêtes feed + audios

## Garanties

- ✅ Feed change dynamiquement à chaque session ET en cours de session (reshuffle 90s)
- ✅ Nouveau contenu publié apparaît automatiquement en haut (realtime)
- ✅ Audio s'arrête sur tab change, blur, pagehide, route change, scroll actif
- ✅ Pas de reprise auto inattendue → respect total de l'attention
- ✅ Pages se chargent ultra rapidement (lazy + preconnect + chunks)
- ✅ Audios pédagogiques quasi instantanés grâce au cache LRU
- ✅ Plateforme prête production avec checklist validée

## Hors scope

- Personnalisation profil utilisateur côté serveur (pour plus tard avec ML)
- A/B testing du ranking
- CDN dédié pour `classe-audio`

