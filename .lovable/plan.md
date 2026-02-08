
# Correction de 3 problemes : Video figee, Stockage des details, Redirection post-publication

## Probleme 1 : La video publiee est figee comme une photo

**Diagnostic** : La video est exportee au format WebM via `MediaRecorder` dans `PublishStep.tsx`. Le fichier est bien un `.webm` enregistre dans le storage. Le composant `VideoFeedCard` dans `TamTamSocial.tsx` utilise bien un element `<video>` avec `src={videoUrl}` et l'autoplay est correctement configure.

Le probleme vient du fait que l'export video dans `PublishStep.tsx` utilise `canvas.captureStream(24)` mais le contenu du canvas n'est anime que pendant la duree configuree (`duration * 1000 + 500ms`). Cependant, deux problemes existent :

1. **L'animation du canvas depend de `engine.startSlideshowPreview()`** qui anime les scenes. Si l'engine n'a pas les images correctement chargees au moment de l'export, le canvas reste statique (une seule image fixe), produisant une video qui ressemble a une photo.

2. **Le `<video>` dans le feed utilise `loop` et `muted={isMuted}`** avec `isMuted` initialement `false`. Sur mobile, les navigateurs bloquent l'autoplay de videos non-mutees. L'element video devrait demarrer en mode `muted` pour garantir l'autoplay, puis permettre le son via interaction utilisateur.

3. **L'audio/voix n'est pas limitee a la duree de la video** : Les `AudioBufferSourceNode` sont demarres avec `node.start(0)` sans limite de duree. Si le buffer audio est plus long que la duree de la video, l'audio depasse.

**Corrections** :
- Dans `PublishStep.tsx` : Limiter les `AudioBufferSourceNode` a la duree de la video avec `node.start(0, 0, duration)` pour que l'audio ne depasse pas la longueur de la video.
- Dans `VideoFeedCard` (TamTamSocial.tsx) : S'assurer que l'autoplay fonctionne en ajoutant `muted` comme attribut initial sur le `<video>` element pour les navigateurs mobiles, puis basculer apres interaction.
- Ajouter un gestionnaire `onLoadedData` et `onCanPlay` pour confirmer que la video est bien chargeable.

## Probleme 2 : Stocker les details generes (scene, emotion, personnage, style, action, moment, description) dans la base de donnees

**Diagnostic** : La table `videos` ne contient actuellement que : `id, user_id, title, description, video_url, thumbnail_url, template_id, template_name, duration_seconds, views_count, likes_count, shares_count, is_public, created_at, updated_at`. Il n'y a aucune colonne pour stocker les details de classification (style, emotion, scene, character, action, time_of_day, description_en, description_fr).

La table `anime_scene_library` contient ces colonnes mais elle sert pour la bibliotheque d'assets, pas pour les videos publiees.

**Correction** :
- Ajouter une colonne `metadata` de type `JSONB` a la table `videos`. Cette colonne flexible stockera toutes les informations generees : style, emotion, scene_type, character_type, action, time_of_day, description_en, description_fr, scenes (le tableau complet des scenes avec leurs details).
- Modifier `useVideoPublish.ts` pour accepter un champ `metadata` optionnel dans `VideoPublishData` et l'inserer dans la base.
- Modifier `PublishStep.tsx` pour transmettre les details des scenes lors de la publication.
- Modifier `useVideoFeed.ts` pour lire et exposer ces metadonnees.

## Probleme 3 : Blocage sur la page "Felicitations" apres publication

**Diagnostic** : Le screenshot montre que l'utilisateur reste bloque sur l'ecran affichant "Publie!" avec "Redirection vers le feed..." dans `PublishStep.tsx` (lignes 504-517). 

Le flux est :
1. `PublishStep` appelle `onPublishSuccess(videoId)` apres publication reussie
2. `GriotStudio.handlePublishSuccess` fait `navigate('/fitila?video=...')` apres 1.5s de delai
3. MAIS `GriotStudio` est imbrique dans `FullscreenCreator` qui est une modal overlay (`z-[200]`) dans `TamTamSocial`

Le probleme : `navigate('/fitila?video=...')` change bien l'URL, mais le composant `FullscreenCreator` (et donc `GriotStudio`) reste affiche comme une modal overlay (`position: absolute, z-[200]`) au-dessus de la page. La navigation SPA ne ferme pas la modal car elle est geree par un etat local `showCreator`/`showGriotDigitalMode` dans `FullscreenCreator`.

**Correction** :
- Dans `GriotStudio.tsx` : apres publication reussie, le `handlePublishSuccess` doit aussi fermer la modal parent en plus de naviguer. Comme GriotStudio est monte dans FullscreenCreator via un etat local, la solution est de :
  1. D'abord faire le `navigate` vers `/fitila`
  2. Puis utiliser un evenement ou un callback pour fermer FullscreenCreator
  3. Alternative plus robuste : utiliser `window.location.href = '/fitila?video=...'` qui force un rechargement complet et ferme tout

- Solution retenue : Dans `GriotStudio.tsx`, remplacer le `navigate()` par un `window.location.href` force pour `/fitila?video=${videoId}`. Cela garantit la fermeture de toutes les modals et le rechargement propre de la page du feed social.
- De plus, dans `PublishStep.tsx`, retirer l'ecran de "Publie! / Redirection..." bloquant pour eviter l'impression de freeze si la redirection prend du temps.

---

## Plan technique detaille

### Migration base de donnees
Ajouter une colonne `metadata JSONB DEFAULT NULL` a la table `videos` pour stocker les details de classification.

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useVideoPublish.ts` | Ajouter champ `metadata?: Record<string, any>` a `VideoPublishData`, l'inclure dans l'insert |
| `src/hooks/useVideoFeed.ts` | Lire et exposer le champ `metadata` dans `FeedVideo` |
| `src/components/griot-studio/PublishStep.tsx` | 1. Limiter audio a la duree video (`node.start(0, 0, duration)`). 2. Passer les metadonnees des scenes lors de la publication. 3. Retirer l'ecran bloquant "Publie!" |
| `src/components/griot-studio/GriotStudio.tsx` | Utiliser `window.location.href` au lieu de `navigate()` pour forcer la fermeture de toutes les modals et la navigation vers le feed |
| `src/pages/tamtam/TamTamSocial.tsx` (VideoFeedCard) | Ajouter `preload="auto"` pour le chargement, gerer le cas ou la video ne charge pas correctement |

### Detail des modifications audio
Dans `PublishStep.tsx`, les lignes qui font `node.start(0)` seront remplacees par `node.start(0, 0, duration)` pour couper l'audio a la fin de la video. Cela s'applique aux deux sources : voix et musique.
