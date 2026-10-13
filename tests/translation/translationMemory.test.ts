import { foldBa, foldFr, TranslationMemory, type MemoryData } from '../../src/lib/translation/translationMemory.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Real generated file: guards the pipeline output the browser actually ships.
const data = JSON.parse(await Deno.readTextFile(new URL('../../public/data/translation-memory.json', import.meta.url))) as MemoryData;
const memory = new TranslationMemory(data);

Deno.test('ships a large memory', () => {
  assert(memory.size > 7000, `size ${memory.size}`);
});

Deno.test('attested sentences are exact in both directions, whatever the spacing, accents and tones', () => {
  const fr = memory.exact('salut! bonne arrivee', 'fr-ba');
  assert(fr !== null && foldBa(fr.translation).includes('aagu'), 'fr-ba');
  assert(fr!.confidence === 0 && fr!.qualityStatus === 'attested' && fr!.method === 'translation-memory', 'provenance without fabricated accuracy');
  const ba = memory.exact('Aagu wunɛ ka weru', 'ba-fr');
  assert(ba !== null && foldFr(ba.translation).includes('bonne arrivee'), 'ba-fr');
  const toned = memory.exact('Dòmma a nà ?', 'ba-fr');
  assert(toned !== null && foldFr(toned.translation).includes('quand es tu venu'), 'tones ignored');
});

Deno.test('unknown sentence is not invented', () => {
  assert(memory.exact('phrase absente xqzv', 'fr-ba') === null, 'exact miss');
  assert(memory.wordByWord('xqzv plorg wuvt', 'fr-ba') === null, 'refuses mostly unknown text');
});

Deno.test('word-by-word only works offline when all words are known', () => {
  const r = memory.wordByWord('eau maison', 'fr-ba');
  assert(r !== null && r.method === 'dictionary-offline' && (r.coverage ?? 0) === 1, 'word-by-word');
  assert(r!.confidence === 0, 'no statistical accuracy without evaluation');
  assert(foldBa(r!.translation).includes('nim'), 'eau -> nim');
});

Deno.test('nasal tilde is never folded away', () => {
  assert(foldBa('sɔ̃ɔ') !== foldBa('sɔɔ'), 'tilde');
});

Deno.test('partially known phrases must not be presented as full translations', () => {
  assert(memory.wordByWord('eau xqzv maison', 'fr-ba') === null, 'unknown word blocks incomplete translation');
});
