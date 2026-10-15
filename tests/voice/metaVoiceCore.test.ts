import { chooseListenSource, readableVoiceError, resolveFlags, validateTtsText, MAX_TTS_CHARS } from '../../src/lib/voice/metaVoiceCore.ts';
function assert(c: boolean, m: string) { if (!c) throw new Error(m); }
const ON = { tts: true, asr: true };
const OFF = { tts: false, asr: false };

Deno.test('flags default off', () => { const f = resolveFlags({}, {}); assert(!f.tts && !f.asr, 'off'); });
Deno.test('env enables, local "0" disables (rollback)', () => {
  assert(resolveFlags({ tts: 'true' }, {}).tts, 'env on');
  assert(!resolveFlags({ tts: 'true' }, { tts: '0' }).tts, 'local off wins');
  assert(resolveFlags({}, { asr: '1' }).asr, 'local on');
});
Deno.test('human audio always preferred over Meta TTS', () => assert(chooseListenSource(true, ON) === 'human', 'human'));
Deno.test('no human + flag on -> meta-tts', () => assert(chooseListenSource(false, ON) === 'meta-tts', 'meta'));
Deno.test('no human + flag off -> unavailable', () => assert(chooseListenSource(false, OFF) === 'unavailable', 'unavail'));
Deno.test('tts text limits', () => {
  assert(validateTtsText('  ') !== null, 'empty');
  assert(validateTtsText('a'.repeat(MAX_TTS_CHARS + 1)) !== null, 'long');
  assert(validateTtsText('Ka bɔni') === null, 'ok');
});
Deno.test('errors are readable', () => {
  assert(readableVoiceError(401) === 'Connectez-vous pour utiliser la voix.', '401');
  assert(readableVoiceError(503, 'not_configured') === 'Voix Meta non activée sur le serveur.', 'nc');
  assert(readableVoiceError(null).includes('internet'), 'net');
});
