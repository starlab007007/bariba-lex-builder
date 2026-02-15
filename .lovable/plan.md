

# Corriger l'audio dans les feeds Patrimoine et Voix du Village

## Problemes diagnostiques

### 1. La duree d'enregistrement n'est pas stockee correctement
Dans `TamTamCreatePost`, le callback `mediaRecorder.onstop` capture une valeur perimee de `recordingTime` a cause d'une closure JavaScript. Le `recordingTime` est un etat React mis a jour de maniere asynchrone, mais `onstop` capture l'ancienne valeur au moment ou il est defini. Resultat : `duration_seconds = null` en base de donnees pour tous les posts audio.

### 2. La duree affichee dans le feed est fausse
`AudioFeedCard` utilise `post.duration_seconds || 60` comme duree. Comme `duration_seconds` est null, il affiche toujours "1:00". Le composant ne lit jamais la vraie duree depuis l'element `<audio>` du navigateur.

### 3. L'autoplay est bloque par le navigateur
Le composant tente de lancer l'audio automatiquement quand la carte devient active (`isActive`), mais les navigateurs mobiles bloquent l'autoplay sans geste utilisateur. L'erreur est avalee silencieusement par `.catch(() => {})`, donc l'utilisateur voit le vinyle tourner mais n'entend rien.

### 4. L'apercu audio dans TamTamCreatePost ne montre pas la vraie duree
Apres l'enregistrement, `audioDuration` est 0 ou incorrect a cause de la closure perimee, donc l'apercu affiche "0:00".

## Corrections prevues

### Fichier 1 : `src/components/tamtam/TamTamCreatePost.tsx`

**Corriger la capture de la duree** : Utiliser un `useRef` pour stocker la duree d'enregistrement en temps reel, plutot que de dependre de l'etat React dans le callback `onstop`.

```text
// Ajouter un ref pour la duree
const recordingTimeRef = useRef(0);

// Dans le timer d'enregistrement, mettre a jour le ref ET le state
useEffect(() => {
  if (isRecording) {
    interval = setInterval(() => {
      setRecordingTime(t => {
        const newTime = Math.min(t + 0.1, maxRecordingTime);
        recordingTimeRef.current = newTime;
        return newTime;
      });
    }, 100);
  }
}, [isRecording]);

// Dans onstop, utiliser le ref
mediaRecorder.onstop = () => {
  const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
  const reader = new FileReader();
  reader.onloadend = () => {
    setAudioBase64(reader.result as string);
    setAudioDuration(Math.round(recordingTimeRef.current));
    setStep('preview');
  };
  reader.readAsDataURL(blob);
  stream.getTracks().forEach(track => track.stop());
};
```

### Fichier 2 : `src/pages/tamtam/TamTamSocial.tsx` (AudioFeedCard)

**A. Utiliser la duree reelle de l'element audio** : Ajouter un state `audioDuration` qui se met a jour via l'evenement `loadedmetadata` de l'element `<audio>`, au lieu de dependre de `post.duration_seconds`.

```text
const [audioDuration, setAudioDuration] = useState(post.duration_seconds || 0);

// Dans un useEffect
const audio = audioRef.current;
const onMeta = () => setAudioDuration(audio.duration);
audio.addEventListener('loadedmetadata', onMeta);
```

**B. Supprimer l'autoplay et exiger un geste utilisateur** : Ne plus lancer `.play()` automatiquement quand `isActive` change. A la place, afficher clairement le bouton Play pour que l'utilisateur touche l'ecran. Cela respecte les politiques des navigateurs mobiles et garantit que l'audio se joue.

```text
// Supprimer l'autoplay dans useEffect
// L'audio ne demarre que quand l'utilisateur appuie sur Play
```

**C. Afficher la duree correctement** : Utiliser `audioDuration` (depuis l'element audio) dans `formatTime` au lieu de la valeur statique de la base.

## Resume des fichiers modifies

1. **`src/components/tamtam/TamTamCreatePost.tsx`** : Corriger la capture de duree avec un ref
2. **`src/pages/tamtam/TamTamSocial.tsx`** : Corriger AudioFeedCard (duree reelle, suppression autoplay, affichage)

