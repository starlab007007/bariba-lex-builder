

# Correction : Musiques uploadees invisibles dans la bibliotheque de selection

## Probleme identifie

Les musiques uploadees dans l'admin "Bibliotheque Anime" (capture 1) sont enregistrees dans la table `music_library_tracks` de la base de donnees. Cependant, le composant de selection de musique (capture 2, `AudioLibrary.tsx`) ne lit que les pistes du fichier JSON statique (`music_library.json`) et ignore completement les pistes de la base de donnees.

**Cause racine** : Dans `AudioLibrary.tsx` ligne 73, le code fait :
```text
let tracks = library.categories.flatMap(cat => cat.tracks);
```
Cela ne recupere que les 8 pistes du fichier JSON. Les pistes DB chargees par `AudioLibraryService.loadDbTracks()` ne sont jamais utilisees par ce composant.

## Solution

### 1. Modifier `useAudioLibrary.ts`
- Exposer une methode `getAllTracks()` depuis le hook, qui appelle `AudioLibraryService.getAllTracks()` (JSON + DB combinees).
- Ajouter un signal de rechargement apres initialisation pour s'assurer que les pistes DB sont disponibles.

### 2. Modifier `AudioLibrary.tsx` (composant de selection front-end)
- Utiliser `getAllTracks()` au lieu de `library.categories.flatMap(...)` pour la liste des pistes.
- S'assurer que le filtrage par categorie fonctionne aussi avec les pistes DB (en utilisant leur champ `category`/`mood`).
- Ajouter les categories DB dynamiquement si elles n'existent pas dans le JSON statique.

### 3. Modifier `AudioLibraryService.ts`
- S'assurer que `loadDbTracks()` est bien appelee et terminee avant que `getAllTracks()` soit utilise.
- Ajouter une methode `getDbCategories()` pour extraire les categories des pistes DB et les fusionner avec les categories JSON.

## Fichiers a modifier

| Fichier | Modification |
|---|---|
| `src/hooks/useAudioLibrary.ts` | Exposer `allTracks` et `allCategories` (JSON + DB fusionnes) |
| `src/components/tamtam/creator/AudioLibrary.tsx` | Utiliser `allTracks` au lieu de `library.categories` pour l'affichage |
| `src/services/AudioLibraryService.ts` | Ajouter methode pour categories dynamiques DB |

## Resultat attendu

Toute musique chargee via "Upload Musique" dans la Bibliotheque Anime sera automatiquement visible et selectionnable dans la bibliotheque de musique front-end, sans action supplementaire.

