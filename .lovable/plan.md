

# Supprimer Lovable AI du traducteur — ByT5 + Raffinement linguistique uniquement

## Objectif

Remplacer tous les fallbacks `ai-translate-lovable` (traduction IA generique sans connaissance Bariba) par `refine-bariba` en mode `translate` (traduction guidee par la base de connaissances linguistiques : grammaire SOV, idiomes, paires de reference).

## Flux apres modification

```text
Texte utilisateur
      |
      v
[ByT5 Expert (HuggingFace)]
      |
  Succes? --oui--> [refine-bariba type='translation'] --> Resultat raffine
      |
     non
      |
      v
[refine-bariba type='translate'] <-- grammaire + idiomes + paires de reference
      |
      v
Traduction basee sur connaissances linguistiques (method: 'knowledge-based')
```

## 4 fichiers a modifier

### 1. `supabase/functions/refine-bariba/index.ts`

**Ajout du mode `translate`** dans `buildSystemPrompt()` :
- Nouveau cas `type === 'translate'` avec un prompt specifique :
  - "Traduis ce texte en utilisant EXCLUSIVEMENT les regles grammaticales, idiomes et paires de reference fournis"
  - "Si un mot n'a pas d'equivalent connu, translittere-le entre crochets"
  - "Retourne UNIQUEMENT la traduction"
- Temperature abaissee a 0.1 pour ce mode (au lieu de 0.2)
- La regle "Ne traduis PAS" du prompt actuel est remplacee par "Traduis directement" quand `type === 'translate'`

### 2. `supabase/functions/byt5-bariba-translate/index.ts`

- **Supprimer** la fonction `lovableFallbackTranslate()` (lignes 24-71) et le type `LovableFallbackResult` (lignes 20-22)
- **Lignes 478-535** (ByT5 echoue) : remplacer l'appel `lovableFallbackTranslate` par un appel a `refine-bariba` en mode `translate` avec le texte original, direction, et originalInput
- **Lignes 560-593** (ByT5 retourne du texte UI invalide) : meme remplacement
- **Lignes 666-675** (pas de traduction valide) : ajouter le meme fallback `refine-bariba` mode `translate` au lieu de retourner 503 directement
- Method retournee : `'knowledge-based'` au lieu de `'lovable-ai-fallback'`
- Conserver le raffinage existant pour les resultats ByT5 valides (lignes 606-645, inchange)

### 3. `src/hooks/useSimpleTranslation.ts`

- **Supprimer** les appels `supabase.functions.invoke('ai-translate-lovable', ...)` dans `translateFrenchToBariba` (lignes 55-68) et `translateBaribaToFrench` (lignes 113-126)
- **Remplacer** par `supabase.functions.invoke('refine-bariba', { body: { text, type: 'translate', direction: 'fr-ba' ou 'ba-fr' } })`
- Extraire la traduction depuis `data.refined` au lieu de `data.translation`
- Method : `'knowledge-based'`
- Mettre a jour les commentaires du hook

### 4. `src/services/ByT5TranslationService.ts`

- **Supprimer** la fonction `lovableFallback()` (lignes 67-89) qui appelle `ai-translate-lovable`
- **Remplacer** par une fonction `knowledgeFallback()` qui appelle `refine-bariba` en mode `translate`
- Extraire la traduction depuis `data.refined`
- Retourner `method: 'knowledge-based'` au lieu de `'lovable-ai-fallback'`
- Adapter les 4 points d'appel : ligne 93 (unhealthy), ligne 118 (edge error), ligne 125 (data error), ligne 132 (invalid), ligne 157 (exception)

## Details techniques

### Nouveau prompt `translate` dans refine-bariba

```text
TACHE — TRADUCTION DIRECTE ({direction}) :
Tu dois traduire ce texte en utilisant EXCLUSIVEMENT :
1. Les regles grammaticales SOV ci-dessus
2. Les expressions idiomatiques de reference
3. Les paires de traduction de reference
4. Le vocabulaire et la structure de la langue Bariba

Si un mot n'a pas d'equivalent connu, translittere-le et marque-le entre crochets [mot].
Retourne UNIQUEMENT la traduction, sans explication ni commentaire.
```

### Appel refine-bariba comme fallback (pattern reutilise partout)

```typescript
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const ctrl = new AbortController();
const to = setTimeout(() => ctrl.abort(), 8000);
const resp = await fetch(`${SUPABASE_URL}/functions/v1/refine-bariba`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, type: 'translate', direction }),
  signal: ctrl.signal,
});
clearTimeout(to);
const data = await resp.json();
// data.refined = traduction
```

### Impact sur la latence

- Cas nominal (ByT5 reussit) : inchange
- Fallback : ~1-2s (meme vitesse que l'ancien Lovable AI, mais avec prompt linguistique enrichi)
- Plus aucun appel a `ai-translate-lovable`

