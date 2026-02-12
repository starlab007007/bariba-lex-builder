
# Plan de correction complet : Audio, Responsive, Lisibilite, UX

## Diagnostic des problemes identifies

### 1. AUDIO : Enregistrement echoue sur Safari/Chrome/Opera mobile
**Cause racine :** Les composants `SegmentEditor.tsx` et `VinylRecorder.tsx` utilisent `audio/webm;codecs=opus` comme MIME type, qui n'est **pas supporte sur Safari iOS**. Safari necessite `audio/mp4`.

- `SegmentEditor.tsx` ligne 64 : `new Blob(chunks, { type: 'audio/webm' })` -- pas de detection MIME
- `VinylRecorder.tsx` lignes 122-125 : test uniquement `audio/webm;codecs=opus` puis fallback `audio/webm` -- Safari ignore les deux
- `useAudioRecorder.ts` lignes 71-75 : meme probleme, pas de fallback `audio/mp4`

**Solution :** Le projet a deja un pattern Safari-compatible dans `GriotDigitalCreator.tsx` (`getSupportedAudioMimeType`). Il faut extraire cette logique dans un utilitaire partage et l'appliquer partout.

### 2. RESPONSIVE : L'affichage n'est pas adapte mobile
**Problemes trouves :**
- `ConteVivantStudio.tsx` : conteneur `flex-col items-center justify-center p-6` sans `h-[100dvh]` ni `overflow-y-auto`, le contenu peut deborder
- `StoryBuilder.tsx` : le header + step indicators + contenu + footer ne gerent pas bien le scroll sur petit ecran
- `SegmentEditor.tsx` : les boutons d'action s'empilent mal sur ecrans etroits (<375px)
- `StoryTreePreview.tsx` : `max-h-64` trop petit sur mobile, coupe l'arbre
- Les step indicators dans `StoryBuilder` debordent horizontalement sans scrollbar visible

### 3. LISIBILITE : Couleurs de texte illisibles
**Problemes trouves :**
- `ConteVivantStudio.tsx` : texte `text-white/40` et `text-white/50` sur fond `#08080c` -- contraste insuffisant (ratio ~2:1, minimum WCAG AA = 4.5:1)
- `StoryBuilder.tsx` : utilise `text-muted-foreground` qui peut etre gris clair sur fond clair en mode light
- `SegmentEditor.tsx` : `text-muted-foreground` pour les labels, difficilement lisible
- Les badges `text-[10px]` sont trop petits pour etre lus sur mobile

### 4. PARCOURS UTILISATEUR : Navigation incomplete et non intuitive
**Problemes trouves :**
- **Pas de bouton Annuler** sur le `SegmentEditor` (on ne peut pas annuler une modification en cours)
- **Pas de previsualisation jouable** depuis le StoryBuilder : le bouton "Apercu" montre seulement l'arbre textuel (`StoryTreePreview`), pas un vrai player
- **Pas de lecture audio/video** dans l'apercu du SegmentEditor : les videos sont `muted` sans controle, les audios de narration ne sont pas jouables
- **Navigation Previous/Next** existe dans StoryBuilder mais les boutons sont petits et sans indication visuelle de progression
- **Pas de confirmation** avant publication
- **Pas de bouton "Tester mon conte"** dans l'etape Preview pour lancer le BranchingPlayer

---

## Plan d'implementation

### Etape 1 : Utilitaire audio cross-browser (nouveau fichier)
Creer `src/lib/audioMimeUtils.ts` en extrayant la logique de `GriotDigitalCreator.tsx` :
- `getSupportedAudioMimeType()` : detecte le bon MIME (audio/mp4 sur Safari, audio/webm sinon)
- `getAudioBlobType()` : retourne le type correct pour le Blob
- `isIOSDevice()` et `isSafariBrowser()` reutilisables

### Etape 2 : Corriger l'enregistrement audio partout
**Fichiers modifies :**
- `src/hooks/useAudioRecorder.ts` : utiliser `getSupportedAudioMimeType()` au lieu du MIME en dur
- `src/components/griot-studio/VinylRecorder.tsx` : meme correction
- `src/features/conte-vivant/components/SegmentEditor.tsx` : meme correction pour le recorder inline + ajouter gestion d'erreur avec toast

### Etape 3 : Corriger la lisibilite et le contraste
**Fichiers modifies :**
- `ConteVivantStudio.tsx` :
  - Remplacer `text-white/40` par `text-white/70` (contraste > 4.5:1)
  - Remplacer `text-white/50` par `text-white/70`
  - Augmenter la taille des labels de `text-[10px]` a `text-xs` (12px)
