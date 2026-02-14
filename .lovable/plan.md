
# Corrections de l'editeur video, musique, et brouillons

## 4 problemes a corriger

---

## 1. Timeline video adaptee a la duree reelle

**Probleme** : La MiniTimeline ne s'adapte pas visuellement a la duree de la video capturee.

**Solution** : La `totalDuration` est deja calculee dynamiquement depuis les segments (`segments.reduce(...)`), et le segment est cree dans `finishCapture` avec `duration`, `startTime: 0`, `endTime: duration`. Le calcul est correct. Le probleme est que la video enregistree utilise `lengthSec` (le timer max) au lieu de la duree reelle d'enregistrement.

**Correction dans `FullscreenCreator.tsx`** :
- Dans le handler video (ligne ~1713), quand `stopRecordingToBlob()` retourne le blob, calculer la duree reelle de la video via un element `<video>` temporaire au lieu de passer `lengthSec`
- Passer cette duree reelle a `finishCapture(blob, "video", realDuration)` pour que le segment ait la bonne longueur
- Meme chose pour les imports album : extraire la duree reelle du fichier video importe

---

## 2. Timeline visible uniquement pour les videos

**Probleme** : La MiniTimeline s'affiche aussi pour les photos et bursts.

**Solution dans `FullscreenCreator.tsx`** :
- Modifier la condition d'affichage (ligne ~3412) de :
```
{hasCapture && segments.length > 0 && (
```
a :
```
{hasCapture && segments.length > 0 && capturedType === "video" && (
```
- Cela masque la timeline pour les photos, bursts et textes

---

## 3. Musique dans le rendu final

**Probleme** : La musique selectionnee est transmise via `selectedAudioTrack` dans le payload `onPublish`, mais elle n'est pas mixee dans le fichier video/photo final. Le feed recoit juste l'URL de la musique mais ne la joue pas.

**Solution** :
- **Pour les videos** : Dans la fonction `publish()`, avant d'appeler `onPublish`, mixer l'audio de la musique selectionnee dans le blob video en utilisant le Web Audio API + MediaRecorder (similar au pipeline Griot)
- **Pour les photos/bursts** : Passer le `musicUrl` et `musicTrimStart`/`musicTrimDuration` dans le payload pour que le feed puisse jouer la musique en arriere-plan lors de l'affichage
- Ajouter un etat `musicTrimStart` et `musicTrimDuration` pour stocker la portion de musique choisie via le MusicTrimmer
- Connecter le `MusicTrimmer` dans `AudioLibrary` pour que `onTrimChange` remonte les valeurs au `FullscreenCreator`

**Fichiers modifies** :
- `FullscreenCreator.tsx` : ajouter etats de trim, mixer musique dans le blob video avant publication
- Creer `src/utils/AudioMixer.ts` : utilitaire pour mixer un audio dans un blob video via Web Audio API

---

## 4. Gestion de la fermeture et brouillons

**Probleme** : Quand on ferme le createur pendant une creation, pas de confirmation de perte de donnees. Et quand on revient, l'ancien contenu peut encore etre visible.

**Solution dans `FullscreenCreator.tsx`** :
- Ajouter un etat `showDiscardConfirm` (boolean)
- Quand l'utilisateur clique X (fermer) et qu'il y a une capture en cours (`hasCapture === true` ou `isRecording`), afficher une modale de confirmation : "Vous allez perdre votre creation. Continuer ?"
  - "Oui, quitter" : appeler `retake()` puis `onClose()`  
  - "Annuler" : fermer la modale
- Reinitialiser TOUS les etats dans un `useEffect` qui se declenche quand `open` passe de `false` a `true`, pour garantir une creation vierge a chaque ouverture

**Fichiers modifies** :
- `FullscreenCreator.tsx` : ajouter la modale de confirmation et le reset a l'ouverture

---

## Resume des fichiers

| Fichier | Modifications |
|---------|--------------|
| `src/components/tamtam/FullscreenCreator.tsx` | 1. Duree video reelle au lieu de lengthSec. 2. Timeline video uniquement. 3. Etats trim musique + mixage audio. 4. Modale discard + reset a l'ouverture |
| `src/utils/AudioMixer.ts` | **Nouveau** - Utilitaire pour mixer une piste audio dans un blob video via Web Audio API |

## Details techniques

### Calcul duree reelle video
```text
const b = await stopRecordingToBlob();
const realDuration = await getVideoDuration(b); // via <video> temporaire
await finishCapture(b, "video", realDuration);
```

### Mixage audio dans video
```text
1. Decoder le blob video en pistes audio/video
2. Decoder la musique selectionnee (portion trimmed)
3. Mixer les deux AudioBuffers
4. Re-encoder via MediaRecorder avec canvas + audio context
5. Retourner le nouveau blob
```

### Modale de confirmation
```text
"Quitter la creation ?"
"Votre contenu en cours sera perdu."
[Annuler]  [Quitter]
```

### Reset a l'ouverture
```text
useEffect(() => {
  if (open) {
    // Reset ALL state to initial values
    setHasCapture(false);
    setCapturedBlob(null);
    setSegments([]);
    setCaption('');
    setMusicTrack(null);
    setSelectedAudioTrack(null);
    // ... tous les autres etats
  }
}, [open]);
```
