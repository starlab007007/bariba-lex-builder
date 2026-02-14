
# Isoler les feeds, corriger les topics, et ajouter les gardes d'authentification

## Probleme 1 : Les publications ne sont pas correctement isolees dans leurs feeds respectifs

### Diagnostic
- **Publications Patrimoine/Voix du Village** : `TamTamCreatePost.handleSubmit` envoie `category: selectedTemplate.category` (soit `'patrimoine'` ou `'village_voice'`). Mais dans `TamTamSocial.handleCreatePost`, le `topic` est ecrase par `createPostType` qui vaut `'patrimoine'` ou `'mavoix'` (pas `'village_voice'`).
- **Filtrage patrimoine** (lignes 1055-1076) : Le fallback montre TOUS les posts audio quand aucun post specifique n'est trouve, melangeant les feeds.
- **Filtrage mavoix** (lignes 1081-1100) : Meme fallback problematique, montre tous les posts audio.
- **Feed creation** (lignes 1104-1118) : Inclut tous les posts video/photo sans verifier le `topic`, ce qui pourrait inclure des posts patrimoine avec media.
- **Videos table** : Tous les videos de la table `videos` sont mappes avec `topic: 'creation'` en dur (ligne 1028), ce qui est correct pour cette table.

### Corrections
**Fichier `src/pages/tamtam/TamTamSocial.tsx` :**
- Dans `handleCreatePost` : mapper correctement `topic` depuis les donnees du template. Si `data.category === 'village_voice'`, mettre `topic: 'mavoix'`. Si `data.category === 'patrimoine'`, mettre `topic: 'patrimoine'`.
- Supprimer les fallbacks dans `getCurrentPosts` qui montrent TOUS les posts audio quand aucun post specifique n'est trouve. Si un feed est vide, il doit rester vide (l'ecran "Aucun contenu" s'affiche deja).
- Dans le filtre `creation` : exclure les posts dont le `topic` est `'patrimoine'` ou `'mavoix'`.

## Probleme 2 : Pas de garde d'authentification sur les interactions

### Diagnostic
- `usePostInteractions` : `toggleLike`, `toggleBookmark`, `sharePost`, `toggleFollow` font un `return` silencieux si `!currentUserId`. Aucun message d'erreur.
- Commentaires : Le modal de commentaires verifie `userData?.user` mais sans message clair.
- Publication : `useTamTamPosts.createPost` a deja un message "Connexion requise", c'est bon.

### Corrections
**Fichier `src/hooks/usePostInteractions.ts` :**
- Importer `useToast` et ajouter un message d'erreur clair dans chaque action quand l'utilisateur n'est pas connecte :
  - `toggleLike` : "Connectez-vous pour aimer cette publication"
  - `toggleBookmark` : "Connectez-vous pour sauvegarder cette publication"
  - `sharePost` : le partage natif (copier le lien) peut rester sans auth, mais l'enregistrement en DB necessite auth : "Connectez-vous pour partager"
  - `toggleFollow` : "Connectez-vous pour suivre cet utilisateur"

**Fichier `src/pages/tamtam/TamTamSocial.tsx` :**
- Dans le handler de commentaires (ligne 1208-1221) : ajouter un message clair "Connectez-vous pour commenter" avant le `return` si `!userData?.user`.
- Dans `handleCreatePost` : le guard existe deja dans `createPost`, mais ajouter un toast visible "Connectez-vous pour publier" au niveau du Social aussi.
- Dans `CreateMenu` : avant d'ouvrir la creation, verifier l'auth et afficher un message si non connecte.

## Probleme 3 : Chaque publication a son auteur

### Diagnostic
- `useTamTamPosts.createPost` assigne deja `user_id: userData.user.id` (ligne 281).
- `useVideoPublish` assigne `user_id: userId` (ligne 113).
- Les profils sont joints via `tamtam_profiles` dans les requetes de fetch.
- Ceci est deja correct.

## Resume des fichiers a modifier

1. **`src/pages/tamtam/TamTamSocial.tsx`** :
   - Corriger le mapping `topic` dans `handleCreatePost` pour utiliser `data.category`
   - Supprimer les fallbacks dans `getCurrentPosts` (patrimoine et mavoix)
   - Filtrer les posts creation pour exclure `topic === 'patrimoine'` et `topic === 'mavoix'`
   - Ajouter garde auth avant ouverture des menus de creation
   - Ajouter message d'erreur auth dans le handler de commentaires

2. **`src/hooks/usePostInteractions.ts`** :
   - Importer `useToast`
   - Ajouter des messages toast clairs pour chaque action quand l'utilisateur n'est pas connecte (like, bookmark, share, follow)

## Details techniques

### getCurrentPosts corrige (TamTamSocial.tsx)
```text
case 'patrimoine':
  return allPosts.filter(p => {
    const post = p as any;
    const hasAudio = post.audio_url && post.audio_url.trim().length > 0;
    return hasAudio && (
      post.topic === 'patrimoine' || 
      post.topic === 'culture' || 
      post.template_id?.includes('conte') ||
      post.template_id?.includes('chant') ||
      post.template_id?.includes('proverbe') ||
      (post.culture_score && post.culture_score > 0)
    );
  });

case 'mavoix':
  return allPosts.filter(p => {
    const post = p as any;
    const hasAudio = post.audio_url && post.audio_url.trim().length > 0;
    return hasAudio && (
      post.topic === 'mavoix' || 
      post.topic === 'annonce' ||
      post.topic === 'village_voice' ||
      post.template_id?.includes('annonce') ||
      post.template_id?.includes('question') ||
      post.template_id?.includes('merci')
    );
  });

case 'creation':
  const creationFromPosts = allPosts.filter(p => {
    const post = p as any;
    return (post.media_type === 'video' || post.media_type === 'photo') && 
           post.media_url && post.media_url.trim().length > 0 &&
           post.topic !== 'patrimoine' && post.topic !== 'mavoix';
  });
  // ... merge with videosAsVideoCards
```

### usePostInteractions.ts - gardes auth
```text
const toggleLike = useCallback(async () => {
  if (!currentUserId) {
    toast({ title: '🔐 Connexion requise', description: 'Connectez-vous pour aimer cette publication', variant: 'destructive' });
    return;
  }
  if (!postId) return;
  // ... reste du code
}, [...]);
```

### handleCreatePost corrige (TamTamSocial.tsx)
```text
const postData = {
  ...data,
  audio_url: data.audio_url || null,
  topic: data.category === 'village_voice' ? 'mavoix' : (data.category || createPostType),
};
```
