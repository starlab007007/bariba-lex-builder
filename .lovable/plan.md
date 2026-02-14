
# Corrections et finalisations de la page Profil et du Feed

## 7 points a corriger

---

## 1. Bouton "Supprimer" dans le menu contextuel des posts ne fonctionne pas

**Diagnostic** : Dans `MyPostsGrid.tsx`, la fonction `handleDeleteClick` utilise un systeme de double-clic (confirmation) qui fonctionne correctement dans le code, mais le `onDelete` recu en props attend un `Promise<boolean>` tandis que `handleDeleteClick` n'attend pas le resultat. De plus, dans `TamTamProfile.tsx` le `handleDeletePost` est asynchrone et retourne un `Promise<boolean>`.

**Correction** : Modifier `handleDeleteClick` dans `MyPostsGrid.tsx` pour appeler `onDelete` correctement et attendre la completion. Ajouter un indicateur de chargement pendant la suppression.

**Fichier** : `src/components/tamtam/MyPostsGrid.tsx` - lignes 42-49

---

## 2. Afficher la photo de profil dans le menu lateral (bouton "Profil")

**Diagnostic** : Dans `FitilaApp.tsx`, le menu lateral affiche "Profil" avec un simple emoji generique. Il faut charger le profil utilisateur et afficher son avatar.

**Correction** : Dans `SideMenuDrawer` de `FitilaApp.tsx`, utiliser le hook `useTamTamProfile` pour recuperer l'avatar de l'utilisateur et l'afficher a cote du label "Profil" dans la navigation.

**Fichier** : `src/pages/fitila/FitilaApp.tsx` - modifier l'affichage du nav item "Profil" pour utiliser l'avatar reel

---

## 3. Remonter l'avatar et le nom d'utilisateur dans le feed + ajouter date de publication

**Diagnostic** : Dans `VideoFeedCard` de `TamTamSocial.tsx`, l'avatar et le `@username` en bas a gauche sont positionnes avec `paddingBottom: 'max(3.5rem, ...)'` mais peuvent etre coupes sur certains ecrans. Il manque aussi la date de publication.

**Corrections** :
- Augmenter legerement la position de l'avatar et du nom d'utilisateur
- Ajouter une ligne sous le nom avec la date de publication formatee

**Fichier** : `src/pages/tamtam/TamTamSocial.tsx` - zone bottom-left du VideoFeedCard (lignes 687-709)

---

## 4. Ajouter le mot "Suivre" a cote du "+" et masquer apres follow

**Diagnostic** : Dans `VideoFeedCard`, le bouton follow en bas de l'avatar (lignes 731-739) affiche seulement un "+" sans texte. Quand l'utilisateur est suivi, le bouton disparait deja (`!isFollowing && ...`), ce qui est correct.

**Correction** : Ajouter le texte "Suivre" a cote du signe "+" sous l'avatar dans la sidebar droite. Elargir legerement le bouton pour accueillir le texte.

**Fichier** : `src/pages/tamtam/TamTamSocial.tsx` - lignes 731-739

---

## 5. Le partage doit partager uniquement la publication

**Diagnostic** : La fonction `sharePost` du hook `usePostInteractions` utilise `navigator.share` avec le titre et l'URL de la page. C'est correct mais il faut s'assurer que le partage inclut le lien direct vers la publication et pas une page generique.

