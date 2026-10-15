import { createClient } from 'npm:@supabase/supabase-js@2.81.1';
import { bytesToBase64, frenchGreeting, MAX_VOICE_TEXT, needsClarification, segmentVoiceWav, speechChunks, type VoiceEvent } from '../_shared/dunya-voice-core.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, code: string) => new Response(JSON.stringify({ code }), {
  status, headers: { ...cors, 'Content-Type': 'application/json', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
});
const clean = (s: unknown) => typeof s === 'string' ? s.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
const systemPrompt = 'Tu es DUNYA, assistant vocal de FITILA. Réponds en français, en une à trois phrases courtes, sans markdown. Utilise uniquement les informations fiables disponibles. Si tu ne sais pas, dis-le. Ne corrige jamais une transcription en inventant une intention.';

// Custom authentication: signed-in users are checked with Auth; visitors receive only this
// bounded voice capability, never a database identity or a VPS token. Both share durable quotas.
export async function handleVoiceTurn(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, 'method_not_allowed');
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const voiceUrl = (Deno.env.get('FITILA_VOICE_SERVICE_URL') ?? '').replace(/\/+$/, '');
  const voiceKey = Deno.env.get('FITILA_MODEL_API_TOKEN') ?? '';
  if (!url || !key || !voiceUrl || !voiceKey) return reply(503, 'not_configured');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let actor = 'guest';
  const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (auth) {
    const { data, error } = await db.auth.getUser(auth);
    if (error || !data.user) return reply(401, 'auth_required');
    actor = `user:${data.user.id}`;
  } else {
    // IP-derived hash only; the global budget also bounds callers that rotate identifiers.
    actor += ':' + (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim();
  }
  const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(voiceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(`dunya-quota:${actor}`));
  const actorHash = [...new Uint8Array(signature)].map(x => x.toString(16).padStart(2, '0')).join('');
  for (const [bucket, limit, seconds] of [['global', 60, 60], ['global-day', 1000, 86400], [actorHash, auth ? 12 : 6, 60]] as const) {
    const { data, error } = await db.rpc('consume_dunya_voice_quota', { p_key: bucket, p_limit: limit, p_window: seconds });
    if (error) return reply(503, 'quota_unavailable'); // fail closed before any paid/model inference
    if (data !== true) return reply(429, 'rate_limited');
  }
  // Stream the body through a byte limit; Content-Length is neither required nor trusted.
  const reader = req.body?.getReader();
  if (!reader) return reply(400, 'invalid_request');
  let input = '', total = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 11_000_000) { await reader.cancel(); return reply(413, 'audio_too_large'); }
      input += decoder.decode(value, { stream: true });
    }
    input += decoder.decode();
  } finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  try { body = JSON.parse(input); } catch { return reply(400, 'invalid_request'); }
  if (!body || Array.isArray(body) || typeof body !== 'object') return reply(400, 'invalid_request');
  const text = clean(body.text);
  const audio = typeof body.audio_base64 === 'string' ? body.audio_base64 : '';
  if ((!text && !audio) || text.length > MAX_VOICE_TEXT || (text && audio)) return reply(400, 'invalid_request');
  const lang: 'fr' | 'bba' = body.lang === 'fr' ? 'fr' : 'bba';
  const replyLang: 'fr' | 'bba' = body.reply_lang === 'fr' ? 'fr' : body.reply_lang === 'bba' ? 'bba' : lang;
  let segments: Uint8Array[] = [];
  if (audio) { try { segments = segmentVoiceWav(audio); } catch { return reply(400, 'invalid_audio'); } }
  const history = (Array.isArray(body.history) ? body.history : []).slice(-8)
    .filter(x => x && ['user', 'assistant'].includes(x.role) && typeof x.content === 'string')
    .map(x => ({ role: x.role, content: clean(x.content).slice(0, MAX_VOICE_TEXT) }));
  const id = crypto.randomUUID(), started = Date.now();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 135_000);
  const cancel = () => abort.abort();
  req.signal.addEventListener('abort', cancel, { once: true });
  if (req.signal.aborted) abort.abort();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: Omit<VoiceEvent, 'request_id'>) => {
        if (closed || abort.signal.aborted) return;
        controller.enqueue(encoder.encode(JSON.stringify({ ...event, request_id: id, elapsed_ms: Date.now() - started }) + '\n'));
      };
      const jsonFetch = async (target: string, payload: unknown, upstreamKey: string, signal = abort.signal) => {
        const response = await fetch(target, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${upstreamKey}`, apikey: key },
          body: JSON.stringify(payload), signal,
        });
        if (!response.ok) {
          const failure = await response.json().catch(() => ({}));
          console.warn(JSON.stringify({ event: 'dunya_upstream_failure', request_id: id, target: new URL(target).pathname, status: response.status }));
          if (failure.error === 'llm_not_configured') throw new Error('brain_unavailable');
          throw new Error(response.status === 429 ? 'busy' : 'upstream_failed');
        }
        const value = await response.json();
        if (value.error) throw new Error('upstream_failed');
        return value;
      };
      const fn = (name: string, payload: unknown) => jsonFetch(`${url}/functions/v1/${name}`, payload, key);
      const infer = async (payload: unknown) => {
        for (let attempt = 0; attempt < 20; attempt++) {
          abort.signal.throwIfAborted();
          const { data, error } = await db.rpc('lease_dunya_voice_cpu', { p_owner: id });
          if (error) throw new Error('busy');
          if (data === true) {
            // Cancelling HTTP does not stop a synchronous CPU inference on the VPS.
            // Keep its lease until that inference returns, while discarding stale output.
            const pending = jsonFetch(`${voiceUrl}/infer`, payload, voiceKey, AbortSignal.timeout(90_000))
              .finally(async () => { await db.rpc('release_dunya_voice_cpu', { p_owner: id }); });
            const runtime = globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil: (task: Promise<unknown>) => void } };
            runtime.EdgeRuntime?.waitUntil(pending.catch(() => undefined));
            return await pending;
          }
          send({ type: 'stage', stage: 'waiting' });
          await new Promise<void>((resolve, reject) => {
            const stop = () => { clearTimeout(wait); reject(new DOMException('Aborted', 'AbortError')); };
            const wait = setTimeout(() => { abort.signal.removeEventListener('abort', stop); resolve(); }, 500);
            abort.signal.addEventListener('abort', stop, { once: true });
          });
        }
        throw new Error('busy');
      };
      const translate = async (value: string, source: 'fr' | 'bba', target: 'fr' | 'bba') => {
        const result = await fn('byt5-bariba-translate', { text: value, sourceLang: source === 'fr' ? 'french' : 'bariba', targetLang: target === 'fr' ? 'french' : 'bariba' });
        const translated = clean(result.translation);
        if (!translated || needsClarification(translated)) throw new Error('translation_unavailable');
        return translated;
      };
      try {
        let transcript = text;
        if (segments.length) {
          send({ type: 'stage', stage: 'transcribing' });
          const parts: string[] = [];
          let engine = 'meta-asr-300m';
          for (const segment of segments) {
            const encoded = bytesToBase64(segment);
            let part = '';
            try { part = clean((await infer({ engine: 'meta-asr-300m', audio_base64: encoded })).transcript); }
            catch (error) {
              if (abort.signal.aborted) throw error;
              if (error instanceof Error && error.message === 'busy') throw error;
              engine = 'bariba-stt';
              send({ type: 'notice', code: 'asr_fallback', engine });
              const fallback = await fn('bariba-stt', { audio: `data:audio/wav;base64,${encoded}`, robustMode: true });
              part = clean(fallback.transcription ?? fallback.text);
            }
            if (!part || needsClarification(part)) throw new Error('clarification_required');
            parts.push(part);
          }
          transcript = parts.join(' ');
          send({ type: 'transcript', text: transcript, lang, engine, model: engine === 'meta-asr-300m' ? 'omniASR_CTC_300M' : 'bariba-stt' });
        } else send({ type: 'transcript', text: transcript, lang, engine: 'text' });
        if (body.transcribe_only === true) { send({ type: 'done' }); return; }
        send({ type: 'stage', stage: 'thinking' });
        const question = body.speech_only === true ? '' : lang === 'bba' ? await translate(transcript, 'bba', 'fr') : transcript;
        const greeting = lang === 'fr' ? frenchGreeting(transcript) : null;
        const answer = body.speech_only === true ? { response_fr: transcript, model: '' }
          : greeting ? { response_fr: greeting, model: 'fitila-attested-greeting' }
          : await fn('fitila-ia-chat', { message: question, history, systemPrompt, max_tokens: 160, temperature: 0.3, skip_translation: true });
        const french = clean(answer.response_fr);
        if (!french) throw new Error('answer_unavailable');
        let spoken = french;
        let spokenLang: 'fr' | 'bba' = replyLang;
        if (replyLang === 'bba' && body.speech_only !== true) {
          try {
            const translated: string[] = [];
            for (const sentence of speechChunks(french)) translated.push(await translate(sentence, 'fr', 'bba'));
            spoken = translated.join(' ');
          } catch (error) {
            if (abort.signal.aborted) throw error;
            spokenLang = 'fr'; send({ type: 'notice', code: 'translation_fallback', lang: 'fr' });
          }
        }
        if (spoken.length > MAX_VOICE_TEXT) throw new Error('answer_too_long');
        send({ type: 'answer', text: spoken, subtitle: spokenLang === 'bba' && body.speech_only !== true ? french : undefined, lang: spokenLang, model: clean(answer.model) });
        if (spokenLang === 'bba') {
          send({ type: 'stage', stage: 'synthesizing' });
          for (const sentence of speechChunks(spoken)) {
            try {
              const result = await infer({ engine: 'meta-mms-tts-bba', text: sentence });
              const encoded = clean(result.audio_base64);
              if (!encoded || atob(encoded).slice(0, 4) !== 'RIFF') throw new Error('invalid_speech');
              send({ type: 'audio', text: sentence, audio_base64: encoded, engine: 'meta-mms-tts-bba', model: 'facebook/mms-tts-bba' });
            } catch (error) {
              if (abort.signal.aborted) throw error;
              if (error instanceof Error && error.message === 'busy') throw error;
              send({ type: 'notice', code: 'tts_fallback', engine: 'bariba-tts' });
              const fallback = await fn('bariba-tts', { text: sentence, skipRefine: true });
              const audioUrl = new URL(String(fallback.audio_url ?? ''));
              if (audioUrl.protocol !== 'https:') throw new Error('invalid_speech');
              send({ type: 'audio', text: sentence, audio_url: audioUrl.href, engine: 'bariba-tts' });
            }
          }
        }
        send({ type: 'done' });
      } catch (error) {
        const code = error instanceof Error ? error.message : 'service_unavailable';
        send({ type: 'error', code: ['clarification_required', 'translation_unavailable', 'busy', 'brain_unavailable'].includes(code) ? code : 'service_unavailable' });
      } finally {
        clearTimeout(timer); req.signal.removeEventListener('abort', cancel);
        console.log(JSON.stringify({ event: 'dunya_voice_turn', request_id: id, elapsed_ms: Date.now() - started, cancelled: abort.signal.aborted }));
        closed = true;
        try { controller.close(); } catch { /* browser disconnected */ }
      }
    },
    cancel() { abort.abort(); clearTimeout(timer); req.signal.removeEventListener('abort', cancel); },
  });
  return new Response(stream, { headers: { ...cors, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

if (Deno.env.get('DUNYA_VOICE_TEST') !== '1') Deno.serve(handleVoiceTurn);
