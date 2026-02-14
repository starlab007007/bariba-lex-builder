
# Finalisation des interactions sociales (Like, Commentaire, Favoris, Partage, Follow, Profil)

## Diagnostic

Les boutons d'action (coeur, commentaire, favoris, partage, follow, profil auteur) sont presents visuellement mais ne sont pas connectes de bout en bout a la base de donnees. Voici l'etat actuel :

| Bouton | Etat actuel | Probleme |
|--------|------------|----------|
| Coeur (Like) | `addReaction` existe dans `useTamTamPosts` mais l'etat local (`isLiked`) n'est pas synchronise avec la DB | Le coeur se reinitialise a chaque scroll |
| Commentaire | `fetchComments` et `addComment` existent | Modal de commentaire ne permet pas d'ajouter de commentaire (onAddComment est vide `async () => {}`) |
| Favoris (Bookmark) | Seulement un `useState` local | Aucun appel a `tamtam_bookmarks` |
| Partage | Seulement `navigator.share` | Aucun enregistrement dans `tamtam_shares` |
| Follow (+) | Seulement un `useState` local | Aucun appel a `tamtam_follows` |
| Profil auteur | Navigate vers `/fitila/profile/:id` | Route incorrecte, devrait etre `/fitila/user/:id` |

Les tables `tamtam_reactions`, `tamtam_bookmarks`, `tamtam_shares`, `tamtam_follows`, `tamtam_comments` existent deja avec des politiques RLS correctes.

---

## Plan de correction

### 1. Creer un hook centralise `usePostInteractions`

**Nouveau fichier** : `src/hooks/usePostInteractions.ts`

Ce hook gere toutes les interactions pour un post donne :
- **Like** : Verifie si l'utilisateur a deja like via `tamtam_reactions`, toggle le like
- **Bookmark** : Verifie si le post est enregistre via `tamtam_bookmarks`, toggle le bookmark
- **Share** : Enregistre dans `tamtam_shares` + `navigator.share`
- **Follow** : Verifie si l'utilisateur suit l'auteur via `tamtam_follows`, toggle le follow

```text
usePostInteractions(postId, authorId) => {
  isLiked, likesCount, toggleLike,
  isBookmarked, toggleBookmark,
  sharesCount, sharePost,
  isFollowing, toggleFollow
}
```

### 2. Modifier `VideoFeedCard` dans `TamTamSocial.tsx`

- Remplacer les `useState` locaux (`isLiked`, `isSaved`, `isFollowing`) par le hook `usePostInteractions`
- Connecter chaque bouton aux fonctions du hook
- Les compteurs se mettent a jour en temps reel depuis la DB

### 3. Corriger la modal de commentaires

Dans `TamTamSocial.tsx` ligne 1213 :
```text
// AVANT
onAddComment={async () => {}}

// APRES  
onAddComment={async (commentData) => {
  await addComment(commentsModal.postId, commentData);
  // Refresh comments
  const updated = await fetchComments(commentsModal.postId);
  setCommentsModal(prev => ({ ...prev, comments: updated }));
}}
```

### 4. Corriger la navigation vers le profil auteur

Dans `VideoFeedCard` et `AudioFeedCard` :
```text
// AVANT
navigate(`/fitila/profile/${authorId}`)

// APRES
navigate(`/fitila/user/${authorId}`)
```

### 5. Ajouter la route `/fitila/profile/:userId`

Dans `App.tsx`, ajouter une route supplementaire pour gerer les deux formats d'URL :
```text
<Route path="profile/:userId" element={<TamTamPublicProfile />} />
```

### 6. Enrichir le profil public (`TamTamPublicProfile.tsx`)

- Rendre les posts cliquables pour visualiser la video/photo en plein ecran
- Ajouter un mini-lecteur video/audio dans un overlay quand on clique sur un post
- Afficher les videos du user depuis la table `videos` en plus de `tamtam_posts`

### 7. Appliquer les memes corrections dans `TamTamVideoFeed.tsx`

Le composant `TamTamVideoFeed.tsx` a aussi des boutons non connectes. Appliquer le meme hook `usePostInteractions`.

---

## Details techniques

### Hook `usePostInteractions`

```text
// Charge l'etat initial depuis la DB
useEffect => {
  // Check like: SELECT FROM tamtam_reactions WHERE post_id AND user_id
  // Check bookmark: SELECT FROM tamtam_bookmarks WHERE post_id AND user_id
  // Check follow: SELECT FROM tamtam_follows WHERE follower_id AND following_id
  // Count likes: SELECT count FROM tamtam_reactions WHERE post_id
  // Count shares: SELECT count FROM tamtam_shares WHERE post_id
}

toggleLike => {
  if liked: DELETE FROM tamtam_reactions
  else: INSERT INTO tamtam_reactions
}

toggleBookmark => {
  if bookmarked: DELETE FROM tamtam_bookmarks
  else: INSERT INTO tamtam_bookmarks
}

sharePost => {
  INSERT INTO tamtam_shares
  navigator.share || clipboard
}

toggleFollow => {
  if following: DELETE FROM tamtam_follows
  else: INSERT INTO tamtam_follows
}
```

### Visualisation des posts dans le profil public

Quand on clique sur un post dans la grille du profil :
- Ouvrir un overlay fullscreen avec la video/photo
- Boutons d'action (like, comment, share) dans l'overlay
- Swipe vertical pour naviguer entre les posts du meme auteur

---

## Fichiers modifies/crees

| Fichier | Action |
|---------|--------|
| `src/hooks/usePostInteractions.ts` | **Nouveau** - Hook centralise pour like, bookmark, share, follow |
| `src/pages/tamtam/TamTamSocial.tsx` | Modifier VideoFeedCard et AudioFeedCard pour utiliser le hook, corriger onAddComment, corriger navigation profil |
| `src/components/tamtam/TamTamVideoFeed.tsx` | Connecter les boutons au hook usePostInteractions |
| `src/pages/tamtam/TamTamPublicProfile.tsx` | Ajouter visualisation des posts, charger videos depuis table `videos` |
| `src/App.tsx` | Ajouter route `profile/:userId` |
| `src/components/feed/VideoFeedCard.tsx` | Corriger navigation profil vers `/fitila/user/` |
