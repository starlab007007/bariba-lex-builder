import { lookupLinguisticReferences, type ReferenceDependencies } from './transcription-resources.ts';
import { buildTranslationReview, constrainTranslationPairs, translationQueries, type PairedReference, type TranslationReferenceReview } from './translation-reference-core.ts';
import type { RepairLanguage } from './transcription-repair.ts';
export async function reviewTranslationReferences(raw: string, language: RepairLanguage, scope: 'source' | 'translation', sourceText: string, signal?: AbortSignal, deps: ReferenceDependencies = { env: key => Deno.env.get(key), fetch: globalThis.fetch }): Promise<TranslationReferenceReview> {
  const deadline = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8000)]);
  const queries = translationQueries(raw);
  const grouped = await lookupLinguisticReferences(queries.map(query => query.text), language, deadline, deps, 'translation');
  const report = buildTranslationReview(raw, language, scope, queries, grouped);
  if (scope === 'source' || (!report.proposals.length && !report.lexical_proposals.length)) return report;
  const ids = [...new Set([...report.proposals.flatMap(proposal => proposal.sources), ...report.lexical_proposals.flatMap(proposal => proposal.sources)].map(reference => reference.source_id))].filter(id => /^[\p{L}\p{N}:._-]+$/u.test(id)).slice(0, 72);
  let pairs: PairedReference[] | null = null;
  try {
    const base = deps.env('SUPABASE_URL'), key = deps.env('SUPABASE_SERVICE_ROLE_KEY');
    if (base && key && ids.length) {
      const url = new URL(`${base}/rest/v1/fitila_asr_references`);
      url.searchParams.set('select', 'text,source,source_id'); url.searchParams.set('language', `eq.${language === 'bba' ? 'fr' : 'bba'}`);
      url.searchParams.set('source_id', `in.(${ids.join(',')})`); url.searchParams.set('limit', '100');
      const response = await deps.fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: deadline });
      if (response.ok) { const data = await response.json(); if (Array.isArray(data) && data.length <= 100) pairs = data.filter(row => typeof row.text === 'string' && row.text.length <= 320 && ids.includes(row.source_id)); }
    }
  } catch { /* Preserve the draft if bilingual evidence cannot be retrieved. */ }
  return constrainTranslationPairs(report, sourceText, language === 'bba' ? 'fr' : 'bba', pairs);
}
