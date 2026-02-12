

# Plan de correction complet : Audio, Affichage, Responsive, UX

## Bugs critiques identifies

### BUG 1 : Audio/voix absents du rendu final
**Cause racine** : Dans `StoryBuilder.tsx` ligne 76, `buildGraph()` ecrit `audio_url: introSegment.audio_url` mais l'enregistreur VinylRecorder sauve la narration dans `narrator_audio_url`. Le champ `audio_url` reste toujours `undefined`. Meme probleme ligne 91 pour les branches.

**Correction** : Dans `buildGraph()`, mapper `narrator_audio_url` vers le champ `narrator_audio_url` du StorySegment ET aussi vers `audio_url` comme fallback.

### BUG 2 : BranchingPlayer ne joue pas l'audio
**Cause racine** : Le composant `BranchingPlayer.tsx` n'a aucun element `<audio>` pour lire la narration ou la musique de fond. Il affiche uniquement les visuels (video/photo) et les choix, mais aucun son n'est emis.

**Correction** : Ajouter un element `<audio>` pour la narration du segment courant et un second pour la musique de fond, avec autoplay et gestion du cycle de vie.

### BUG 3 : Theme clair au lieu du theme sombre
**Cause racine visible dans les 8 screenshots** : `StoryBuilder.tsx` utilise `bg-background text-foreground` (ligne 164) qui rend en mode clair (fond blanc, texte gris). Tout le builder est illisible.

**Correction** : Forcer le fond sombre `bg-[#08080c]` et les couleurs de texte `text-white` sur le StoryBuilder, comme deja fait sur ConteVivantStudio.

### BUG 4 : Photos/videos de la galerie absentes du rendu
**Cause racine** : Dans `handleAssetSelect` (SegmentEditor ligne 85-94), le media est correctement sauve dans le segment. Mais dans `buildGraph()`, seul `media_url` et `mediaType` sont transmis -- ce qui est correct. Le vrai probleme est que les URLs blob (`blob://...`) creees localement ne sont pas persistantes et disparaissent quand le player est monte. Pour les assets de la galerie avec des URLs Supabase, ca devrait fonctionner. Le probleme est lie au BUG 2 : pas d'audio = impression que le rendu est incomplet.

### BUG 5 : Textes illisibles
**Visible dans tous les screenshots** : Placeholder gris clair sur fond blanc, labels `text-foreground/60` a peine visibles, bordures quasi invisibles.

---

## Plan d'implementation

### Fichier 1 : `src/features/conte-vivant/components/StoryBuilder.tsx`

**A. Forcer le theme sombre**
- Ligne 164 : Remplacer `bg-background text-foreground` par un style inline `backgroundColor: '#08080c', color: '#e5e5e5'`
- Appliquer des classes de texte claires partout : `text-white`, `text-white/70` au lieu de `text-foreground/60`
- Les cartes de segments : fond `bg-white/5` avec bordure `border-white/10` au lieu de `bg-card/50`
- Les inputs : fond `bg-white/10` avec texte blanc, placeholder `placeholder:text-white/40`
- Boutons "Precedent"/"Suivant" : couleurs explicites blanches
- Step indicators : fond sombre avec texte visible

**B. Corriger buildGraph() pour inclure l'audio**
- Ligne 76 : ajouter `narrator_audio_url: introSegment.narrator_audio_url`
- Ligne 76 : `audio_url: introSegment.audio_url || introSegment.narrator_audio_url` (fallback)
- Ligne 91 : meme correction pour les branches
- Ligne 104 : meme correction pour les sub-branches

**C. Ameliorer la navigation**
- Afficher le compteur d'etape sur mobile aussi (retirer `hidden sm:block`)
- Augmenter la taille du texte des boutons de navigation

### Fichier 2 : `src/features/conte-vivant/components/BranchingPlayer.tsx`

**A. Ajouter la lecture audio**
- Ajouter un `useRef<HTMLAudioElement>` pour la narration
- Ajouter un `useRef<HTMLAudioElement>` pour la musique de fond
- Quand le segment change : charger `seg.narrator_audio_url || seg.audio_url` dans l'element audio narration et lancer `play()`
- Quand `seg.background_music_url` existe : charger et jouer en boucle avec volume a 0.25
- Arreter les audios lors des transitions et quand le player se ferme

### Fichier 3 : `src/features/conte-vivant/components/SegmentEditor.tsx`

**A. Forcer le theme sombre**
- Le conteneur principal : fond `bg-white/5` avec bordure `border-white/10` et texte `text-white`
- Les inputs : fond `bg-white/10`, texte blanc, placeholder visible
- La textarea : memes corrections
- Les labels : `text-white/70` au lieu de `text-foreground/70`
- Les boutons Visuel/Narration/Generer IA : bordures et textes visibles sur fond sombre

**B. Ameliorer la previsualisation media**
- Agrandir la miniature de `w-16 h-[86px]` a `w-20 h-28` pour mieux voir le contenu
- Ajouter un label "Photo" ou "Video" sous la miniature

### Fichier 4 : `src/features/conte-vivant/components/StoryTreePreview.tsx`

- Appliquer le theme sombre : fonds, textes et bordures adaptes
- Augmenter `max-h-64` a `max-h-[50vh]` pour ne pas couper l'arbre

---

## Resume des corrections critiques

| Probleme | Fichier | Correction |
|----------|---------|------------|
| Audio perdu dans le graph | StoryBuilder.tsx | Mapper `narrator_audio_url` dans `buildGraph()` |
| Pas de lecture audio | BranchingPlayer.tsx | Ajouter elements `<audio>` pour narration + musique |
| Theme clair illisible | StoryBuilder.tsx | Forcer `bg-[#08080c]` + textes blancs |
| Theme clair illisible | SegmentEditor.tsx | Forcer fond sombre + textes blancs |
| Textes illisibles | Tous les fichiers | Remplacer `text-foreground/60` par `text-white/70` |
| Compteur etape cache | StoryBuilder.tsx | Retirer `hidden sm:block` sur le compteur |

## Details techniques

### Mapping audio dans buildGraph
```text
AVANT : audio_url: introSegment.audio_url  (toujours undefined)
APRES : audio_url: introSegment.narrator_audio_url || introSegment.audio_url
        narrator_audio_url: introSegment.narrator_audio_url
```

### Element audio dans BranchingPlayer
```text
<audio ref={narrationRef} src={seg.narrator_audio_url || seg.audio_url} autoPlay />
<audio ref={bgMusicRef} src={seg.background_music_url} loop volume={0.25} />
```

### Palette de couleurs sombres
```text
Fond principal : #08080c
Fond carte : rgba(255,255,255,0.05) = bg-white/5
Bordure carte : rgba(255,255,255,0.1) = border-white/10
Texte principal : #e5e5e5 = text-white/90
Texte secondaire : rgba(255,255,255,0.7) = text-white/70
Texte tertiaire : rgba(255,255,255,0.5) = text-white/50
Input fond : rgba(255,255,255,0.1) = bg-white/10
Input bordure : rgba(255,255,255,0.2) = border-white/20
```

