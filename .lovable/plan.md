

# Correction de la connexion au modele ByT5 mis a jour

## Probleme

Le modele `zimesongbian/modele_byt5_bariba_expert_api_v03_improve` a ete mis a jour. L'API expose maintenant un endpoint nomme `/translate_pipeline` avec 5 parametres. Le code actuel utilise `fn_index: 2` qui ne correspond plus au bon endpoint apres la mise a jour, ce qui cause le timeout de connexion.

## Solution

Modifier `supabase/functions/byt5-bariba-translate/index.ts` pour utiliser `api_name: "/translate_pipeline"` au lieu de `fn_index: 2` dans l'appel Gradio. C'est plus stable car le nom d'API ne change pas meme si l'ordre des fonctions change.

## Changement unique

### `supabase/functions/byt5-bariba-translate/index.ts`

- Dans `callGradioTranslate`, remplacer `fn_index: 2` par `api_name: "/translate_pipeline"` dans le body du `queue/join`
- Le reste du flux (queue/join -> queue/data polling -> SSE parsing) reste identique car c'est le protocole standard Gradio

## Detail technique

```text
Avant:
  body: JSON.stringify({ data: data, fn_index: 2, session_hash: sessionHash })

Apres:
  body: JSON.stringify({ data: data, fn_index: 0, api_name: "/translate_pipeline", session_hash: sessionHash })
```

Les 5 parametres envoyes dans `data` correspondent deja exactement a ce que l'API attend : `[text, direction, mode, advanced, autocorrect]`.

## Impact

- Correction immediate de la connexion au modele
- Aucun changement cote client
- Redeploy automatique de l'edge function