- `StoryBuilder.tsx` :
  - Forcer le theme sombre pour tout le builder (`style={{ backgroundColor: '#08080c', color: '#e5e5e5' }}`)
  - Augmenter la visibilite des step indicators
- `SegmentEditor.tsx` :
  - Augmenter le contraste des labels et placeholders
  - Tailles de texte minimum 12px

### Etape 4 : Rendre le layout responsive
**Fichiers modifies :**
- `ConteVivantStudio.tsx` :
  - Ajouter `h-[100dvh]` au conteneur racine
  - Ajouter `overflow-y-auto` sur le contenu scrollable
  - Adapter la grille de stats avec `grid-cols-2 sm:grid-cols-3`
- `StoryBuilder.tsx` :
  - Le conteneur principal doit etre `h-[100dvh] flex flex-col`
  - Le contenu central doit etre `flex-1 overflow-y-auto`
  - Les step indicators doivent avoir un scroll horizontal smooth avec indicateur
  - Les boutons Previous/Next doivent etre plus grands (min 44px de hauteur) avec labels visibles
- `SegmentEditor.tsx` :
  - Les boutons d'action en `flex-wrap` avec `gap-2` (deja fait partiellement)
  - Le selecteur de couleurs en scroll horizontal si necessaire

### Etape 5 : Ameliorer le parcours utilisateur
**Fichiers modifies :**
- `StoryBuilder.tsx` :
  - Ajouter un bouton "Tester le conte" dans l'etape Preview qui lance le `BranchingPlayer` en overlay
  - Ajouter une confirmation modale avant publication ("Etes-vous sur de vouloir publier ?")
  - Ameliorer les boutons de navigation : plus grands, avec icones + texte, couleur primaire pour "Suivant"
  - Afficher clairement l'etape en cours avec un compteur "Etape X sur Y"
- `SegmentEditor.tsx` :
  - Ajouter la lecture de l'audio de narration (bouton Play avec `<audio>` visible)
  - Ajouter la lecture de la video (bouton Play sur la miniature)
  - Supprimer le doublon de bouton "Audio" (il y a deux recorders : le simple et le VinylRecorder)
- `ConteVivantStudio.tsx` :
  - Le bouton "Mes contes" doit etre fonctionnel (actuellement ne fait rien)

### Etape 6 : Previsualisation complete dans le builder
**Fichiers modifies :**
- `StoryBuilder.tsx` :
  - Dans l'etape "preview", ajouter un bouton "Jouer le conte" qui affiche le `BranchingPlayer` en plein ecran
  - Afficher un resume complet avec miniatures, durees, nombre de fins

---

## Resume des fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/lib/audioMimeUtils.ts` | **Nouveau** - Utilitaire MIME audio cross-browser |
| `src/hooks/useAudioRecorder.ts` | MIME dynamique Safari/Chrome |
| `src/components/griot-studio/VinylRecorder.tsx` | MIME dynamique + gestion erreur |
| `src/features/conte-vivant/components/SegmentEditor.tsx` | MIME fix, supprimer doublon recorder, ajouter playback |
| `src/features/conte-vivant/components/StoryBuilder.tsx` | Responsive, navigation amelioree, preview jouable, confirmation publication |
| `src/features/conte-vivant/components/ConteVivantStudio.tsx` | h-[100dvh], contraste texte, responsive grid |

## Details techniques

### Pattern MIME audio (extrait de la solution existante)
```text
Ordre de priorite Safari iOS : audio/mp4 > audio/webm > audio/ogg
Ordre de priorite Chrome/Firefox : audio/webm;codecs=opus > audio/webm > audio/mp4
Detection : navigator.userAgent pour iOS + MediaRecorder.isTypeSupported()
Blob type : doit correspondre au MIME utilise par MediaRecorder
```

### Regles de contraste WCAG AA
```text
Texte normal (< 18px) : ratio minimum 4.5:1
Texte large (>= 18px bold ou >= 24px) : ratio minimum 3:1
Fond #08080c + text white/70 = ratio ~8:1 (OK)
Fond #08080c + text white/40 = ratio ~2.5:1 (ECHEC)
```

### Layout responsive
```text
Conteneur principal : h-[100dvh] flex flex-col
Zone scrollable : flex-1 overflow-y-auto
Boutons tactiles : min-h-[44px] (WCAG 2.1 AA)
Texte minimum : 12px (text-xs)
```
