import { asrSearchKey, editDistance, normalizeTranscript, reconstructTranscript, reconstructionGuard, transcriptSegments, type RepairLanguage, type TranscriptReference, type TranscriptRepair } from './transcription-repair.ts';
export type ReferenceQuery = { text: string; start: number; end: number; kind: 'phrase' | 'term' };
export type LexicalProposal = { from: string; to: string; text: string; sources: TranscriptReference[]; start: number; end: number };
export type TranslationReferenceReview = TranscriptRepair & { scope: 'source' | 'translation'; lexical_proposals: LexicalProposal[]; recognized_terms: number; analyzed_terms: number; total_terms: number; bilingual_check: 'not-applicable' | 'checked' | 'unavailable'; paired_references?: PairedReference[] };
export function translationQueries(raw: string): ReferenceQuery[] {
  const text = normalizeTranscript(raw), segments = transcriptSegments(text);
  const phrases: ReferenceQuery[] = segments.slice(0, 12).map(segment => ({ ...segment, kind: 'phrase' }));
  const terms = [...text.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)].map(match => ({ text: match[0], start: match.index!, end: match.index! + match[0].length, kind: 'term' as const }));
  const unique = new Map<string, ReferenceQuery>();
  for (const term of terms) if (!unique.has(asrSearchKey(term.text))) unique.set(asrSearchKey(term.text), term);
  // Long texts retain coverage through sentence queries; terms are bounded separately.
  return [...phrases, ...[...unique.values()].slice(0, 24 - phrases.length)];
}
const isLexical = (reference: TranscriptReference) => !['pending','rejected'].includes(reference.validation) &&
  ['word','form','mot','forme'].includes(reference.kind) && !/\s/.test(reference.text.trim());
export function buildTranslationReview(raw: string, lang: RepairLanguage, scope: 'source' | 'translation', queries: ReferenceQuery[], grouped: TranscriptReference[][] | null): TranslationReferenceReview {
  const text = normalizeTranscript(raw), phraseCount = queries.filter(query => query.kind === 'phrase').length;
  const report: TranslationReferenceReview = { ...reconstructTranscript(raw, lang, grouped?.slice(0, phraseCount) ?? [], grouped === null, true), scope, lexical_proposals: [], recognized_terms: 0, analyzed_terms: 0, total_terms: new Set([...text.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)].map(match => asrSearchKey(match[0]))).size, bilingual_check: scope === 'source' ? 'not-applicable' : 'unavailable' };
  if (!grouped) return report;
  for (let n = phraseCount; n < queries.length; n++) {
    const query = queries[n], references = (grouped[n] ?? []).filter(isLexical); report.analyzed_terms++;
    if (references.some(reference => reference.text.normalize('NFC').toLowerCase() === query.text.toLowerCase())) { report.recognized_terms++; continue; }
    // Uppercase words may be names; word-only suggestions never rename them.
    if (/^\p{Lu}/u.test(query.text) || query.text.length < 4) continue;
    const seen = new Set<string>();
    for (const reference of references) {
      const to = normalizeTranscript(reference.text), key = asrSearchKey(query.text), nextKey = asrSearchKey(to);
      const distance = editDistance(key, nextKey), ratio = 1 - distance / Math.max(key.length, nextKey.length, 1);
      if (distance > (key.length >= 8 ? 2 : 1) || ratio < 0.78 || to === query.text || seen.has(to)) continue;
      const candidate = text.slice(0, query.start) + to + text.slice(query.end);
      if (reconstructionGuard(text, candidate, lang, 5000)) continue;
      seen.add(to); report.lexical_proposals.push({ from: query.text, to, text: candidate, sources: references.filter(ref => normalizeTranscript(ref.text) === to), start: query.start, end: query.end });
      if (seen.size >= 2 || report.lexical_proposals.length >= 8) break;
    }
    if (report.lexical_proposals.length >= 8) break;
  }
  return report;
}
export type PairedReference = Pick<TranscriptReference, 'text' | 'source' | 'source_id'>;
/** A nearby target sentence is eligible only if its paired source also matches the input. */
export function constrainTranslationPairs(report: TranslationReferenceReview, sourceText: string, sourceLang: RepairLanguage, pairs: PairedReference[] | null): TranslationReferenceReview {
  const result = { ...report, bilingual_check: pairs ? 'checked' as const : 'unavailable' as const, paired_references: pairs ?? [] };
  const segments = transcriptSegments(normalizeTranscript(sourceText)).slice(0, 24);
  result.proposals = report.proposals.filter(proposal => proposal.changes.every(change => proposal.sources.some(reference =>
    normalizeTranscript(reference.text) === normalizeTranscript(change.to) && (pairs ?? []).some(pair => pair.source === reference.source && pair.source_id === reference.source_id && segments.some(segment => {
      const check = reconstructTranscript(segment.text, sourceLang, [[{ ...pair, validation: 'catalogue', kind: 'phrase' }]], false, true);
      return check.matched_segments > 0 || check.proposals.length > 0;
    }))
  )));
  // Word-level alternatives also need a paired source; an isolated plausible word is insufficient.
  result.lexical_proposals = report.lexical_proposals.filter(proposal => proposal.sources.some(reference => (pairs ?? []).some(pair => pair.source === reference.source && pair.source_id === reference.source_id &&
    asrSearchKey(sourceText).split(' ').includes(asrSearchKey(pair.text)))));
  if (!result.proposals.length && report.proposals.length) result.status = 'unchanged';
  return result;
}
