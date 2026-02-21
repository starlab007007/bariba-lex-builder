

# Plan de corrections FITILA

## 1. Favicon / Logo FITILA

Copier l'image uploadee (`user-uploads://image-55.png`) vers `public/fitila-icon.png` et mettre a jour `index.html` pour l'utiliser comme favicon et icone Apple Touch.

**Fichiers modifies :**
- Copie de `user-uploads://image-55.png` vers `public/fitila-icon.png`
- `index.html` : ajout de `<link rel="icon" href="/fitila-icon.png">` et `<link rel="apple-touch-icon" href="/fitila-icon.png">`

---

## 2. Pages Messages, Groupes, Lives : "Bientot disponible"

Les boutons "Message" et "Featured" dans la navigation du bas (`KuaishouBottomNav.tsx`) pointent vers `/fitila/messages` et `/fitila/discover`, mais ces routes n'existent pas dans `App.tsx`. Au lieu de creer des pages completes, on va :

1. Creer une page generique `ComingSoonPage.tsx` avec un message "Bientot disponible"
2. Ajouter les routes manquantes dans `App.tsx` :
   - `/fitila/messages` -> ComingSoonPage
   - `/fitila/discover` -> ComingSoonPage

**Fichiers :**
- **Nouveau** : `src/pages/fitila/ComingSoonPage.tsx` - Page simple avec icone, titre "Bientot disponible" et bouton retour
- **Modifie** : `src/App.tsx` - Ajouter les routes `/fitila/messages` et `/fitila/discover`

---

## 3. Galerie Anime : ameliorations UX

Actuellement, la galerie (`AssetGallery.tsx`) :
- Charge max 100 assets (`.range(0, 99)`)
- N'affiche que 3 items en preview puis ouvre un drawer plein ecran
- N'a pas de barre de recherche
- Affiche le nombre total "(38)" dans le bouton

**Modifications :**

### 3a. Charger TOUS les assets (sans limite de 100)
Modifier la requete pour paginer et charger tous les assets disponibles (utiliser `.range(0, 999)` ou pagination).

### 3b. Affichage progressif "Voir plus" (+3 a chaque clic)
Remplacer le comportement actuel (3 items + drawer) par un systeme incremental :
- Afficher 3 items initialement
- Chaque clic sur "Voir plus" ajoute 3 items supplementaires a la grille
- Le bouton "Voir plus" reste visible tant qu'il y a des items a afficher
- Ne plus afficher le nombre total restant dans le bouton (juste "Voir plus")
- Miniatures plus petites et fluides

### 3c. Ajouter une barre de recherche
Ajouter un champ de recherche en haut de la galerie pour filtrer par description (description_fr, description_en) ou scene_type.

### 3d. Videos jouent en miniature
Les videos jouent automatiquement (muettes) dans la grille pour une experience plus vivante.

**Fichiers modifies :**
- `src/components/griot-studio/AssetGallery.tsx` : requete elargie, logique "voir plus" incrementale (+3), barre de recherche, suppression du total, miniatures plus petites
- `src/components/griot-studio/gallery/AssetGridItem.tsx` : miniatures plus compactes, autoplay video au scroll

---

## 4. Permissions Camera/Micro pour Android et iOS

Pour la version APK generee via Capacitor, ajouter les permissions par defaut pour la camera et le microphone.

**Fichier modifie :**
- `capacitor.config.ts` : Ajouter la configuration des permissions pour camera et microphone dans les sections `android` et `ios`

**Note** : Les permissions Android (`CAMERA`, `RECORD_AUDIO`) doivent etre declarees dans le fichier `AndroidManifest.xml` qui est genere lors du `npx cap add android`. Capacitor les ajoute automatiquement via les plugins. Pour garantir cela, je vais aussi creer un fichier de configuration natif supplementaire.

---

## Resume technique des changements

| Fichier | Action |
|---------|--------|
| `public/fitila-icon.png` | Copie du logo uploade |
| `index.html` | Ajout favicon + apple-touch-icon |
| `src/pages/fitila/ComingSoonPage.tsx` | Nouvelle page "Bientot disponible" |
| `src/App.tsx` | Ajout routes messages/discover |
| `src/components/griot-studio/AssetGallery.tsx` | Chargement complet, +3 incremental, recherche, pas de total |
| `src/components/griot-studio/gallery/AssetGridItem.tsx` | Miniatures plus compactes |
| `capacitor.config.ts` | Permissions camera/micro |

