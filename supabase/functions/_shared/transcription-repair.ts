// Reference-constrained post-ASR reconstruction. Scores are similarities, never probabilities.
export type RepairLanguage = 'bba' | 'fr';
export type TranscriptReference = { text: string; source: string; source_id: string; validation: string; kind: string; rank?: number };
export type TranscriptProposal = { text: string; similarity: number; sources: TranscriptReference[]; changes: { from: string; to: string }[] };
export type TranscriptRepair = {
  version: 'reference-v1'; raw: string; text: string; language: RepairLanguage;
  status: 'normalized' | 'suggestion' | 'ambiguous' | 'matched' | 'unchanged' | 'unavailable';
  proposals: TranscriptProposal[]; source_count: number; matched_segments: number; analyzed_segments: number; total_segments: number;
  requires_confirmation: true; linguistic_quality_certified: false; score_is_probability: false;
};
export const normalizeTranscript = (text: string) => text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
const words = (text: string) => (text.normalize('NFC').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? []);
export function asrSearchKey(text: string): string {
  return normalizeTranscript(text).toLowerCase().replace(/’/g, "'").normalize('NFD')
    .replace(/[\u0300\u0301\u0302\u0304\u030C]/g, '').normalize('NFC')
    .replace(/ɔ/g, 'o').replace(/ɛ/g, 'e').replace(/ʋ/g, 'u').replace(/ŋ/g, 'ng').replace(/ɲ/g, 'ny')
    .replace(/[^\p{L}\p{M}\p{N}']+/gu, ' ').trim();
}
export function editDistance(a: string, b: string): number {
  const left = Array.from(a), right = Array.from(b);
  let row = Array.from({ length: right.length + 1 }, (_, n) => n);
  for (let i = 1; i <= left.length; i++) {
    const next = [i];
    for (let j = 1; j <= right.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    row = next;
  }
  return row[right.length];
}
const similarity = (a: string, b: string) => 1 - editDistance(a, b) / Math.max(Array.from(a).length, Array.from(b).length, 1);
const negativeFr = new Set(['ne', "n'", 'pas', 'jamais', 'aucun', 'aucune', 'sans', 'ni', 'non', 'plus']);
const negativeBa = new Set(['kun', 'waa', 'wa', 'mɔ', 'mo']);
const personsFr = new Set(['je', "j'", 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on']);
const personsBa = new Set(['na', 'n', 'ǹ', 'a', 'u', 'i', 'ba', 'bu', 'bɛ', 'be']);
function protectedSequence(text: string, set: Set<string>): string {
  return words(text).map(asrSearchKey).filter(token => set.has(token) || (token.startsWith("n'") && set.has("n'")) || (token.startsWith("j'") && set.has("j'"))).map(token => token.startsWith("n'") ? "n'" : token.startsWith("j'") ? "j'" : token).join('|');
}
/** Refuse reconstructions that alter explicit facts, polarity, persons or named tokens. */
export function reconstructionGuard(raw: string, candidate: string, lang: RepairLanguage, maxLength = 320): string | null {
  if (normalizeTranscript(candidate).length > maxLength || !candidate.trim()) return 'invalid_length';
  if (/[<>]|https?:|www\.|\b(?:undefined|null|loading|submit|share via)\b/iu.test(candidate)) return 'invalid_reference';
  const numbers = (s: string) => (s.match(/\p{N}+(?:[.,:/-]\p{N}+)*/gu) ?? []).join('|');
  if (numbers(raw) !== numbers(candidate)) return 'numbers_changed';
  if (protectedSequence(raw, lang === 'fr' ? negativeFr : negativeBa) !== protectedSequence(candidate, lang === 'fr' ? negativeFr : negativeBa)) return 'negation_changed';
  if (protectedSequence(raw, lang === 'fr' ? personsFr : personsBa) !== protectedSequence(candidate, lang === 'fr' ? personsFr : personsBa)) return 'person_changed';
  const originalWords = words(raw), proposed = new Set(words(candidate).map(token => token.toLowerCase()));
  const names = originalWords.filter((token, n) => n > 0 && /^\p{Lu}/u.test(token));
  if (names.some(name => !proposed.has(name.toLowerCase()))) return 'name_changed';
  // A first capitalized token can also be a name. Only equivalent folded spelling is allowed.
  const firstWord = originalWords[0];
  if (firstWord && /^\p{Lu}/u.test(firstWord) && !proposed.has(firstWord.toLowerCase()) &&
    !words(candidate).some(word => asrSearchKey(word) === asrSearchKey(firstWord))) return 'name_changed';
  const identifiers = (s: string) => s.match(/[\w.+-]+@[\w.-]+|https?:\/\/\S+|\b[A-Z]{2,}\d+\b/g) ?? [];
  if (identifiers(raw).join('|') !== identifiers(candidate).join('|')) return 'identifier_changed';
  if (Math.abs(words(candidate).length - originalWords.length) > Math.max(1, Math.floor(originalWords.length / 5))) return 'content_added_or_removed';
  if (lang === 'fr' && /[ɔɛŋʋɲ]/iu.test(candidate)) return 'language_mismatch';
  if (lang === 'bba' && (candidate.toLowerCase().match(/\b(?:les|une|des|vous|nous|cette|avec|sont|pour|dans|marigot)\b/g) ?? []).length >= 3) return 'language_mismatch';
  return null;
}
export type TranscriptSegment = { text: string; start: number; end: number };
export function transcriptSegments(text: string): TranscriptSegment[] {
  const result: TranscriptSegment[] = [];
  let start = 0;
  while (start < text.length) {
    while (text[start] === ' ') start++;
    if (start >= text.length) break;
    let end = Math.min(text.length, start + 220);
    if (end < text.length) { const cut = text.lastIndexOf(' ', end); if (cut > start) end = cut; }
    const punctuation = /[.!?;]\s/u.exec(text.slice(start, end));
    if (punctuation) end = start + punctuation.index + 1;
    result.push({ text: text.slice(start, end), start, end }); start = end;
  }
  return result;
}
function rankReference(raw: string, reference: TranscriptReference, lang: RepairLanguage, allowReordering = false) {
  const target = normalizeTranscript(reference.text);
  if (reconstructionGuard(raw, target, lang)) return null;
  const rawKey = asrSearchKey(raw), key = asrSearchKey(target);
  const surface = similarity(raw.toLowerCase(), target.toLowerCase());
  const phonetic = similarity(rawKey, key);
  const sourceTokens = rawKey.split(' '), targetTokens = key.split(' ');
  const targetSet = new Set(targetTokens);
  const anchors = sourceTokens.filter(token => targetSet.has(token)).length;
  const overlap = anchors / Math.max(sourceTokens.length, targetTokens.length, 1);
  // Reordering is review-only: all words must agree and only one adjacent swap is allowed.
  const mismatches = sourceTokens.map((token, index) => token === targetTokens[index] ? -1 : index).filter(index => index >= 0);
  const adjacentSwap = allowReordering && sourceTokens.length >= 3 && sourceTokens.length === targetTokens.length && mismatches.length === 2 &&
    mismatches[1] === mismatches[0] + 1 && sourceTokens[mismatches[0]] === targetTokens[mismatches[1]] && sourceTokens[mismatches[1]] === targetTokens[mismatches[0]];
  if (adjacentSwap) return { text: target, similarity: Math.round((0.86 + 0.1 * surface) * 1000) / 1000, sources: [reference], changes: [{ from: raw, to: target }] };
  if (phonetic < 0.74 || surface < 0.58) return null;
  if (sourceTokens.length >= 3 && anchors < Math.max(2, Math.ceil(sourceTokens.length * 0.5))) return null;
  if (sourceTokens.length <= 2 && (phonetic < 0.9 || surface < 0.78)) return null;
  const score = 0.48 * phonetic + 0.32 * surface + 0.2 * overlap;
  return score >= 0.78 ? { text: target, similarity: Math.round(score * 1000) / 1000, sources: [reference], changes: [{ from: raw, to: target }] } : null;
}
export function reconstructTranscript(raw: string, lang: RepairLanguage, references: TranscriptReference[][] = [], unavailable = false, allowReordering = false): TranscriptRepair {
  const text = normalizeTranscript(raw), segments = transcriptSegments(text);
  const base: TranscriptRepair = { version: 'reference-v1', raw, text, language: lang, status: unavailable ? 'unavailable' : text === raw ? 'unchanged' : 'normalized', proposals: [], source_count: 0, matched_segments: 0, analyzed_segments: Math.min(references.length, segments.length), total_segments: segments.length, requires_confirmation: true, linguistic_quality_certified: false, score_is_probability: false };
  const candidates: TranscriptProposal[] = [];
  const chosen = new Map<number, TranscriptProposal>();
  for (let index = 0; index < Math.min(segments.length, references.length); index++) {
    const segment = segments[index], grouped = new Map<string, TranscriptProposal>();
    base.source_count += Math.min(references[index].length, 24);
    if (references[index].some(reference => !['pending','rejected'].includes(reference.validation) && !reconstructionGuard(segment.text, reference.text, lang) && normalizeTranscript(reference.text).toLowerCase() === segment.text.toLowerCase())) { base.matched_segments++; base.status = 'matched'; continue; }
    for (const reference of references[index].slice(0, 24)) {
      if (reference.validation === 'pending' || reference.validation === 'rejected') continue;
      const candidate = rankReference(segment.text, reference, lang, allowReordering);
      if (!candidate) continue;
      const key = candidate.text.toLowerCase().replace(/\.$/, '');
      const prior = grouped.get(key);
      if (prior) { prior.sources.push(reference); prior.similarity = Math.max(prior.similarity, candidate.similarity); }
      else grouped.set(key, candidate);
    }
    const ranked = [...grouped.values()].sort((a, b) => b.similarity - a.similarity);
    // An already-attested unchanged phrase wins over a tempting grammatical rewrite.
    if (ranked.some(c => asrSearchKey(c.text) === asrSearchKey(segment.text) && c.text.toLowerCase() === segment.text.toLowerCase())) continue;
    if (ranked[0] && ranked[0].similarity >= 0.87 && (!ranked[1] || ranked[0].similarity - ranked[1].similarity >= 0.06)) chosen.set(index, ranked[0]);
    for (const candidate of ranked.slice(0, 2)) {
      const fullText = text.slice(0, segment.start) + candidate.text + text.slice(segment.end);
      if (fullText === text) continue;
      candidates.push({ ...candidate, text: fullText });
    }
  }
  if (chosen.size > 1) {
    let composed = '', offset = 0;
    const changes: TranscriptProposal['changes'] = [], sources: TranscriptReference[] = [];
    let sum = 0;
    for (const [index, candidate] of chosen) {
      const segment = segments[index]; composed += text.slice(offset, segment.start) + candidate.text; offset = segment.end;
      changes.push(...candidate.changes); sources.push(...candidate.sources); sum += candidate.similarity;
    }
    composed += text.slice(offset);
    candidates.push({ text: composed, similarity: Math.round(1000 * sum / chosen.size) / 1000, sources, changes });
  }
  const unique = new Map<string, TranscriptProposal>();
  for (const candidate of candidates.sort((a, b) => b.changes.length - a.changes.length || b.similarity - a.similarity)) if (!unique.has(candidate.text)) unique.set(candidate.text, candidate);
  base.proposals = [...unique.values()].slice(0, 3);
  if (base.proposals.length) base.status = base.proposals.length > 1 && base.proposals[0].similarity - base.proposals[1].similarity < 0.06 ? 'ambiguous' : 'suggestion';
  return base;
}
