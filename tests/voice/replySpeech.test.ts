import { readableSpeech, replySpeechChunks } from '../../src/lib/voice/speechTextCore.ts';
const assert = (ok: unknown, message = 'assertion failed') => { if (!ok) throw new Error(message); };
Deno.test('every word of a long Baatonum reply is available for speech, beyond one server turn', () => {
  const text = ('Bàátɔ̀nú ɔ̃ ɛ́ ŋ. Saria 14se ya nɛɛ mba? ').repeat(400).trim();
  const chunks = replySpeechChunks(text);
  assert(chunks.length > 20); assert(chunks.every(c => c.length <= 380));
  assert(chunks.join(' ') === readableSpeech(text), 'speech must not truncate or replace the answer');
});
Deno.test('speech keeps numbers and accented text while removing visual markdown', () => {
  assert(readableSpeech('## Article 14\n**Bàátɔ̀nú** : [Saria](https://fitila.bj).') === 'Article 14 Bàátɔ̀nú : Saria.');
  assert(replySpeechChunks('   ').length === 0);
});
