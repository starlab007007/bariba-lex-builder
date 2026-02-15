

# Corriger le feed audio (Patrimoine et Voix du Village) -- Toutes les fonctionnalites

## Problemes identifies

1. **Pas de son / audio impossible a jouer** : Les 4 posts existants ont `audio_url: NULL` (crees avant l'ajout de la logique d'upload). L'element `<audio>` n'a pas de source et ne peut rien jouer.

2. **Like, Sauvegarder, Suivre ne persistent pas** : Le composant `AudioFeedCard` utilise un etat local (`useState`) pour toutes les interactions. Rien n'est envoye a la base de donnees. Le hook `usePostInteractions` (qui gere la persistance) n'est pas utilise.

3. **Partager et Liker ne sont pas connectes** : Le parent (`TamTamSocial`) passe seulement `onComment` a `AudioFeedCard`, mais les props `onLike` et `onShare` sont requises par l'interface mais jamais fournies.

4. **Pas de profil auteur** : L'avatar est un emoji statique `👤`, pas de nom d'utilisateur, pas de navigation vers le profil de l'auteur. Le `VideoFeedCard` affiche le vrai avatar, le `@username` et la date.

5. **Pas de gestion de l'absence d'audio** : Si `audio_url` est null, aucun message n'indique que l'audio est manquant.

## Corrections

### 1. Refondre `AudioFeedCard` (src/components/feed/AudioFeedCard.tsx)

Aligner sur le meme modele que `VideoFeedCard` :

- **Integrer `usePostInteractions`** : Remplacer tous les `useState` locaux (isLiked, isSaved, isFollowing) par le hook `usePostInteractions(post.id, authorId)` qui gere la persistance en base de donnees et les gardes d'authentification.

- **Afficher les informations de l'auteur** : Extraire `profile.display_name`, `profile.username`, `profile.avatar_url` du post (meme logique que VideoFeedCard). Afficher le vrai avatar, le `@username` et la date en bas a gauche.

- **Navigation vers le profil** : Cliquer sur l'avatar ou le nom navigue vers `/fitila/profile/{authorId}`.

- **Supprimer les props `onLike` et `onShare`** de l'interface : Les gerer en interne via `usePostInteractions` (comme le fait deja partiellement le composant). Garder uniquement `onComment` comme callback externe.

- **Gestion audio manquant** : Si `audio_url` est null ou vide, afficher un indicateur visuel ("Audio non disponible") et desactiver les controles de lecture.

### 2. Mettre a jour l'appel dans `TamTamSocial.tsx` (ligne 1172-1178)

Supprimer les props `onLike` et `onShare` qui ne sont plus necessaires (geres en interne par `usePostInteractions`).

## Details techniques

### AudioFeedCard.tsx -- Nouveautes principales

```text
// Imports ajoutes
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { useNavigate } from 'react-router-dom';

// Extraction des donnees auteur (meme logique que VideoFeedCard)
const authorName = post.profile?.display_name || 'Utilisateur';
const authorUsername = post.profile?.username ? `@${post.profile.username}` : '@fitila_user';
const avatarUrl = post.profile?.avatar_url;
const authorId = post.profile?.user_id || post.user_id;

// Hook d'interactions persistantes
const {
  isLiked, likesCount, toggleLike,
  isBookmarked, toggleBookmark,
  sharesCount, sharePost,
  isFollowing, toggleFollow,
} = usePostInteractions(post.id, authorId);

// Navigation vers profil
const handleProfileClick = () => {
  if (authorId) navigate(`/fitila/profile/${authorId}`);
};

// Gestion audio manquant
const hasAudio = post.audio_url && post.audio_url.trim().length > 0;
```

### Interface simplifiee

```text
interface AudioFeedCardProps {
  post: any;
  isActive: boolean;
  onComment: () => void;
  category: 'patrimoine' | 'mavoix';
}
```

### Section auteur (en bas a gauche, remplace le simple emoji)

Affichera le vrai avatar, `@username`, et la date de publication -- meme disposition que VideoFeedCard.

### Section sidebar droite

Les boutons Like, Comment, Partager, Sauvegarder utiliseront les fonctions de `usePostInteractions` (`toggleLike`, `toggleBookmark`, `sharePost`, `toggleFollow`) au lieu de l'etat local.

### Audio manquant

Si `hasAudio` est false, le disque vinyle affichera un petit badge "Pas d'audio" et les boutons play/skip seront desactives.

## Fichiers a modifier

1. **`src/components/feed/AudioFeedCard.tsx`** : Refonte complete (interactions, auteur, gestion audio)
2. **`src/pages/tamtam/TamTamSocial.tsx`** : Supprimer `onLike`/`onShare` de l'appel AudioFeedCard (lignes 1172-1178)

