
# Diagnostic et Corrections - Audio manquant dans le rendu final

## Bug principal identifie : la musique n'est JAMAIS incluse dans l'export

### Cause racine (CRITIQUE)

Dans `PublishStep.tsx`, ligne 140 :
```
const musicUrl = selectedMusicTrack?.source?.url;
```

Or, **TOUS les morceaux** de la bibliotheque audio utilisent `source.path` (pas `source.url`) car ils sont de type `"local"`. Exemple dans `music_library.json` :
```json
"source": {
  "type": "local",
  "path": "/templates/packs/audio/tracks/traditional/yaru_diguidiru.mp3"
}
```

Le champ `source.url` est donc toujours `undefined`. Le code pense qu'il n'y a pas de musique et exporte la video **sans audio musical**.

### Solution

Corriger la resolution de l'URL musicale pour prendre en compte les deux formats :
```
const musicUrl = selectedMusicTrack?.source?.url || selectedMusicTrack?.source?.path;
```

## Bug secondaire : la voix (narration) peut aussi etre perdue

La narration vient d'un `blob:` URL cree par `URL.createObjectURL(blob)` lors de l'enregistrement. Ce blob URL est valide tant que le document reste le meme. Cependant, si l'utilisateur navigue entre les etapes, le blob peut etre ramasse par le garbage collector.

### Solution de securite

Stocker egalement le `Blob` brut (`narrationBlob`) comme source de secours. Si le `fetch(blobUrl)` echoue, utiliser directement le blob en memoire via `new Response(blob).arrayBuffer()`.

## Bug 3 : Redirection post-publication

Le code actuel a DEUX redirections concurrentes (une dans PublishStep, une dans GriotStudio) toutes les deux a 1.5s. Cela peut creer des conflits. Il faut centraliser la redirection dans un seul endroit.

---

## Plan de corrections

### Fichier : `src/components/griot-studio/PublishStep.tsx`

1. **Ligne 140** : Corriger la resolution du musicUrl
   - Avant : `const musicUrl = selectedMusicTrack?.source?.url;`
   - Apres : `const musicUrl = selectedMusicTrack?.source?.url || selectedMusicTrack?.source?.path;`

2. **Lignes 169-183** : Ajouter un fallback pour la voix si le fetch du blob URL echoue
   - Tenter d'abord `fetch(effectiveNarrationUrl)`
   - Si ca echoue et que `narrationBlob` est disponible, utiliser directement le blob brut avec `narrationBlob.arrayBuffer()`

3. **Lignes 326-338** : Supprimer la redirection doublon dans PublishStep
   - Garder uniquement l'appel `onPublishSuccess?.(result.videoId || '')`
   - La redirection est geree par le parent GriotStudio

### Fichier : `src/components/griot-studio/GriotStudio.tsx`

1. **Lignes 413-421** : Renforcer la redirection avec un fallback `window.location.href`
   - Apres `navigate()`, ajouter un second timeout de securite avec `window.location.href` comme ultime recours

---

## Resume des corrections

| Bug | Cause | Impact | Solution |
|-----|-------|--------|----------|
| Musique absente de l'export | `source.url` est undefined pour les tracks locales (qui utilisent `source.path`) | Toutes les videos sont exportees sans musique | Utiliser `source.url OR source.path` |
| Voix peut etre perdue | Le blob URL peut devenir invalide si le GC nettoie le blob original | Export silencieux si la voix est perdue | Fallback sur `narrationBlob` brut |
| Double redirection | PublishStep ET GriotStudio redirigent tous les deux | Navigation potentiellement conflictuelle | Centraliser dans GriotStudio uniquement |
