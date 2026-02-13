

# Correction : Voix generees par scene absentes du rendu final

## Diagnostic

Le probleme se trouve dans **3 fichiers** avec la meme logique defaillante :

### Cause racine

Quand l'utilisateur enregistre sa voix (etape 1), `narrationAudioUrl` est defini. Ensuite, dans l'editeur de scenes, il genere des voix Inworld par scene (`scene.audioBase64`). Mais le code actuel **ignore les audios par scene si `narrationAudioUrl` existe deja** :

**GriotStudio.tsx (ligne 353)** :
```text
if (!narrationAudioUrl && !result.audioUrl && result.scenes.some(s => s.audioBase64))
```
La condition `!narrationAudioUrl` est FAUSSE (car l'enregistrement original existe), donc la concatenation ne se fait jamais.

**PublishStep.tsx (ligne 98)** :
```text
if (!narrationAudioUrl && !audioUrl && scenes.some(s => s.audioBase64))
```
Meme probleme : la concatenation est bloquee par la narration originale.

**PublishStep.tsx (ligne 109)** :
```text
effectiveNarrationUrl = localNarrationUrl || narrationAudioUrl || audioUrl || scenesConcatenatedUrl
```
La narration originale est TOUJOURS prioritaire sur les voix generees par scene, qui arrivent en dernier.

**StoryPreviewPlayer.tsx (ligne 93)** :
Meme logique de fallback qui ignore les audios par scene.

### Resultat
Les voix Inworld generees par scene ne sont jamais utilisees car l'enregistrement vocal original du narrateur prend toujours la priorite.

## Solution

Inverser la priorite : **si des voix ont ete generees par scene, elles doivent remplacer la narration originale**.

### 1. `src/components/griot-studio/GriotStudio.tsx`

Modifier la condition de concatenation (ligne 353) pour ignorer `narrationAudioUrl` quand des audios par scene existent :

```text
Avant : if (!narrationAudioUrl && !result.audioUrl && result.scenes.some(s => s.audioBase64))
Apres : if (result.scenes.some(s => s.audioBase64))
```

Toujours concatener les audios par scene et stocker le resultat dans `narrationAudioUrl`, ecrasant l'enregistrement original.

### 2. `src/components/griot-studio/PublishStep.tsx`

**Condition useEffect (ligne 98)** : Retirer la condition bloquante pour toujours tenter la concatenation si des scenes ont de l'audio :

```text
Avant : if (!narrationAudioUrl && !audioUrl && scenes.some(s => s.audioBase64))
Apres : if (scenes.some(s => s.audioBase64))
```

**Priorite effectiveNarrationUrl (ligne 109)** : Placer `scenesConcatenatedUrl` AVANT `narrationAudioUrl` pour que les voix generees par scene soient prioritaires :

```text
Avant : localNarrationUrl || narrationAudioUrl || audioUrl || scenesConcatenatedUrl
Apres : scenesConcatenatedUrl || localNarrationUrl || narrationAudioUrl || audioUrl
```

Logique : si des voix par scene ont ete generees (concatenees), elles priment. Sinon, on tombe sur la narration originale.

### 3. `src/components/griot-studio/StoryPreviewPlayer.tsx`

Meme correction pour la preview : toujours tenter la concatenation si des scenes ont `audioBase64`, et donner la priorite au resultat concatene.

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/GriotStudio.tsx` | Retirer la condition `!narrationAudioUrl` pour toujours concatener les audios par scene |
| `src/components/griot-studio/PublishStep.tsx` | Retirer la condition bloquante + inverser la priorite audio |
| `src/components/griot-studio/StoryPreviewPlayer.tsx` | Meme correction de priorite pour la preview |

## Impact

- Les voix Inworld generees par scene seront dans la preview ET le rendu final
- Si aucune voix par scene n'est generee ("Sans voix"), la narration originale est utilisee (comportement actuel preserve)
- Si l'utilisateur enregistre une nouvelle voix dans PublishStep (VinylRecorder), `localNarrationUrl` reste prioritaire

