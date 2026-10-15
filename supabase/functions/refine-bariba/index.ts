import { aiFetch, AI_CHAT_URL, getActiveAIKey } from "../_shared/ai-provider.ts";
import { normalizeBaribaText, isInvalidUiLikeText, applyHardCorrections, detectRefinementChanges, buildRefineSystemPrompt } from '../_shared/bariba-linguistic-rules.ts';
import { acceptRefinement, ensureMemory, estimateConfidence, foldBa, lexicalCoverage, memoryLookup } from '../_shared/translation-verifier.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Direction = 'fr-ba' | 'ba-fr';

/** A conservative editing guard, not a semantic accuracy certificate. */
export function controlledEdit(original: string, candidate: string, target: 'ba' | 'fr'): { accepted: boolean; reason: string } {
  const base = acceptRefinement(original, candidate, target);
  if (!base.accepted) return base;
  const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).sort().join('|');
  if (numbers(original) !== numbers(candidate)) return { accepted: false, reason: 'numbers_changed' };
  if (target === 'ba') {
    const existing = new Set(foldBa(original).split(' '));
    const introduced = foldBa(candidate).split(' ').filter(word => word && !existing.has(word));
    if (introduced.some(word => !/^\d+$/.test(word) && lexicalCoverage(word, 'ba') === 0)) return { accepted: false, reason: 'unattested_word' };
  } else {
    const negation = (s: string) => /\b(pas|jamais|aucun|aucune|sans|ni|non)\b/iu.test(s);
    if (negation(original) !== negation(candidate)) return { accepted: false, reason: 'negation_changed' };
  }
  return { accepted: true, reason: 'bounded_edit' };
}

export async function handleRefine(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const body = await req.json().catch(() => ({}));
    const text = normalizeBaribaText(typeof body.text === 'string' ? body.text : '');
    if (text.length > 4000) return reply({ error: 'Text too long' }, 413);
    const direction: Direction = body.direction === 'ba-fr' ? 'ba-fr' : 'fr-ba';
    const transcription = body.type === 'transcription';
    const target = direction === 'ba-fr' && !transcription ? 'fr' : 'ba';
    const originalInput = normalizeBaribaText(typeof body.originalInput === 'string' ? body.originalInput : '').slice(0, 4000);
    const normalizeTarget = (value: string) => target === 'fr' ? normalizeBaribaText(value) : applyHardCorrections(value);
    const fallback = normalizeTarget(text);
    const result = (refined: string, meta: Record<string, unknown>, error?: string) => reply({
      refined,
      changes: detectRefinementChanges({ original: text, refined, originalInput }),
      confidence: estimateConfidence(refined, target, false).confidence,
      confidenceIsProbability: false,
      linguisticQualityCertified: false,
      confidenceKind: meta.attested ? 'attested-reference' : 'heuristic-unverified',
      ...(error ? { error } : {}),
      meta: { duration: Date.now() - started, direction, type: transcription ? 'transcription' : 'translation', requiresHumanValidation: true, ...meta },
    });
    if (!text || isInvalidUiLikeText(text)) return result(text, { fallback: true, aiUsed: false }, 'Invalid input text');
    await ensureMemory();
    // A known source/target pair takes precedence over an unconstrained rewrite.
    const attested = originalInput && !transcription ? memoryLookup(originalInput, direction) : null;
    if (attested) return result(attested.translation, { fallback: false, aiUsed: false, attested: true, grade: attested.grade });
    if (!(await getActiveAIKey()).trim()) return result(fallback, { fallback: true, aiUsed: false }, 'llm_not_configured');
    const style = ['simplify', 'natural', 'formal'].includes(body.style) ? body.style : 'correct';
    const instructions: Record<string, string> = {
      correct: 'Corrige seulement les erreurs certaines.',
      simplify: 'Simplifie uniquement si tu peux conserver exactement toutes les informations.',
      natural: 'Améliore la fluidité uniquement avec des formulations attestées, sans inventer de mot.',
      formal: 'Ajuste le registre sans modifier les faits ni le sens.',
    };
    // `translate` is the legacy ByT5 alias for post-editing an existing draft.
    // French output must never be subjected to Bariba word substitutions.
    const basePrompt = target === 'fr'
      ? 'Tu révises une traduction française existante. Retourne uniquement du français. Ne retraduis pas le brouillon en bariba. Préserve les noms propres, nombres, négations et le sens. En cas de doute, recopie le brouillon.'
      : buildRefineSystemPrompt(transcription ? 'transcription' : 'translation', direction);
    const response = await aiFetch(AI_CHAT_URL, {
      body: JSON.stringify({ model: 'mistral-small-latest', max_tokens: 700, temperature: 0.1, messages: [
        { role: 'system', content: `${basePrompt}\n${instructions[style]}\nAucune information ajoutée. Préserve les nombres, noms et négations. Une correction non certaine doit être abandonnée. Retourne uniquement le texte final.` },
        { role: 'user', content: JSON.stringify({ source: originalInput || undefined, draft: text }) },
      ] }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(12_000)]),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      console.warn(JSON.stringify({ event: 'refine_ai_unavailable', status: response.status }));
      return result(fallback, { fallback: true, aiUsed: false, status: response.status }, failure.error?.code || 'llm_unavailable');
    }
    const data = await response.json();
    const candidate = normalizeTarget(String(data?.choices?.[0]?.message?.content || ''));
    const verdict = candidate && !isInvalidUiLikeText(candidate) ? controlledEdit(text, candidate, target) : { accepted: false, reason: 'invalid_response' };
    const refined = verdict.accepted ? candidate : fallback;
    console.log(JSON.stringify({ event: 'refine_completed', accepted: verdict.accepted, duration: Date.now() - started }));
    return result(refined, { fallback: !verdict.accepted, aiUsed: true, model: data.model || response.headers.get('X-Fitila-AI-Model') || '', provider: response.headers.get('X-Fitila-AI-Provider'), accepted: verdict.accepted, guard: verdict.reason, style });
  } catch (error) {
    // Preserve the draft on provider/network timeout. Never invent a corrected text.
    console.warn(JSON.stringify({ event: 'refine_unavailable', timeout: error instanceof Error && /abort|timeout/i.test(error.message) }));
    return reply({ refined: '', changes: [], confidence: 0, confidenceKind: 'unavailable', error: 'Refinement unavailable', meta: { fallback: true, aiUsed: false, duration: Date.now() - started } }, 503);
  }
}

if (Deno.env.get('FITILA_AI_TEST') !== '1') Deno.serve(handleRefine);
