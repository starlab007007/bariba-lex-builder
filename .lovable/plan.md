

# Correction de l'erreur de publication (photos, videos)

## Probleme

Quand on publie une photo ou une video (sans audio), l'insertion echoue car la colonne `audio_url` dans la table `tamtam_posts` est definie comme NOT NULL. Pour les publications photo/video, il n'y a pas d'audio, donc la valeur est null et la base de donnees rejette l'insertion.

Erreur exacte : `null value in column "audio_url" of relation "tamtam_posts" violates not-null constraint (23502)`

## Solution

### 1. Migration base de donnees

Rendre la colonne `audio_url` nullable :

```text
ALTER TABLE public.tamtam_posts ALTER COLUMN audio_url DROP NOT NULL;
```

### 2. Code - `src/hooks/useTamTamPosts.ts`

- Changer le type du parametre `audio_url` de `string` (obligatoire) a `string` (optionnel) dans l'interface de `createPost`
- Dans `insertData`, utiliser `postData.audio_url || null` au lieu de `postData.audio_url` directement

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | `audio_url` passe de NOT NULL a nullable |
| `src/hooks/useTamTamPosts.ts` | `audio_url` devient optionnel dans createPost |

## Impact

Toutes les publications (photo, video, texte) fonctionneront sans necessiter un fichier audio. Les publications audio existantes ne sont pas affectees.
