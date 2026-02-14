
# Optimisation et finalisation de la page Profil

## Objectif
Rendre la page profil completement fonctionnelle, responsive, scrollable, avec edition des informations personnelles, visualisation des publications en plein ecran, et toutes les actions (supprimer, modifier, rendre prive) accessibles directement.

---

## Problemes identifies

1. **Pas de formulaire d'edition du profil** : Il n'existe aucun moyen de modifier le nom, la bio texte, la localisation ou le numero de telephone
2. **Scroll coupe en bas** : `pb-32` est present mais le contenu peut se retrouver masque par la barre de navigation
3. **Publications non visualisables** : Cliquer sur un post ne fait que jouer l'audio -- pas de visualisation plein ecran des videos/photos
4. **Responsive insuffisant** : Certains elements (grille de posts, header) ne s'adaptent pas bien aux petits ecrans
5. **Onglet Tabs manque le compteur de posts** : Le `postsCount` n'est pas passe au composant `KuaishouProfileTabs`

---

## Plan de corrections

### 1. Creer un modal d'edition du profil

**Nouveau fichier** : `src/components/tamtam/ProfileEditModal.tsx`

Ce modal permettra de modifier :
- Nom d'affichage (`display_name`)
- Localisation (`location`)
- Numero de telephone (`phone_number`)

Il s'ouvrira via un bouton "Modifier le profil" ajoute dans les `KuaishouActionButtons` (en remplacement ou a cote du bouton "Plus").

Le modal utilisera `updateProfile()` du hook `useTamTamProfile` pour sauvegarder.

### 2. Ajouter la visualisation plein ecran des posts

**Nouveau composant** : `src/components/tamtam/MyPostViewerOverlay.tsx`

Quand l'utilisateur clique sur un post dans `MyPostsGrid`, un overlay plein ecran s'ouvre montrant :
- La video/photo en grand (si `media_url` existe)
- Un lecteur audio si c'est uniquement audio
- Les stats (likes, commentaires)
- Les boutons d'action (modifier, supprimer, rendre prive/public)
- Navigation verticale (swipe up/down) entre les posts

### 3. Optimiser le scroll et le responsive

**Modifications dans `TamTamProfile.tsx`** :
- Ajouter `overflow-y-auto` sur le conteneur principal
- Ajuster `pb-32` a `pb-40` pour eviter que le contenu soit cache par la barre de navigation
- Rendre la grille de posts responsive : `grid-cols-2 sm:grid-cols-3`

**Modifications dans `KuaishouProfileHeader.tsx`** :
- Ajuster les tailles d'avatar pour les tres petits ecrans
- Reduire les paddings sur mobile

### 4. Passer le compteur de posts aux tabs

**Modification dans `TamTamProfile.tsx`** :
```text
<KuaishouProfileTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
  postsCount={myPosts.length}   // <-- ajouter cette ligne
/>
```

### 5. Connecter le bouton "Modifier le profil"

**Modification dans `TamTamProfile.tsx`** :
- Ajouter l'etat `showEditProfile`
- Ajouter le bouton dans la section action buttons
- Integrer le `ProfileEditModal`

### 6. Ameliorer MyPostsGrid pour le tap mobile

**Modification dans `MyPostsGrid.tsx`** :
- Rendre le tap sur un post (pas seulement hover) plus intuitif sur mobile
- L'overlay de hover doit aussi fonctionner au tap (via `active:opacity-100`)
- Le bouton play doit ouvrir le viewer overlay au lieu de juste jouer l'audio

---

## Details techniques

### ProfileEditModal

```text
Props:
  - isOpen: boolean
  - onClose: () => void
  - profile: TamTamProfile
  - onSave: (updates) => Promise<void>

Champs editables:
  - display_name (input text)
  - location (input text)  
  - phone_number (input tel)

Style: Bottom sheet sur mobile, modal centre sur desktop
Animation: slide-up avec framer-motion
```

### MyPostViewerOverlay

```text
Props:
  - posts: MyPost[]
  - initialIndex: number
  - isOpen: boolean
  - onClose: () => void
  - onEdit: (post) => void
  - onDelete: (postId) => void
  - onToggleVisibility: (postId, isPublic) => void

Contenu:
  - Video/photo plein ecran avec controles
  - Bouton X pour fermer
  - Boutons flottants: modifier, supprimer, prive/public
  - Swipe vertical pour naviguer
  - Stats en bas (likes, commentaires, duree)
```

### Responsive adjustments

```text
// MyPostsGrid: grille adaptative
grid-cols-2 sm:grid-cols-3

// KuaishouProfileHeader: avatar plus petit sur mobile
Avatar: w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24

// Conteneur principal
overflow-y-auto pb-40 scroll-smooth
```

---

## Fichiers modifies/crees

| Fichier | Action |
|---------|--------|
| `src/components/tamtam/ProfileEditModal.tsx` | **Nouveau** - Modal edition profil |
| `src/components/tamtam/MyPostViewerOverlay.tsx` | **Nouveau** - Viewer plein ecran pour les posts propres |
| `src/pages/tamtam/TamTamProfile.tsx` | Integrer les 2 nouveaux composants, ajouter postsCount aux tabs, ameliorer scroll/responsive, ajouter bouton edit profil |
| `src/components/tamtam/MyPostsGrid.tsx` | Responsive grid, tap mobile, callback pour ouvrir le viewer |
| `src/components/tamtam/KuaishouProfileHeader.tsx` | Responsive avatar sizes |
