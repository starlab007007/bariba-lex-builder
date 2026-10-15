import { buildTranslationReview, constrainTranslationPairs, translationQueries } from '../../supabase/functions/_shared/translation-reference-core.ts';
import { reviewTranslationReferences } from '../../supabase/functions/_shared/translation-reference-resources.ts';
import { reconstructionGuard, type TranscriptReference } from '../../supabase/functions/_shared/transcription-repair.ts';
const assert = (condition: unknown, message = 'assertion failed') => { if (!condition) throw new Error(message); };
const ref = (text: string, kind = 'phrase', source = 'apprendre', source_id = 'lesson'): TranscriptReference => ({ text, kind, source, source_id, validation: 'catalogue' });
function review(raw: string, references: TranscriptReference[], scope: 'source' | 'translation' = 'source', lang: 'fr' | 'bba' = 'bba') {
  const queries = translationQueries(raw);
  return buildTranslationReview(raw, lang, scope, queries, queries.map(query => query.kind === 'phrase' ? references : []));
}
Deno.test('typed source review proposes a real phrase without replacing it', () => {
  const result = review('Agede ye ya do', [ref('Agɛdɛ ye ya do.')]);
  assert(result.raw === 'Agede ye ya do' && result.text === result.raw && result.proposals[0].text === 'Agɛdɛ ye ya do.');
});
Deno.test('missing letters can be proposed from a dictionary without constructing a sentence', () => {
  const raw = 'un mot incnnu'; const queries = translationQueries(raw);
  const grouped = queries.map(query => query.text === 'incnnu' ? [ref('inconnu', 'word', 'dictionary')] : []);
  const result = buildTranslationReview(raw, 'fr', 'source', queries, grouped);
  assert(result.lexical_proposals[0]?.text === 'un mot inconnu'); assert(!result.proposals.length);
});
Deno.test('one adjacent word inversion requires an attested sentence and remains a proposal', () => {
  const result = review('vais je au marché', [ref('je vais au marché.')], 'source', 'fr');
  assert(result.proposals[0]?.text === 'je vais au marché.'); assert(result.text === 'vais je au marché');
});
Deno.test('negations, persons, numbers and names, including the first token, are protected', () => {
  for (const [raw, candidate] of [['Ali va demain','Aline va demain'],['Je ne vends pas 12 parcelles','Je vends 12 parcelles'],['Tu viens avec Ali','Il vient avec Ali'],['Je paie 12 euros','Je paie 120 euros']]) {
    assert(reconstructionGuard(raw, candidate, 'fr') !== null);
    assert(!review(raw, [ref(candidate)], 'source', 'fr').proposals.length);
  }
});
Deno.test('proper names never receive isolated dictionary spelling suggestions', () => {
  const raw = 'Ali voit Zime'; const queries = translationQueries(raw);
  const result = buildTranslationReview(raw, 'fr', 'source', queries, queries.map(() => [ref('Zimé', 'word', 'dictionary')]));
  assert(!result.lexical_proposals.length);
});
Deno.test('a target phrase with a different paired source is refused', () => {
  const result = review('Agede ye ya do', [ref('Agɛdɛ ye ya do.')], 'translation');
  assert(result.proposals.length === 1);
  const rejected = constrainTranslationPairs(result, 'Je mange des ignames', 'fr', [{ text: 'Je vais prier Dieu', source: 'apprendre', source_id: 'lesson' }]);
  assert(!rejected.proposals.length && rejected.raw === result.raw);
});
Deno.test('a target phrase can be chosen when its bilingual source also matches the input', () => {
  const result = constrainTranslationPairs(review('Agede ye ya do', [ref('Agɛdɛ ye ya do.')], 'translation'), 'Je va prier Dieu', 'fr', [{ text: 'Je vais prier Dieu', source: 'apprendre', source_id: 'lesson' }]);
  assert(result.proposals[0]?.text === 'Agɛdɛ ye ya do.' && result.bilingual_check === 'checked');
});
Deno.test('unavailable pairing never permits a plausible target rewrite', () => {
  const result = constrainTranslationPairs(review('Agede ye ya do', [ref('Agɛdɛ ye ya do.')], 'translation'), 'Je vais prier Dieu', 'fr', null);
  assert(!result.proposals.length && result.bilingual_check === 'unavailable');
});
Deno.test('queries are bounded and long unanalysed text is preserved', () => {
  const raw = ('une phrase inconnue à conserver. ').repeat(70);
  const queries = translationQueries(raw); assert(queries.length <= 24 && queries.every(query => query.text.length <= 220));
  const result = buildTranslationReview(raw, 'fr', 'source', queries, null);
  assert(result.raw === raw && !result.proposals.length && result.status === 'unavailable');
});
Deno.test('the server uses independent quotas, paired references and never either LLM', async () => {
  const calls: string[] = [];
  const result = await reviewTranslationReferences('Agede ye ya do', 'bba', 'translation', 'Je vais prier Dieu', undefined, {
    env: key => key === 'SUPABASE_URL' ? 'https://private.test' : 'server-key',
    fetch: async (input, init) => {
      const url = String(input); calls.push(url); assert(new Headers(init?.headers).get('Authorization') === 'Bearer server-key');
      if (url.includes('consume_')) { const body = JSON.parse(String(init?.body)); assert(body.p_key.startsWith('translation-review-')); return Response.json(true); }
      if (url.includes('reference_candidates')) return Response.json([{ query_index: 0, ...ref('Agɛdɛ ye ya do.') }]);
      if (url.includes('/fitila_asr_references?')) return Response.json([{ text: 'Je vais prier Dieu', source: 'apprendre', source_id: 'lesson' }]);
      throw new Error('Unexpected destination');
    },
  });
  assert(calls.length === 4 && result.proposals.length === 1 && !JSON.stringify(result).includes('server-key'));
});
