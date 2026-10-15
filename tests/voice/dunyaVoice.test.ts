import { bytesToBase64, needsClarification, segmentVoiceWav, speechChunks } from '../../supabase/functions/_shared/dunya-voice-core.ts';
import { consumeVoiceStream } from '../../src/lib/dunya/voiceProtocol.ts';

function assert(ok: unknown, message = 'assertion failed'): asserts ok { if (!ok) throw new Error(message); }
function wav(seconds = 1): Uint8Array {
  const result = new Uint8Array(44 + seconds * 32000), v = new DataView(result.buffer);
  for (const [offset, value] of [[0, 'RIFF'], [8, 'WAVE'], [12, 'fmt '], [36, 'data']] as const) result.set(new TextEncoder().encode(value), offset);
  v.setUint32(4, result.length - 8, true); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); v.setUint32(40, result.length - 44, true);
  return result;
}
Deno.test('speech segmentation preserves Unicode and the entire long answer', () => {
  const input = ('Bɛɛ ka weru. Une phrase avec ɛ, ɔ et un nom propre. ').repeat(35).trim();
  const chunks = speechChunks(input);
  assert(chunks.length > 1); assert(chunks.every(x => x.length <= 380));
  assert(chunks.join(' ') === input);
  assert(speechChunks('x'.repeat(800)).every(x => x.length <= 380));
});
Deno.test('voice segmentation keeps every PCM sample and valid headers below 25 seconds', () => {
  const input = wav(70), segments = segmentVoiceWav(bytesToBase64(input));
  assert(segments.length === 3);
  assert(segments.every(s => (s.length - 44) / 32000 <= 25));
  assert(segments.reduce((n, s) => n + s.length - 44, 0) === input.length - 44);
});
Deno.test('unsupported WAV headers and excessive durations are rejected', () => {
  for (const input of [new Uint8Array(60), wav(121)]) {
    let failed = false; try { segmentVoiceWav(bytesToBase64(input)); } catch { failed = true; } assert(failed);
  }
});
Deno.test('short greetings allowed; empty or looping transcripts need clarification', () => {
  assert(!needsClarification('A kua')); assert(needsClarification(''));
  assert(needsClarification('a a a a a a a a'));
});
Deno.test('stream parser survives split UTF-8 and requires a completed turn', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ type: 'answer', request_id: 'r', text: 'Bɛɛ ɔ' }) + '\n' + JSON.stringify({ type: 'done', request_id: 'r' }));
  let text = '';
  await consumeVoiceStream(new ReadableStream({ start(c) { for (const b of bytes) c.enqueue(new Uint8Array([b])); c.close(); } }), event => { if (event.text) text = event.text; });
  assert(text === 'Bɛɛ ɔ');
  let failed = false;
  try { await consumeVoiceStream(new ReadableStream({ start(c) { c.close(); } }), () => {}); } catch { failed = true; } assert(failed);
});

