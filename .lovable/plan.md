

## Plan: Optimisation complète du profil et stabilité plateforme

### Problèmes identifiés

1. **Statistiques followers/following inexactes** : `useTamTamFollows` charge TOUS les followers/following en mémoire (`followers.length`), limité à 1000 par Supabase. Le profil utilise `profile?.followers_count ?? followersCount` mais les colonnes DB `followers_count`/`following_count` ne sont jamais incrémentées par les actions follow/unfollow.

2. **Likes count imprécis** : Calculé côté client via `myPosts.reduce(likes_count)` — correct mais les `likes_count` dans `tamtam_posts` ne sont jamais mis à jour quand des réactions sont ajoutées dans `tamtam_reactions`.

3. **Performance scroll** : `AnimatePresence mode="popLayout"` sur chaque post de la grille avec `transition={{ delay: index * 0.02 }}` crée des animations en cascade inutiles au scroll. Les hooks `useTamTamFollows`, `useTamTamFriends`, `useTamTamPosts`, `useTamTamCommunities` se lancent tous en parallèle au mount.

4. **Viewer overlay fonctionne** mais les vidéos démarrent `muted` sans possibilité de unmute automatique après interaction.

### Corrections planifiées

#### 1. Stats fiables via triggers DB (migration SQL)
- Créer un trigger sur `tamtam_follows` qui incrémente/décrémente `followers_count` et `following_count` dans `tamtam_profiles` à chaque INSERT/DELETE.
- Créer un trigger sur `tamtam_reactions` qui met à jour `likes_count` dans `tamtam_posts` à chaque INSERT/DELETE.
- Ainsi les stats du profil reflètent la réalité sans calculs client.

#### 2. useTamTamFollows — utiliser COUNT au lieu de charger toutes les lignes
- Remplacer les 2 `select('*')` par `select('*', { count: 'exact', head: true })` pour obtenir le count sans charger les données.
- Ne charger les profils complets que quand l'utilisateur ouvre la liste followers/following (lazy).

#### 3. Performance MyPostsGrid
- Supprimer `AnimatePresence mode="popLayout"` et le `delay: index * 0.02` qui crée du jank au scroll.
- Utiliser des animations simples CSS (`opacity` transition) au lieu de framer-motion pour chaque cellule de la grille.
- Ajouter `loading="lazy"` sur les vidéos du grid (déjà sur les images).

#### 4. Viewer — unmute après interaction
- Dans `MyPostViewerOverlay`, après le premier `togglePlay()` par l'utilisateur, automatiquement `setIsMuted(false)` sur la vidéo.

#### 5. TamTamProfile — lazy loading des onglets
- Ne charger `useTamTamCommunities` et `useTamTamFriends` que quand l'onglet correspondant est actif (conditionnel).
- Réduire les hooks initialisés au mount.

### Fichiers à modifier

| Fichier | Changement |
|---------|-----------|
| Migration SQL | Triggers `followers_count`, `following_count`, `likes_count` |
| `src/hooks/useTamTamFollows.ts` | COUNT exact au lieu de charger toutes les lignes |
| `src/components/tamtam/MyPostsGrid.tsx` | Supprimer animations en cascade, CSS transitions |
| `src/components/tamtam/MyPostViewerOverlay.tsx` | Auto-unmute après interaction utilisateur |
| `src/pages/tamtam/TamTamProfile.tsx` | Lazy-load hooks par onglet, stats from profile DB |

