

# Diagnostic Complet + Harmonisation du Griot Studio et Feed FITILA

## Problemes identifies

### Bug 1 : Layout coupe en bas - contenu masque par le footer fixe
Le `footer` fixe en bas de `GriotStudio.tsx` (ligne 895) couvre le contenu car la zone principale utilise `pb-24` qui n'est pas toujours suffisant, surtout sur tablette/desktop. Le contenu du `PublishStep` peut etre coupe sur les petits ecrans.

### Bug 2 : Scroll bloque sur mobile
Le conteneur principal a `overflow-hidden` sur le parent (`h-[100dvh] overflow-hidden` ligne 489) et le `main` a `overflow-y-auto`. Sur certains ecrans, le contenu de PublishStep depasse mais le scroll ne fonctionne pas toujours correctement a cause de conflits CSS.

### Bug 3 : La musique selectionnee ne joue pas dans le rendu final
Dans `PublishStep.tsx`, quand l'utilisateur selectionne "Musique seule" ou "Voix + Musique" et choisit un morceau depuis la `AudioLibrary`, le fichier audio du track (`selectedMusicTrack?.source?.url`) est utilise dans `exportVideo()`. Cependant, ces URLs peuvent echouer a cause du CORS (`crossOrigin = 'anonymous'`). Il faut un meilleur fallback et valider que l'URL est accessible.

### Bug 4 : Publication sans audio enregistre - mode music seul
Si l'utilisateur ne record pas de voix et selectionne "Musique seule", le bouton Publier fonctionne mais l'export video peut echouer silencieusement car `canvasRef` ou `engineRef` ne sont pas initialises en mode manuel (pas de canvas visible).

### Bug 5 : `generationResult` peut etre null en mode manual
La condition `step === 'finalize' && generationResult` (ligne 867) bloque le rendu de PublishStep si `generationResult` n'est pas defini. En mode manuel, `handleUseAssets` appelle `generateFromSelectedAssets` qui met a jour `result` via `setResult`, mais il y a un potentiel delai de synchronisation.

### Bug 6 : Redirect post-publication utilise `window.location.href` au lieu de `navigate`
Ligne 276 de `PublishStep.tsx` force un rechargement complet (`window.location.href = '/fitila'`), perdant l'etat de l'app. Il faut utiliser `useNavigate` de React Router.

### Bug 7 : VinylRecorder dans PublishStep ne passe pas onAvatarCapture
Le `VinylRecorder` integre dans `PublishStep` ne recoit pas la prop `onAvatarCapture`, donc le bouton camera dans le disque ne fait rien quand il n'y a pas d'avatar.

### Bug 8 : Responsive - contenu PublishStep trop espace sur desktop
Les elements de PublishStep sont en colonne sans contrainte de largeur max adequate pour tablette/desktop. Le preview, les boutons et les selecteurs s'etirent trop.

---

## Plan d'action

### 1. Fix Layout Scroll (GriotStudio.tsx)
- Retirer `overflow-hidden` du conteneur principal
- Augmenter le `padding-bottom` du main pour accommoder le footer fixe
- S'assurer que le contenu scrolle correctement sur tous les ecrans
- Rendre le footer non-fixe ou integre dans le flux pour eviter les chevauchements

### 2. Fix PublishStep - Scroll + Responsive (PublishStep.tsx)
- Wrapper tout le contenu dans un conteneur scrollable avec `overflow-y-auto`
- Ajouter des breakpoints responsive : `max-w-md` pour mobile, `max-w-lg` pour tablette, avec centrage
- Assurer que la miniature de preview, le selecteur audio, et les boutons sont tous visibles via scroll
- Adapter les tailles des elements (thumbnail plus petit sur mobile, plus grand sur desktop)

### 3. Fix Audio/Musique dans le rendu (PublishStep.tsx)
- Ajouter une verification de validite de l'URL musicale avant l'export
- Ajouter un fallback si la musique ne charge pas (continuer l'export sans musique plutot que crash)
- Log des erreurs audio plus explicites pour debug

### 4. Fix Navigation post-publication (PublishStep.tsx)
- Passer `navigate` de React Router comme prop ou utiliser `useNavigate` directement
- Remplacer `window.location.href = '/fitila'` par `navigate('/fitila')`
- Garder le delai de 2.5s avec animation de progression

### 5. Fix mode manuel - canvas initialisation (GriotStudio.tsx)
- S'assurer que le canvas est monte et l'engine initialisee meme en mode manuel avant l'etape finalize
- Gerer le cas ou `generationResult` est null : afficher un fallback ou attendre le resultat

### 6. Harmonisation des couleurs et lisibilite
- Verifier que tous les textes ont un contraste suffisant sur leurs fonds
- Uniformiser la palette : `text-amber-100` sur `bg-amber-950`, `text-white` sur `bg-black`
- Les labels, descriptions et hints doivent etre lisibles

### 7. Responsive adaptatif (tous les fichiers)
- Mobile (< 640px) : tout en colonne, elements compacts, scroll vertical
- Tablette (640-1024px) : layout centre avec `max-w-lg mx-auto`
- Desktop (> 1024px) : layout centre avec `max-w-xl mx-auto`, preview plus grand

---

## Details techniques - Fichiers a modifier

### `src/components/griot-studio/GriotStudio.tsx`
- Ligne 489 : Retirer `overflow-hidden` du div racine, utiliser `min-h-[100dvh]` + `overflow-y-auto`
- Ligne 561 : Augmenter le padding bottom du main a `pb-32` pour le footer
- Ligne 867 : Gerer le cas `generationResult === null` en mode finalize (afficher loading ou fallback)
- Ligne 872 : Rendre le canvas visible mais hors ecran (position absolute) pour que l'engine fonctionne en mode manuel
- Ligne 895 : Rendre le footer sticky au lieu de fixed, ou augmenter le padding

### `src/components/griot-studio/PublishStep.tsx`
- Ligne 273-280 : Remplacer `window.location.href` par `useNavigate()` de React Router
- Ligne 310 : Wrapper dans `overflow-y-auto` avec scroll padding
- Ligne 337-345 : Passer `onAvatarCapture` au VinylRecorder si disponible
- Ligne 115-221 : Ajouter try/catch robuste autour du chargement audio avec fallback gracieux
- Ligne 437-443 : Rendre la miniature responsive (taille adaptative mobile/tablet/desktop)
- Ligne 456-486 : Boutons d'action avec min-height garanti pour accessibilite

### `src/components/griot-studio/AssetGallery.tsx`
- Verifier que le scroll horizontal des categories fonctionne bien sur tous les ecrans
- S'assurer que la grille 3-colonnes est bien adaptative

### `src/components/griot-studio/VinylAuthorDisc.tsx`
- Pas de changement necessaire (deja responsive)

### `src/components/griot-studio/StoryPreviewPlayer.tsx`
- S'assurer que le player audio joue la musique selectionnee si c'est le mode choisi
- Le composant est deja responsive

---

## Resume des corrections

| Probleme | Fichier | Impact |
|----------|---------|--------|
| Layout tronque / scroll bloque | GriotStudio.tsx | Utilisateur ne voit pas tout le contenu |
| Musique ne joue pas dans l'export | PublishStep.tsx | Video publiee sans audio selectionne |
| Redirect brutal post-publication | PublishStep.tsx | Perte d'etat React |
| Canvas non initialise en mode manuel | GriotStudio.tsx | Export video echoue |
| Responsive insuffisant | PublishStep.tsx + GriotStudio.tsx | UI cassee sur tablette/desktop |
| VinylRecorder sans avatar capture | PublishStep.tsx | Bouton camera inoperant |