Deno.env.set('DUNYA_VOICE_TEST', '1');
Deno.env.set('SUPABASE_URL', 'https://project.test');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
Deno.env.set('FITILA_VOICE_SERVICE_URL', 'https://voice.test');
Deno.env.set('FITILA_MODEL_API_TOKEN', 'test-private-token');
const { handleVoiceTurn } = await import('../../supabase/functions/dunya-voice-turn/index.ts');
const realFetch = globalThis.fetch;
type Scenario = { quota?: boolean; quotaError?: boolean; asrEmpty?: boolean; asrFails?: boolean; ttsFails?: boolean; leaseError?: boolean; brainLimited?: boolean };
async function scenario(body: Record<string, unknown>, config: Scenario = {}, token?: string) {
  const calls: string[] = [];
  const quotas: { p_key: string; p_limit: number; p_window: number }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input), payload = JSON.parse(String(init?.body ?? '{}'));
    calls.push(url + ':' + (payload.engine ?? ''));
    const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('/auth/v1/user')) return response({ message: 'Invalid JWT' }, 401);
    if (url.includes('consume_dunya_voice_quota')) { quotas.push(payload); return config.quotaError ? response({ message: 'quota unavailable' }, 500) : response(config.quota !== false); }
    if (url.includes('lease_dunya_voice_cpu')) return config.leaseError ? response({ message: 'lease unavailable' }, 500) : response(true);
    if (url.includes('release_dunya_voice_cpu')) return response(null);
    if (url.endsWith('/infer')) {
      assert(new Headers(init?.headers).get('Authorization') === 'Bearer test-private-token', 'private token only goes upstream');
      if (payload.engine === 'meta-asr-300m') return config.asrFails ? response({}, 503) : response({ transcript: config.asrEmpty ? '' : 'A kua' });
      if (config.ttsFails) return response({}, 503);
      assert(payload.text.length <= 380, 'bounded TTS');
      return response({ audio_base64: bytesToBase64(wav()) });
    }
    if (url.endsWith('byt5-bariba-translate')) return response({ translation: payload.sourceLang === 'bariba' ? 'Bonjour' : 'A kua' });
    if (url.endsWith('fitila-ia-chat')) { assert(payload.skip_translation === true); if (config.brainLimited) return response({ error: 'llm_rate_limited' }, 429); return response({ response_fr: 'Bonjour.', model: 'test-brain' }); }
    if (url.endsWith('bariba-stt')) return response({ transcription: 'A kua' });
    if (url.endsWith('bariba-tts')) return response({ audio_url: 'https://audio.test/fallback.wav' });
    throw new Error('Unexpected call: ' + url);
  };
  try {
    const response = await handleVoiceTurn(new Request('https://edge.test', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
    const text = await response.text();
    const events = response.status === 200 ? text.trim().split('\n').map(s => JSON.parse(s)) : [];
    return { status: response.status, events, calls, quotas, body: text };
  } finally { globalThis.fetch = realFetch; }
}
Deno.test('guest: full Omnilingual -> translation -> brain -> MMS chain with genuine engine trace', async () => {
  const r = await scenario({ audio_base64: bytesToBase64(wav()), lang: 'bba' });
  assert(r.status === 200); assert(r.events.at(-1).type === 'done');
  assert(r.events.some(e => e.type === 'transcript' && e.engine === 'meta-asr-300m'));
  assert(r.events.some(e => e.type === 'audio' && e.engine === 'meta-mms-tts-bba'));
  assert(!r.body.includes('test-private-token') && !r.body.includes('test-server-key'));
  assert(r.calls.filter(s => s.includes('release_dunya_voice_cpu')).length === 2);
});
Deno.test('guest replay synthesizes only, without another model answer or translation', async () => {
  const r = await scenario({ text: ('A kua. ').repeat(90).trim(), lang: 'bba', speech_only: true });
  assert(r.events.filter(e => e.type === 'audio').length > 1);
  assert(!r.calls.some(x => /fitila-ia-chat|byt5-bariba/.test(x)));
});
Deno.test('French greetings preserve the existing local fast path without a model key', async () => {
  const r = await scenario({ text: 'Bonjour !', lang: 'fr' });
  assert(r.events.some(e => e.type === 'answer' && e.model === 'fitila-attested-greeting'));
  assert(!r.calls.some(x => x.includes('fitila-ia-chat')));
});
Deno.test('transcription review stops before reasoning and synthesis', async () => {
  const r = await scenario({ audio_base64: bytesToBase64(wav()), lang: 'bba', transcribe_only: true });
  assert(r.events.some(e => e.type === 'transcript')); assert(!r.calls.some(x => x.includes('fitila-ia-chat')));
});
Deno.test('translator French recording uses Omnilingual and never a Bariba-only fallback', async () => {
  const request = { audio_base64: bytesToBase64(wav()), lang: 'fr', transcribe_only: true };
  const ok = await scenario(request);
  assert(ok.events.some(e => e.type === 'transcript' && e.engine === 'meta-asr-300m' && e.lang === 'fr'));
  const failed = await scenario(request, { asrFails: true });
  assert(failed.events.some(e => e.type === 'error' && e.code === 'transcription_unavailable'));
  assert(!failed.calls.some(x => /bariba-stt|fitila-ia-chat|byt5-bariba/.test(x)));
});
Deno.test('reply listening has its own bounded budget without consuming the input budget', async () => {
  const speech = await scenario({ text: 'A kua.', lang: 'bba', speech_only: true });
  const input = await scenario({ audio_base64: bytesToBase64(wav()), lang: 'bba', transcribe_only: true });
  assert(speech.quotas.some(q => q.p_key.startsWith('speech:') && q.p_limit === 30));
  assert(input.quotas.some(q => q.p_key.startsWith('input:') && q.p_limit === 6));
  assert(speech.quotas.some(q => q.p_key === 'global-day' && q.p_limit === 1000));
});
Deno.test('ambiguous voice-only requests cannot use the listening budget for ASR or reasoning', async () => {
  for (const body of [
    { audio_base64: bytesToBase64(wav()), lang: 'bba', speech_only: true },
    { text: 'A kua', lang: 'bba', speech_only: true, transcribe_only: true },
  ]) {
    const r = await scenario(body); assert(r.status === 400); assert(!r.calls.some(x => /infer|fitila-ia-chat/.test(x)));
  }
});
Deno.test('bad ASR never generates an invented answer', async () => {
  const r = await scenario({ audio_base64: bytesToBase64(wav()), lang: 'bba' }, { asrEmpty: true });
  assert(r.events.some(e => e.code === 'clarification_required')); assert(!r.calls.some(x => x.includes('fitila-ia-chat')));
});
Deno.test('fallback records its actual ASR and TTS, never labels it Meta', async () => {
  const r = await scenario({ audio_base64: bytesToBase64(wav()), lang: 'bba' }, { asrFails: true, ttsFails: true });
  assert(r.events.some(e => e.type === 'transcript' && e.engine === 'bariba-stt'));
  assert(r.events.some(e => e.type === 'audio' && e.engine === 'bariba-tts'));
});
Deno.test('quota rejection and quota backend failure stop before model calls', async () => {
  for (const config of [{ quota: false }, { quotaError: true }]) {
    const r = await scenario({ text: 'Bonjour', lang: 'fr' }, config);
    assert(r.status === (config.quota === false ? 429 : 503)); assert(!r.calls.some(x => x.includes('/infer')));
  }
});
Deno.test('invalid authenticated session cannot silently downgrade to visitor', async () => {
  const r = await scenario({ text: 'Bonjour' }, {}, 'expired-user-token');
  assert(r.status === 401 && r.calls.length === 1);
});
Deno.test('busy CPU is surfaced without unbounded parallel inference', async () => {
  const r = await scenario({ audio_base64: bytesToBase64(wav()), lang: 'bba' }, { leaseError: true });
  assert(r.events.some(e => e.code === 'busy')); assert(!r.calls.some(x => x.includes('/infer')));
});
Deno.test('cancelling a visitor does not release a CPU lease before its inference finishes', async () => {
  let resolveModel!: () => void, markStarted!: () => void;
  const pendingModel = new Promise<void>(resolve => { resolveModel = resolve; });
  const started = new Promise<void>(resolve => { markStarted = resolve; });
  let released = false, modelSignal: AbortSignal | undefined;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
    if (url.includes('consume_dunya_voice_quota') || url.includes('/rpc/lease_dunya_voice_cpu')) return response(true);
    if (url.includes('release_dunya_voice_cpu')) { released = true; return response(null); }
    if (url.endsWith('/infer')) {
      modelSignal = init?.signal ?? undefined; markStarted(); await pendingModel;
      return response({ audio_base64: bytesToBase64(wav()) });
    }
    throw new Error('Unexpected fetch');
  };
  try {
    const abort = new AbortController();
    const response = await handleVoiceTurn(new Request('https://edge.test', { method: 'POST', signal: abort.signal, body: JSON.stringify({ text: 'A kua', lang: 'bba', speech_only: true }) }));
    await started; abort.abort();
    assert(!released, 'lease still held by the running CPU inference');
    assert(!modelSignal?.aborted, 'VPS fetch remains alive until completion');
    resolveModel(); await response.text(); assert(released, 'lease released after the model finishes');
  } finally { resolveModel(); globalThis.fetch = realFetch; }
});

Deno.test('Mistral quota is distinct from a busy speech CPU and does not invent a spoken answer', async () => {
  const r = await scenario({ text: 'Explique FITILA.', lang: 'fr' }, { brainLimited: true });
  assert(r.events.some(e => e.type === 'error' && e.code === 'brain_rate_limited'));
  assert(!r.events.some(e => e.type === 'audio' || e.type === 'answer'));
  let message = '';
  try { await consumeVoiceStream(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(r.body)); c.close(); } }), () => {}); }
  catch (e) { message = e instanceof Error ? e.message : ''; }
  assert(message.includes('service de réponse IA') && message.includes('limité'));
});
