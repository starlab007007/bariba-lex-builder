

# Integrer les secrets HF pour les deux Spaces

## Contexte

Les deux fonctions Edge utilisent des URLs HuggingFace en dur. Le but est de les rendre configurables via les secrets existants (`BYT5_SPACE_URL` et `HF_SPACE_URL`) tout en gardant les URLs actuelles comme fallback.

## Modifications

### 1. `supabase/functions/byt5-bariba-translate/index.ts` (ligne 19-20)

Remplacer l'URL en dur par une lecture du secret `BYT5_SPACE_URL` avec fallback :

```typescript
const SPACE_URL = (
  Deno.env.get("BYT5_SPACE_URL") ||
  "https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space"
).replace(/\/$/, "");
```

### 2. `supabase/functions/bariba-tts/index.ts` (deja fait)

La modification precedente a deja ajoute le fallback pour `HF_SPACE_URL` vers `https://zimesongbian-baatonum-tts-api-v001.hf.space`. Rien a changer.

### 3. Detection HTML 404 dans `bariba-tts`

Ajouter une detection de reponse HTML (quand le Space dort et renvoie une page 404) dans la fonction `synthesizeWithHuggingFaceSpace`. Apres le `joinResp`, si le body commence par `<!DOCTYPE html>`, retourner un message clair avec `sleeping: true` au lieu de propager l'erreur brute.

## Secrets deja configures

Les deux secrets sont deja presents dans le projet :
- `BYT5_SPACE_URL` -- utilise par byt5-bariba-translate
- `HF_SPACE_URL` -- utilise par bariba-tts

Aucun nouveau secret n'est necessaire.

## Section technique

Fichiers modifies :
1. `supabase/functions/byt5-bariba-translate/index.ts` -- ligne 19-20 : ajout lecture secret + fallback
2. `supabase/functions/bariba-tts/index.ts` -- ajout detection `<!DOCTYPE html>` dans la reponse 404 du queue/join pour retourner `sleeping: true` proprement

