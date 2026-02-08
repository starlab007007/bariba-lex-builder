

# Finalisation des boutons d'action video + Profil createur

## Objectif
Refondre la barre d'actions droite du flux video (VideoFeedCard dans TamTamSocial.tsx) pour offrir une experience complete et responsive sur tous les ecrans.

## Problemes identifies

1. **Bouton "Suivre" manquant** : Pas de bouton avatar du createur avec "+" rouge au-dessus du bouton Aimer dans le flux video
2. **Boutons coupes sur petit ecran** : Le positionnement actuel (`bottom: 4.5rem`) pousse les boutons trop bas, ils peuvent sortir de l'ecran sur les petits telephones
3. **Nom d'auteur generique** : Le hook `useVideoFeed.ts` affiche "Createur Griot Anime IA" au lieu du vrai nom du createur avec le format @username
4. **Pas de lien vers le profil createur** : Le clic sur le nom ne navigue pas toujours vers le profil avec les publications

## Plan d'implementation

### Etape 1 : Recuperer les vrais profils createurs (useVideoFeed.ts)

Modifier le hook pour joindre la table `tamtam_profiles` via le `user_id` de la video :

- Remplacer la requete simple `supabase.from('videos').select('*')` par une requete avec jointure : `supabase.from('videos').select('*, tamtam_profiles!videos_user_id_fkey(user_id, username, display_name, avatar_url, is_verified)')`
- Si la jointure FK echoue (pas de cle etrangere), faire un fallback avec une requete separee pour recuperer les profils
- Mapper `author.name` vers `display_name`, `author.username` vers `@username`, et `author.avatarUrl` vers `avatar_url`

### Etape 2 : Ajouter le bouton "Suivre" avec avatar (VideoFeedCard dans TamTamSocial.tsx)

Ajouter un nouveau bouton au-dessus du bouton "Aimer" dans la colonne droite :

```text
+------------------+
|  [Avatar]        |  <-- Photo du createur (cercle)
|   [+] rouge      |  <-- Badge "+" rouge = Suivre
+------------------+
|  [Coeur]         |  <-- Aimer
|  compteur        |
+------------------+
|  [Bulle]         |  <-- Commenter
|  compteur        |
+------------------+
|  [Signet]        |  <-- Enregistrer
+------------------+
|  [Fleche]        |  <-- Partager
|  compteur        |
+------------------+
```

Le bouton avatar :
- Affiche la photo de profil du createur (ou un avatar par defaut)
- Superpose un petit cercle rouge avec "+" en bas de l'avatar
- Quand on clique sur le "+", cela declenche l'action "Suivre"
- Quand on clique sur l'avatar directement, cela navigue vers le profil du createur
- Le "+" disparait si l'utilisateur suit deja le createur

### Etape 3 : Remplacer le texte auteur en bas a gauche

Remplacer le bloc actuel "Createur" par :
- L'avatar du createur (petit cercle)
- Le nom sous format **@username** (ex: @moussa_koita)
- Cliquer dessus navigue vers `/fitila/profile/{user_id}` pour voir le profil complet avec toutes ses publications

### Etape 4 : Positionnement responsive sans scroll

Pour garantir que tous les boutons sont visibles sans scroll sur tout ecran :

- Centrer verticalement la colonne d'actions dans la moitie inferieure de l'ecran au lieu d'utiliser un `bottom` fixe
- Utiliser `top: 50%; transform: translateY(-20%)` pour la colonne d'actions, ce qui la centre naturellement
- Reduire les gaps entre boutons sur petits ecrans : `gap-2` par defaut, `sm:gap-3`, `md:gap-4`
- Reduire la taille des icones sur tres petits ecrans : `w-5 h-5` par defaut, `sm:w-6 sm:h-6`

---

## Details techniques

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useVideoFeed.ts` | Jointure avec `tamtam_profiles` pour recuperer username, display_name, avatar_url |
| `src/pages/tamtam/TamTamSocial.tsx` (VideoFeedCard interne) | Ajout bouton avatar+suivre, nouveau format @username, positionnement responsive |
| `src/components/feed/VideoFeedCard.tsx` | Memes modifications pour le composant exporte (coherence) |

### Structure du bouton Suivre

```text
<div relative>
  <button onClick={navigateToProfile}>
    <img avatar 40x40 rounded-full />
  </button>
  {!isFollowing && (
    <button onClick={handleFollow}
      className="absolute -bottom-2 left-1/2 -translate-x-1/2
                 w-5 h-5 rounded-full bg-red-500
                 flex items-center justify-center">
      <Plus w-3 h-3 text-white />
    </button>
  )}
</div>
```

### Positionnement responsive de la colonne d'actions

```text
Ancien:
  bottom: 'max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))'

Nouveau:
  bottom: 'auto'
  top: '50%'
  transform: 'translateY(-10%)'
  
Avec padding-bottom pour safe-area via le conteneur parent.
```

### Format @username dans l'auteur

```text
Ancien: "Createur Griot Anime IA"
Nouveau: "@moussa_k" (tire de tamtam_profiles.username)
Fallback: "@fitila_user" si pas de profil
```

