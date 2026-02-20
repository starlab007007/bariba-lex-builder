
# Correction du bug gpt-5-nano - TERMINÉ ✅

## Corrections appliquées

### `supabase/functions/fitila-ia-chat/index.ts`

- **`max_tokens` → `max_completion_tokens`** pour les modèles OpenAI (gpt-5-nano, gpt-5-mini)
- **`temperature` supprimé** pour les modèles OpenAI (non supporté par gpt-5-nano)
- Les modèles Google (Gemini) conservent `temperature` + `max_tokens`

### Résultat

- ✅ `gpt-5-nano` ne crash plus en HTTP 400
- ⚠️ `gpt-5-nano` retourne parfois des réponses vides → fallback gracieux sur `gemini-2.5-flash-lite`
- ✅ Pipeline complet fonctionne : LLM (FR) → ByT5 (BA) → réponse `{ response_ba, response_fr, fallback }`
- ✅ `refine-bariba` est appliqué via `byt5-bariba-translate`
- ✅ Traducteur (PhraseTranslator) non affecté, fonctionne normalement
