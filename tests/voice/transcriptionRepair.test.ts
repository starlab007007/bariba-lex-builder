import { asrSearchKey, reconstructTranscript, reconstructionGuard, normalizeTranscript, transcriptSegments, type TranscriptReference } from '../../supabase/functions/_shared/transcription-repair.ts';
import { repairRecognizedTranscript } from '../../supabase/functions/_shared/transcription-resources.ts';
import { replaceTranscriptDraft } from '../../src/lib/voice/transcriptionReview.ts';
const assert = (ok: unknown, message = 'assertion failed') => { if (!ok) throw new Error(message); };
const reference = (text: string, source = 'apprendre', validation = 'catalogue'): TranscriptReference => ({ text, source, source_id: 'test-reference', validation, kind: 'phrase' });
Deno.test('search folds tonal/orthographic near-matches but preserves nasal distinctions', () => {
  assert(asrSearchKey('Agɛdɛ ye ya do') === asrSearchKey('Agede ye ya do'));
  assert(asrSearchKey('kùn') === 'kun'); assert(asrSearchKey('hã') !== asrSearchKey('ha'));
  assert(normalizeTranscript('  Nimmu\nbo  yiba. ') === 'Nimmu bo yiba.');
});
Deno.test('normalizeTranscript strips stray typographic symbols an ASR model should never produce', () => {
  assert(normalizeTranscript('mɛr©') === 'mɛr', 'copyright sign must not masquerade as a dropped letter');
  assert(normalizeTranscript('Bii mɛro®™') === 'Bii mɛro');
  assert(normalizeTranscript('a�b') === 'ab', 'the Unicode replacement character must be dropped, not kept visible');
  assert(normalizeTranscript('Nimmu bo yiba.') === 'Nimmu bo yiba.', 'ordinary punctuation must be untouched');
});
Deno.test('Baatonum reconstruction proposes an existing lesson sentence without overwriting raw speech', () => {
  const raw = 'Agede ye ya do';
  const result = reconstructTranscript(raw, 'bba', [[reference('Agɛdɛ ye ya do.')]]);
  assert(result.status === 'suggestion'); assert(result.proposals[0]?.text === 'Agɛdɛ ye ya do.');
  assert(result.text === raw && result.raw === raw, 'lexical suggestions must require confirmation');
  assert(result.requires_confirmation && !result.score_is_probability && !result.linguistic_quality_certified);
});
Deno.test('word length and spelling repairs use actual corpus vocabulary', () => {
  const result = reconstructTranscript('Nim mu bo yiba', 'bba', [[reference('Nim mu boo yiba.')]]);
  assert(result.proposals[0]?.text === 'Nim mu boo yiba.'); assert(result.proposals[0]?.sources[0].source === 'apprendre');
});
Deno.test('French conjugation is recovered only from a close complete reference', () => {
  const result = reconstructTranscript('Je va au marché', 'fr', [[reference('Je vais au marché.', 'corpus')]]);
  assert(result.proposals[0]?.text === 'Je vais au marché.');
});
Deno.test('numbers, negation, person and explicitly capitalized names cannot be changed', () => {
  assert(reconstructionGuard('Je paie 1200 francs', 'Je paie 120 francs', 'fr') === 'numbers_changed');
  assert(reconstructionGuard('Je ne veux pas vendre', 'Je veux vendre', 'fr') === 'negation_changed');
  assert(reconstructionGuard('Tu vas au marché', 'Il va au marché', 'fr') === 'person_changed');
  assert(reconstructionGuard('Na kua', 'A kua', 'bba') === 'person_changed');
  assert(reconstructionGuard('Je vois Ali demain', 'Je vois Aline demain', 'fr') === 'name_changed');
  assert(reconstructionGuard('U kùn nɛɛ', 'U nɛɛ', 'bba') === 'negation_changed');
});
Deno.test('unrelated or pending references cannot fabricate a normal-sounding sentence', () => {
  const raw = 'zxqv rombak zupila';
  assert(reconstructTranscript(raw, 'bba', [[reference('Agɛdɛ ye ya do.')]]).proposals.length === 0);
  assert(reconstructTranscript('Agede ye ya do', 'bba', [[reference('Agɛdɛ ye ya do.', 'apprendre', 'pending')]]).proposals.length === 0);
});
Deno.test('an unchanged reference and duplicate references do not manufacture certainty', () => {
  const exact = 'Nim mu boo yiba.';
  assert(reconstructTranscript(exact, 'bba', [[reference(exact), reference('Nim mu bo yiba.')]]).proposals.length === 0);
  const result = reconstructTranscript('Agede ye ya do', 'bba', [[reference('Agɛdɛ ye ya do.'), reference('Agɛdɛ ye ya do.', 'corpus')]]);
  assert(result.proposals.length === 1 && result.proposals[0].sources.length === 2);
});
Deno.test('multiple close alternatives remain visibly ambiguous', () => {
  const result = reconstructTranscript('Je vais au marche', 'fr', [[reference('Je vais au marché.'), reference('Je vais au marché !')]]);
  assert(result.status === 'ambiguous' && result.proposals.length === 2);
});
Deno.test('long reconstruction preserves all unexamined text and composes independent corrections', () => {
  const raw = 'Agede ye ya do. Nim mu bo yiba. ' + ('Texte non reconnu à conserver. ').repeat(80);
  const parts = transcriptSegments(raw.trim());
  const sources = parts.slice(0, 2).map((_, n) => [reference(n ? 'Nim mu boo yiba.' : 'Agɛdɛ ye ya do.')]);
  const result = reconstructTranscript(raw.trim(), 'bba', sources);
  assert(result.proposals[0]?.text.startsWith('Agɛdɛ ye ya do. Nim mu boo yiba.'));
  assert(result.proposals[0]?.text.endsWith(('Texte non reconnu à conserver. ').repeat(80).trim()));
  assert(result.analyzed_segments === 2 && result.total_segments > 2);
});
Deno.test('lookup failure preserves the complete normalized recognition', async () => {
  const result = await repairRecognizedTranscript('  Mon  vocal  ', 'fr', undefined, { env: () => undefined, fetch: globalThis.fetch });
  assert(result.text === 'Mon vocal' && result.raw === '  Mon  vocal  ' && result.status === 'unavailable');
});
Deno.test('server lookup has bounded queries, private credentials and independent durable quotas', async () => {
  const calls: { url: string; body: any; headers: Headers }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input), body = JSON.parse(String(init?.body)); calls.push({ url, body, headers: new Headers(init?.headers) });
    return new Response(JSON.stringify(url.includes('consume_') ? true : [{ query_index: 0, ...reference('Agɛdɛ ye ya do.') }]), { headers: { 'Content-Type': 'application/json' } });
  };
  const result = await repairRecognizedTranscript('Agede ye ya do', 'bba', undefined, { env: key => key === 'SUPABASE_URL' ? 'https://server.test' : 'private-service-key', fetch: fetcher });
  assert(calls.length === 3); assert(calls[2].body.p_queries.length === 1); assert(calls[2].headers.get('Authorization') === 'Bearer private-service-key');
  assert(result.proposals.length === 1 && !JSON.stringify(result).includes('private-service-key'));
});
Deno.test('quota refusal never performs the reference search', async () => {
  let calls = 0;
  const result = await repairRecognizedTranscript('Agede ye ya do', 'bba', undefined, { env: () => 'configured', fetch: async () => { calls++; return new Response('false'); } });
  assert(calls === 1 && result.status === 'unavailable' && !result.proposals.length);
});
Deno.test('accepted reconstruction replaces only the recognized span and preserves the written prefix', () => {
  const result = replaceTranscriptDraft('Mon introduction\nAgede ye ya do', 'Agede ye ya do', 'Agɛdɛ ye ya do.');
  assert(result.replaced && result.text === 'Mon introduction\nAgɛdɛ ye ya do.');
});
Deno.test('human edits and duplicate recognized spans are never overwritten', () => {
  assert(!replaceTranscriptDraft('Agede ye ya do modifié', 'Agede ye ya do.', 'Autre phrase').replaced);
  assert(!replaceTranscriptDraft('A kua. A kua.', 'A kua.', 'Autre phrase').replaced);
});
