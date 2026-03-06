

## Plan: Optimisation complète de la page Profil

### Diagnostic des problemes identifies (capture d'ecran)

1. **Posts affiches avec images cassees** : La grille montre 3 posts avec des icones d'image cassee (broken image). Le composant `MyPostsGrid` utilise `post.thumbnail_url || post.media_url` comme `<img src>` mais ne gere pas les cas ou l'URL est invalide ou ou le media est une video (qui necessite un element `<video>` et non `<img>`).

2. **Statistiques potentiellement incorrectes** : Les compteurs Followers/Follow/Likes affichent 0. Les stats viennent de `useTamTamFollows` qui fait des requetes separees pour followers et following. Le `likesCount` est calcule cote client en sommant `myPosts.likes_count` — correct mais depend de la completude des donnees.

3. **Posts non jouables depuis le portfolio** : `MyPostViewerOverlay` a deja ete corrige (muted/playsInline) mais le `handlePlayPost` dans `TamTamProfile.tsx` (ligne 259-265) cree un `new Audio()` sans gerer les videos — il faut utiliser le viewer overlay systematiquement.

4. **Performance** : Trop de requetes paralleles au chargement (profile, follows, friends, posts, communities, stories). Pas de memoisation.

---

### Corrections planifiees

#### 1. MyPostsGrid — Affichage correct des medias (photos ET videos)

- Detecter le type de media via `post.media_type` et regex sur l'extension
- Pour les videos : afficher un `<video>` avec `poster={post.thumbnail_url}` au lieu d'un `<img>` avec src video
- Pour les images : garder `<img>` avec fallback `onError` vers le placeholder emoji
- Ajouter un badge duree sur les videos, et un badge type media (photo/video/audio)

#### 2. MyPostViewerOverlay — Lecture fiable + description du post

- Afficher la description du post (`transcript_fr || transcript_ba`) dans la barre du bas
- Desactiver `muted` apres le premier play pour que l'audio de la video soit audible
- Ajouter `shares_count` dans les stats affichees

#### 3. MyPostsGrid — Stats reelles par post

- Afficher `shares_count` en plus de likes et comments dans l'overlay stats de chaque post
- Les stats sont deja chargees depuis la table `tamtam_posts` via `useMyPosts`

#### 4. KuaishouProfileHeader — Stats fiables

- Les stats `followersCount` et `followingCount` viennent de `useTamTamFollows` qui compte `followers.length` / `following.length` — c'est correct mais limite a 1000 par defaut de Supabase
- Ajouter un count direct depuis `tamtam_profiles.followers_count` / `following_count` comme source alternative (ces colonnes existent deja dans la table)
- Pour `likesCount` : utiliser la somme des likes de tous les posts (deja fait)

#### 5. TamTamProfile — Performance et fluidite

- Remplacer `handlePlayPost` (qui cree un Audio brut) par l'ouverture directe du viewer overlay
- Memoiser les composants enfants couteux avec `React.memo`
- Lazy-load l'onglet Stats et Communities

---

### Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `src/components/tamtam/MyPostsGrid.tsx` | Detection media type, video thumbnail, fallback image, badge video |
| `src/components/tamtam/MyPostViewerOverlay.tsx` | Afficher description, unmute apres play, shares_count |
| `src/pages/tamtam/TamTamProfile.tsx` | Utiliser profile.followers_count, supprimer handlePlayPost brut, optimisation |
| `src/hooks/useTamTamFollows.ts` | Optionnel: utiliser count du profil en fallback |

