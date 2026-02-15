

# Corriger la visibilite des publications Patrimoine et Voix du Village

## Diagnostic

L'analyse de la base de donnees montre que les publications Patrimoine et Voix du Village existent bien avec les bons topics (`patrimoine`, `mavoix`), mais leur `audio_url` est **NULL**. Le probleme vient de deux endroits :

### Cause 1 : L'audio n'est pas uploade vers le stockage

Le flux de creation dans `TamTamCreatePost` enregistre l'audio en base64 (`audio_base64`) mais ne l'uploade jamais vers le stockage cloud. Quand le formulaire est soumis :
- `TamTamCreatePost.handleSubmit` envoie `audio_base64` (pas `audio_url`)
- `TamTamSocial.handleCreatePost` lit `data.audio_url` (qui est `undefined`)
- `useTamTamPosts.createPost` stocke `audio_url: null` en base

### Cause 2 : Les filtres de feed exigent un audio non-vide

Les filtres `patrimoine` et `mavoix` dans `getCurrentPosts` verifient tous les deux :
```text
const hasAudio = post.audio_url && post.audio_url.trim().length > 0;
return hasAudio && (post.topic === 'patrimoine' || ...);
```
Comme `audio_url` est NULL, les posts sont systematiquement filtres.

## Corrections

### 1. Uploader l'audio base64 vers le stockage (TamTamSocial.tsx)

Dans `handleCreatePost`, avant d'appeler `createPost`, convertir le `audio_base64` en Blob, l'uploader vers le bucket `tamtam-audio`, et passer l'URL publique resultante comme `audio_url`.

### 2. Relaxer les filtres de feed (TamTamSocial.tsx)

Modifier les filtres `patrimoine` et `mavoix` pour ne plus exiger `hasAudio`. Un post avec le bon `topic` doit apparaitre dans son feed meme s'il n'a pas d'audio (cas d'erreur d'upload ou de contenu texte). L'audio reste le contenu principal mais n'est plus bloquant pour l'affichage.

### 3. Corriger les posts existants deja en base (optionnel)

Les 4 posts existants avec `audio_url: null` resteront visibles grace au filtre relaxe. Si l'utilisateur re-publie, l'audio sera correctement uploade.

## Fichiers a modifier

### `src/pages/tamtam/TamTamSocial.tsx`

**handleCreatePost** : Ajouter la logique d'upload audio base64 vers le stockage :

```text
const handleCreatePost = useCallback(async (data: any) => {
  try {
    const topic = data.category === 'village_voice' ? 'mavoix' : (data.category || createPostType);
    
    // Upload audio base64 to storage if present
    let audioUrl = data.audio_url || null;
    if (!audioUrl && data.audio_base64) {
      const response = await fetch(data.audio_base64);
      const blob = await response.blob();
      const fileName = `posts/audio_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('tamtam-audio').getPublicUrl(uploadData.path);
        audioUrl = urlData.publicUrl;
      }
    }
    
    const postData = { ...data, audio_url: audioUrl, topic };
    await createPost(postData);
    // ... rest unchanged
  }
}, [...]);
```

**getCurrentPosts** : Supprimer la condition `hasAudio` obligatoire :

```text
case 'patrimoine':
  return allPosts.filter(p => {
    const post = p as any;
    return (
      post.topic === 'patrimoine' || 
      post.topic === 'culture' || 
      post.template_id?.includes('conte') ||
      post.template_id?.includes('chant') ||
      post.template_id?.includes('proverbe') ||
      (post.culture_score && post.culture_score > 0)
    );
  });

case 'mavoix':
  return allPosts.filter(p => {
    const post = p as any;
    return (
      post.topic === 'mavoix' || 
      post.topic === 'annonce' ||
      post.topic === 'village_voice' ||
      post.template_id?.includes('annonce') ||
      post.template_id?.includes('question') ||
      post.template_id?.includes('merci')
    );
  });
```

### `src/pages/tamtam/TamTamHome.tsx`

Meme correction d'upload audio base64 dans le `handleCreatePost` de cette page.

## Resume

- **2 fichiers modifies** : `TamTamSocial.tsx` et `TamTamHome.tsx`
- Les publications existantes deviendront visibles immediatement grace au filtre relaxe
- Les nouvelles publications auront leur audio correctement uploade et stocke
