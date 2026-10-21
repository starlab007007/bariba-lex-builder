import { refineDeterministic } from '../_shared/deterministic-refine.ts';
import { repairRecognizedTranscript } from '../_shared/transcription-resources.ts';
import { normalizeBaribaText, isInvalidUiLikeText, applyHardCorrections, detectRefinementChanges } from '../_shared/bariba-linguistic-rules.ts';
import { acceptRefinement, baSurfaceLexicon, ensureMemory, estimateConfidence, foldBa, lexicalCoverage, memoryLookup } from '../_shared/translation-verifier.ts';

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
    if (typeof body.text === 'string' && body.text.length > 5000) return reply({ error: 'Text too long' }, 413);
    const text = normalizeBaribaText(typeof body.text === 'string' ? body.text : '');
    if (text.length > 4000) return reply({ error: 'Text too long' }, 413);
    const direction: Direction = body.direction === 'ba-fr' ? 'ba-fr' : 'fr-ba';
    if (body.type === 'reference-review') {
      // Retired typed/target rewrite route. Cached clients must not fall through
      // into the normal translation post-editor or consume a provider request.
      return reply({ error: 'reference_review_retired', code: 'voice_transcription_only', message: 'Les propositions FITILA sont réservées aux transcriptions vocales.' }, 410);
    }
    const transcription = body.type === 'transcription';
    if (transcription) {
      const raw = typeof body.text === 'string' ? body.text : '';
      const repair = await repairRecognizedTranscript(raw, ['fr','french'].includes(body.language) ? 'fr' : 'bba', req.signal);
      return reply({ refined: repair.text, raw_transcription: repair.raw, repair, changes: [], confidence: 0, confidenceKind: 'not-measured', confidenceIsProbability: false, linguisticQualityCertified: false, meta: { type: 'transcription', aiUsed: false, requiresHumanValidation: true, duration: Date.now() - started, fallback: repair.status === 'unavailable' } });
    }
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
    // Refinement is deterministic (rules + attested lexicon): no language model, so it is identical online and
    // offline, instant, and never rewrites the meaning. See _shared/deterministic-refine.ts.
    const polished = refineDeterministic(originalInput, fallback, target === 'ba', target === 'ba' ? { surface: baSurfaceLexicon(), fold: foldBa } : undefined);
    console.log(JSON.stringify({ event: 'refine_completed', rules: polished.changes.length, duration: Date.now() - started }));
    return result(polished.text, { fallback: false, aiUsed: false, accepted: true, guard: 'rules', stage: 'rules', changes_rules: polished.changes, style: 'correct' });
  } catch (error) {
    // Preserve the draft on provider/network timeout. Never invent a corrected text.
    console.warn(JSON.stringify({ event: 'refine_unavailable', timeout: error instanceof Error && /abort|timeout/i.test(error.message) }));
    return reply({ refined: '', changes: [], confidence: 0, confidenceKind: 'unavailable', error: 'Refinement unavailable', meta: { fallback: true, aiUsed: false, duration: Date.now() - started } }, 503);
  }
}

if (Deno.env.get('FITILA_AI_TEST') !== '1') Deno.serve(handleRefine);
