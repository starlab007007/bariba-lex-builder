

# Correction du bug gpt-5-nano dans Fitila IA

## Probleme identifie

Le modele principal `openai/gpt-5-nano` echoue a **chaque requete** avec une erreur HTTP 400 :
```
Unsupported parameter: 'max_tokens' is not supported with this model.
```

Le fallback sur `gemini-2.5-flash-lite` fonctionne, mais cela ajoute 1-2 secondes de latence inutile a chaque message.

## Etat actuel verifie

| Composant | Statut | refine-bariba |
|-----------|--------|---------------|
| Traducteur (PhraseTranslator) | OK | Oui, via byt5-bariba-translate (lignes 520-543) |
| Fitila IA (fitila-ia-chat) | Fonctionne avec fallback | Oui, indirectement via byt5-bariba-translate |
| byt5-bariba-translate | OK | Appelle refine-bariba en post-raffinage |
| refine-bariba | OK | Fonctionne correctement |

## Correction

### Fichier : `supabase/functions/fitila-ia-chat/index.ts`

**Modification dans `callLLMWithFallback`** (ligne 71-76) :

Remplacer l'envoi uniforme de `max_tokens` par une logique conditionnelle :
- Pour les modeles OpenAI (`gpt-5-nano`, `gpt-5-mini`) : utiliser `max_completion_tokens` au lieu de `max_tokens`
- Pour les modeles Google (Gemini) : garder `max_tokens`

```typescript
// Avant (ligne 71-76)
body: JSON.stringify({
  model,
  messages: args.messages,
  temperature: args.temperature,
  max_tokens: args.maxTokens,
}),

// Apres
const isOpenAI = model.startsWith("openai/");
body: JSON.stringify({
  model,
  messages: args.messages,
  temperature: args.temperature,
  ...(isOpenAI
    ? { max_completion_tokens: args.maxTokens }
    : { max_tokens: args.maxTokens }),
}),
```

### Impact

- `gpt-5-nano` redevient le modele principal (plus rapide, moins cher)
- Supprime 1-2s de latence causee par le fallback systematique
- Aucun changement sur le traducteur (non affecte)
- Le pipeline refine-bariba reste inchange

