# Diagnostic /fitila/profile (page blanche en production)

## Constat

Le code source actuel contient **déjà** tous les correctifs validés lors des tours précédents :

- `src/App.tsx` ligne 129 — la route est `<ProtectedRoute><SafeBoundary label="Profil"><TamTamProfile /></SafeBoundary></ProtectedRoute>`
- `src/pages/tamtam/TamTamProfile.tsx` — garde `if (!profile)` (ligne 347) + redirection conditionnée sur `authLoading` (ligne 130)
- `src/hooks/useTamTamProfile.ts` — auto-création de la ligne `tamtam_profiles` manquante + nom de channel Realtime unique (`Math.random()` suffix)
- `src/components/ProtectedRoute.tsx` — passe `?redirect=...` quand l'utilisateur est anonyme
- `src/contexts/AuthContext.tsx` — utilise `onAuthStateChange` + `getSession()` au montage

## Analyse des logs

- **Logs Auth (Supabase)** : ✅ Connexion phone token réussie pour l'utilisateur `d562a2ba…`, `request_id 019ed053…/user → 200`. L'auth fonctionne côté backend.
- **Logs DB** : 2 erreurs RLS/FK sans rapport (`video_engagements`), aucune erreur liée à `tamtam_profiles`.
- **Console client** (preview Lovable, équivalent du build prod) :
  - `[FITILA i18n] Failed to load translations: Failed to fetch` — non bloquant, le contexte met `translationsLoaded=true` même en erreur, `t()` retombe sur la clé.
  - `[VideoFeedCard] play() failed: NotAllowedError/AbortError` — sans impact sur /profile.
  - **Aucune erreur React, aucun crash sur /fitila/profile.**

## Cause la plus probable de la page blanche sur `https://fitila.bj/fitila/profile`

Les correctifs ne sont pas dans le bundle servi par `fitila.bj`. Le manifeste prod référence `assets/index-CxDBvgs0.js` et `assets/TamTamSocial-14fqku3V.js` — un build antérieur à l'ajout du `ProtectedRoute`, du `SafeBoundary` et du guard `!profile`. **Il faut re-déployer.**

En complément, il reste deux trous résiduels que le déploiement actuel ne couvre pas et qui peuvent provoquer un blanc total même après re-déploiement :

1. **Erreur au-dessus de `SafeBoundary`** — un crash dans `FitilaApp` (providers `FitilaLanguageProvider`, `AudioDescriptionProvider`, `AppTourProvider`, `SideMenuDrawer`, `AdminFloatingButton`) ou dans `ProtectedRoute` n'est attrapé par aucun boundary → l'arbre entier se démonte → blanc.
2. **Layout figé `fixed inset-0 overflow-hidden`** dans `AppContent` (ligne 348) : si `<Outlet/>` rend une page qui throw juste après le mount (mais après le premier render — donc avant que `SafeBoundary` ait monté son state), on peut voir un flash vide. Peu probable mais facile à blinder.

## Correctifs

### 1. Re-déployer la prod
Action manuelle côté plateforme (`https://fitila.bj`) : déclencher un nouveau build et déploiement depuis la dernière version Lovable. Sans cela, **les correctifs précédents n'atteignent pas l'utilisateur**.

### 2. `SafeBoundary` autour du layout `FitilaApp` (`src/pages/fitila/FitilaApp.tsx`)
Envelopper `<Outlet />` dans un `SafeBoundary label="Page Fitila">` afin qu'un crash dans n'importe quelle route enfant (`profile`, `social`, `learn`, …) affiche une carte d'erreur au lieu d'un blanc :

```tsx
<main className="w-full h-full overflow-hidden">
  <SafeBoundary label="Page Fitila">
    <Outlet />
  </SafeBoundary>
</main>
```

### 3. `SafeBoundary` racine dans `App.tsx`
Envelopper l'arbre `<Routes>` dans un dernier `SafeBoundary label="Application">` pour qu'aucun throw au niveau providers/router ne produise un écran blanc total.

### 4. Logger côté client les blancs réels
Dans `src/components/common/SafeBoundary.tsx`, ajouter un `console.error` structuré déjà présent + envoyer un `window.dispatchEvent(new CustomEvent('safe-boundary-error', {detail:{label, message}}))` pour faciliter le diagnostic prod via DevTools (sans nouveau service).

### 5. Vérifier la livraison du chunk `TamTamProfile`
Le bug fetch dynamique vu précédemment (`Failed to fetch dynamically imported module`) revient si le serveur statique `fitila.bj` purge mal son cache lors du rolling deploy. Ajouter dans `vite.config.ts` (s'il n'y est pas déjà) :

```ts
build: { rollupOptions: { output: { manualChunks: undefined } } }
```
ou conserver le chunking et s'assurer que la stratégie cache `nginx.conf` envoie `Cache-Control: no-cache` sur `index.html` (à vérifier dans `nginx.conf` du projet).

## Fichiers à modifier

- `src/pages/fitila/FitilaApp.tsx` — wrapper `SafeBoundary` autour de `<Outlet/>`
- `src/App.tsx` — wrapper `SafeBoundary` autour de `<Routes>`
- `src/components/common/SafeBoundary.tsx` — dispatch d'event pour télémétrie
- `nginx.conf` — vérifier `add_header Cache-Control "no-cache"` sur `index.html` (pas sur les chunks `assets/*`)

## Validation

1. Re-déployer fitila.bj puis ouvrir `https://fitila.bj/fitila/profile` non connecté → redirection vers `/fitila/auth?redirect=%2Ffitila%2Fprofile`.
2. Connecté avec un compte **sans** ligne `tamtam_profiles` → la ligne est créée à la volée, le profil s'affiche.
3. Forcer une erreur (ex. couper le réseau pendant le mount) → carte rouge `SafeBoundary` au lieu d'un blanc.
4. Vérifier dans l'inspecteur réseau que `index.html` répond `Cache-Control: no-cache` et que les `assets/*.js` répondent `Cache-Control: public, max-age=31536000, immutable`.
