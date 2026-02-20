
# Analyse et Stabilisation Complete de la Plateforme FITILA

## Bugs Critiques Identifies

### 1. `super-ia-create` : `getClaims()` incompatible
La methode `auth.getClaims(token)` utilisee dans `supabase/functions/super-ia-create/index.ts` (ligne 251) n'existe pas dans la version `supabase-js@2` utilisee par les Edge Functions. Le Super IA ne peut pas fonctionner actuellement.

**Correction** : Remplacer par `auth.getUser(token)` qui est la methode standard pour valider un JWT et extraire le user ID.

### 2. `usePostInteractions` : Requetes N+1 par carte
Chaque carte dans le feed (`AudioFeedCard`, `VideoFeedCard`) instancie `usePostInteractions` qui declenche **4 requetes DB paralleles** (reactions, bookmarks, likes count, shares count) + 1 pour follow. Avec 5 posts visibles, ca fait 25 requetes a chaque scroll.

**Correction** : Ajouter un cache local (Map/Ref) pour eviter les refetch quand le meme postId est deja charge, et optimiser les comptes likes/shares en reutilisant les donnees deja presentes dans `useTamTamPosts`.

### 3. Code duplique AudioFeedCard
Le composant `AudioFeedCard` existe en DOUBLE :
- Dans `src/components/feed/AudioFeedCard.tsx` (version memoized)
- Inline dans `src/pages/tamtam/TamTamSocial.tsx` (lignes 445-860)

Le feed `TamTamSocial` utilise la version inline (non-memoized), pas le composant optimise.

**Correction** : Supprimer la version inline de `TamTamSocial.tsx` et utiliser l'import depuis `src/components/feed/AudioFeedCard.tsx`.

### 4. Fuite memoire SpeechRecognition
Dans les deux versions d'`AudioFeedCard`, la reconnaissance vocale (`webkitSpeechRecognition`) est demarree pour chaque audio sans transcript mais n'a pas de cleanup fiable au unmount dans la version inline.

**Correction** : S'assurer que le composant memoized (qui a le cleanup) est utilise partout.

### 5. `useEffect` avec dependency manquante dans FitilaApp
Ligne 308 : `useEffect` ferme le menu au changement de route mais a `isMenuOpen` dans le closure sans le declarer comme dependance, ce qui genere un warning React.

**Correction** : Utiliser un ref pour le check ou ajouter la dependance avec un guard.

## Optimisations de Performance

### 6. Virtualization du feed : Placeholders sans hauteur fixe
Les placeholders non-rendus (`<div className="h-[100dvh] snap-start snap-always" />`) utilisent `h-[100dvh]` qui peut varier avec la barre d'adresse mobile, causant des sauts de scroll.

**Correction** : Uniformiser avec `h-screen` et `style={{ height: '100vh' }}` pour les placeholders.

### 7. Animations Framer Motion excessives
Les emojis decoratifs (3 par carte, animation infinie `repeat: Infinity`) et les barres d'ondes (28 barres avec animation individuelle) consomment du CPU meme quand la carte n'est pas active.

**Correction** : Conditionner les animations `repeat: Infinity` a `isActive` pour ne les jouer que sur la carte visible.

### 8. `useTamTamPosts` : double fetch a la publication
Apres `createPost`, le hook appelle `fetchPosts()` en interne, puis `TamTamSocial` appelle aussi `fetchPosts()` (ligne 1260), doublant la requete.

**Correction** : Supprimer l'appel en double dans `TamTamSocial`.

## Corrections de Stabilite

### 9. `useVideoFeed` FK join potentiellement fragile
Le join `tamtam_profiles!videos_user_id_fkey` suppose que `videos.user_id` a un FK vers `tamtam_profiles.user_id`, ce qui est confirme. Mais les videos sans `user_id` (NULL) feront echouer le join silencieusement.

**Correction** : Gerer le cas `tamtam_profiles: null` dans le mapping (deja fait partiellement, mais ajouter une protection explicite).

### 10. Admin floating button z-index conflit
Le bouton admin est a `z-[200]` et le modal Super IA a `z-[300]`, mais le side menu de FitilaApp est a `z-[100/101]`. Risque de superposition avec d'autres modals du systeme (FullscreenCreator, comments modal).

**Correction** : Harmoniser les z-index avec un systeme centralise.

## Section Technique - Plan d'Implementation

```text
Fichiers modifies (par priorite) :

1. supabase/functions/super-ia-create/index.ts
   - Remplacer getClaims() par getUser() (CRITIQUE)
   
2. src/pages/tamtam/TamTamSocial.tsx
   - Supprimer AudioFeedCard inline (lignes 332-860)
   - Importer depuis src/components/feed/AudioFeedCard.tsx
   - Supprimer le double fetchPosts() apres createPost
   - Conditionner animations decoratives a isActive
   - Fixer dependency useEffect menu
   
3. src/components/feed/AudioFeedCard.tsx
   - Adapter les props pour compatibilite avec TamTamSocial
   - S'assurer du cleanup SpeechRecognition
   
4. src/hooks/usePostInteractions.ts
   - Ajouter cache ref pour eviter refetch du meme postId
   - Reutiliser likes_count du post au lieu de recompter

5. Deploiement super-ia-create corrige
```

### Estimation
- 4 fichiers a modifier
- 1 edge function a redeployer
- Environ 400 lignes supprimees (code duplique)
- Impact : meilleure stabilite, -60% requetes DB sur le feed, Super IA fonctionnel