**Correction** : Modifier la fonction `sharePost` dans `usePostInteractions.ts` pour generer une URL specifique a la publication (`/fitila/social?video=POST_ID`) et partager cette URL. Aussi permettre le partage interne (dans le feed de l'utilisateur).

**Fichier** : `src/hooks/usePostInteractions.ts`

---

## 6. Permettre de voir la liste des followers, likes, et follows en cliquant sur les compteurs

**Diagnostic** : Dans `KuaishouProfileHeader.tsx`, les compteurs (Followers, Follow, Likes) sont affiches mais ne sont pas cliquables. L'utilisateur ne peut pas voir qui l'a suivi, ou qui il suit.

**Correction** : Ajouter des callbacks `onFollowersClick`, `onFollowingClick`, `onLikesClick` au composant `KuaishouProfileHeader` et les connecter dans `TamTamProfile.tsx` pour ouvrir les modals `TamTamFollowersList` existants.

**Fichiers** : 
- `src/components/tamtam/KuaishouProfileHeader.tsx` - rendre les compteurs cliquables
- `src/pages/tamtam/TamTamProfile.tsx` - connecter les callbacks

---

## 7. Bouton Parametres pour gerer le compte (nom, mot de passe, numero)

**Diagnostic** : Le bouton "Parametres" dans le menu lateral navigue vers `/fitila/settings` mais cette page n'existe probablement pas. Le `ProfileEditModal` existant ne gere que nom, localisation et telephone, pas le mot de passe.

**Correction** : Enrichir le `ProfileEditModal` avec la possibilite de changer le mot de passe (via `supabase.auth.updateUser`). Aussi, faire en sorte que le bouton "Modifier" sur la page profil ouvre ce modal enrichi avec tous les parametres de gestion du compte. Le bouton "Parametres" du menu lateral naviguera vers la page profil et ouvrira automatiquement le modal.

**Fichiers** :
- `src/components/tamtam/ProfileEditModal.tsx` - ajouter champ mot de passe
- `src/pages/tamtam/TamTamProfile.tsx` - gerer l'ouverture automatique via query param

---

## Resume des modifications

| Fichier | Modifications |
|---------|--------------|
| `src/components/tamtam/MyPostsGrid.tsx` | Fix suppression : attendre le resultat de onDelete, indicateur de chargement |
| `src/pages/fitila/FitilaApp.tsx` | Afficher l'avatar reel dans le menu lateral |
| `src/pages/tamtam/TamTamSocial.tsx` | Remonter avatar+username, ajouter date, texte "Suivre" sur bouton follow |
| `src/hooks/usePostInteractions.ts` | Partage avec URL specifique au post |
| `src/components/tamtam/KuaishouProfileHeader.tsx` | Rendre compteurs Followers/Follow/Likes cliquables |
| `src/pages/tamtam/TamTamProfile.tsx` | Connecter les clics sur compteurs, gerer ouverture settings |
| `src/components/tamtam/ProfileEditModal.tsx` | Ajouter changement de mot de passe |

---

## Details techniques

### Fix suppression (MyPostsGrid)
```text
// Ajouter un etat de chargement
const [deletingId, setDeletingId] = useState<string | null>(null);

handleDeleteClick = async (postId) => {
  if (deleteConfirm === postId) {
    setDeletingId(postId);
    await onDelete(postId);
    setDeletingId(null);
    setDeleteConfirm(null);
  } else {
    setDeleteConfirm(postId);
    setTimeout(() => setDeleteConfirm(null), 3000);
  }
}
```

### Avatar dans le menu lateral (FitilaApp)
```text
// Importer useTamTamProfile dans SideMenuDrawer
const { profile } = useTamTamProfile();

// Remplacer l'emoji generique par l'avatar
{profile?.avatar_url ? (
  <img src={profile.avatar_url} className="w-7 h-7 rounded-full object-cover" />
) : (
  <span>👤</span>
)}
```

### Date de publication dans le feed
```text
// Sous le @username dans VideoFeedCard
<span className="text-white/50 text-[10px]">
  {formatPublicationDate(post.created_at)}
</span>
```

### Bouton Suivre avec texte
```text
// Remplacer le petit bouton "+" par un badge plus visible
<motion.button className="absolute -bottom-2 left-1/2 -translate-x-1/2 
  flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px]">
  <Plus className="w-3 h-3" /> Suivre
</motion.button>
```

### Compteurs cliquables dans le header
```text
// KuaishouProfileHeader - ajouter props
onFollowersClick?: () => void;
onFollowingClick?: () => void;
onLikesClick?: () => void;

// Wrapper chaque stat dans un bouton
<button onClick={onFollowersClick}>
  <p>{formatCount(followersCount)}</p>
  <p>Followers</p>
</button>
```

### Changement de mot de passe
```text
// ProfileEditModal - nouvelle section
const handleChangePassword = async () => {
  const { error } = await supabase.auth.updateUser({ 
    password: newPassword 
  });
  if (!error) toast("Mot de passe modifie");
};
```
