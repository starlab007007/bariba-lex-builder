import { createClient } from 'npm:@supabase/supabase-js@2.81.1';
import { repairRecognizedTranscript } from '../_shared/transcription-resources.ts';
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
// A Baatɔnum answer is translated sentence by sentence by a CPU model (about 4 s each): keep it to one or two very short sentences.
const systemPromptBba = 'Tu es DUNYA, assistant vocal de FITILA. Réponds en français, en une ou deux phrases très courtes (moins de 12 mots chacune), sans markdown, avec des mots simples. Utilise uniquement les informations fiables disponibles. Si tu ne sais pas, dis-le. Ne corrige jamais une transcription en inventant une intention.';
const BBA_MAX_SENTENCES = 2, BBA_MAX_CHARS = 200;
function shortAnswer(value: string): string {
  const sentences = value.split(/(?<=[.!?…])\s+/u).map(s => s.trim()).filter(Boolean);
  let out = '';
  for (const sentence of sentences.slice(0, BBA_MAX_SENTENCES)) {
    if (out && (out + ' ' + sentence).length > BBA_MAX_CHARS) break;
    out = out ? out + ' ' + sentence : sentence;
  }
  if (out.length > BBA_MAX_CHARS) {
    const cut = out.lastIndexOf(' ', BBA_MAX_CHARS);
    out = out.slice(0, cut > 40 ? cut : BBA_MAX_CHARS).replace(/[,;:\s]+$/u, '') + '.';
  }
  return out || value;
}

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
  // Listening to a long answer consumes small speech chunks, never another AI answer.
  // Separate that bounded capability from input/brain quotas; the shared CPU/day budgets remain.
  const speechOnly = body.speech_only === true;
  if (speechOnly && (!text || audio || body.transcribe_only === true)) return reply(400, 'invalid_request');
  for (const [bucket, limit, seconds] of [['global', 60, 60], ['global-day', 1000, 86400],
    [`${speechOnly ? 'speech' : 'input'}:${actorHash}`, speechOnly ? (auth ? 40 : 30) : (auth ? 12 : 6), 60]] as const) {
    const { data, error } = await db.rpc('consume_dunya_voice_quota', { p_key: bucket, p_limit: limit, p_window: seconds });
    if (error) return reply(503, 'quota_unavailable');
    if (data !== true) return reply(429, 'rate_limited');
  }
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
      // Privacy-safe engine diagnostics: never log audio, prompts, transcripts or tokens.
      let asrEngine = 'not_invoked', ttsEngine = 'not_invoked';
      let translationUsed = false, memoryReferenceCount: number | null = null;
      let fallbackUsed = false, terminalStatus = 'incomplete';
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
          if (failure.error === 'llm_rate_limited') throw new Error('brain_rate_limited');
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
      const translate = async (value: string, source: 'fr' | 'bba', target: 'fr' | 'bba', fast = false) => {
        translationUsed = true;
        const result = await fn('byt5-bariba-translate', { text: value, sourceLang: source === 'fr' ? 'french' : 'bariba', targetLang: target === 'fr' ? 'french' : 'bariba', ...(fast ? { skipRefine: true, cache: true } : { skipRefine: true }) });
        const translated = clean(result.translation);
        if (!translated || needsClarification(translated)) throw new Error('translation_unavailable');
        return translated;
      };
      type Speech = { sentence: string; audio_base64?: string; error?: unknown };
      // One synthesis = one lease on the VPS CPU; they are chained so they never compete with each other.
      const synth = async (sentence: string): Promise<Speech> => {
        try {
          const result = await infer({ engine: 'meta-mms-tts-bba', text: sentence });
          const encoded = clean(result.audio_base64);
          if (!encoded || atob(encoded).slice(0, 4) !== 'RIFF') throw new Error('invalid_speech');
          return { sentence, audio_base64: encoded };
        } catch (error) { return { sentence, error }; }
      };
      let failureStage = 'initialization';
      try {
        let transcript = text;
        if (segments.length) {
          failureStage = 'asr';
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
              // A French recording must never be sent to a Bariba-only fallback.
              if (lang === 'fr') throw new Error('transcription_unavailable');
              engine = 'bariba-stt';
              fallbackUsed = true;
              send({ type: 'notice', code: 'asr_fallback', engine });
              const fallback = await fn('bariba-stt', { audio: `data:audio/wav;base64,${encoded}`, robustMode: true, skipRepair: true });
              part = clean(fallback.raw_transcription ?? fallback.transcription ?? fallback.text);
            }
            if (!part || needsClarification(part)) throw new Error('clarification_required');
            parts.push(part);
          }
          asrEngine = engine;
          transcript = parts.join(' ');
          send({ type: 'stage', stage: 'analyzing_transcript' });
          failureStage = 'transcript_repair';
          const repair = await repairRecognizedTranscript(transcript, lang, abort.signal);
          transcript = repair.text;
          memoryReferenceCount = repair.source_count;
          send({ type: 'transcript', text: transcript, raw_text: repair.raw, repair, lang, engine, model: engine === 'meta-asr-300m' ? 'omniASR_CTC_300M' : 'bariba-stt' });
        } else send({ type: 'transcript', text: transcript, lang, engine: 'text' });
        if (body.transcribe_only === true) { terminalStatus = 'done'; send({ type: 'done' }); return; }
        failureStage = 'brain_or_translation';
        send({ type: 'stage', stage: 'thinking' });
        const question = body.speech_only === true ? '' : lang === 'bba' ? await translate(transcript, 'bba', 'fr') : transcript;
        const greeting = lang === 'fr' ? frenchGreeting(transcript) : null;
        const shortBba = replyLang === 'bba' && body.speech_only !== true;
        const answer = body.speech_only === true ? { response_fr: transcript, model: '' }
          : greeting ? { response_fr: greeting, model: 'fitila-attested-greeting' }
          : await fn('fitila-ia-chat', { message: question, history, systemPrompt: shortBba ? systemPromptBba : systemPrompt, max_tokens: shortBba ? 90 : 160, temperature: 0.3, skip_translation: true });
        let french = clean(answer.response_fr);
        if (!french) throw new Error('answer_unavailable');
        if (shortBba) french = shortAnswer(french);
        let spoken = french;
        let spokenLang: 'fr' | 'bba' = replyLang;
        // Speech jobs start as soon as their sentence is translated: voice synthesis (VPS) overlaps with the
        // translation of the next sentences (ByT5 Space) instead of waiting for the whole answer.
        const speechJobs: Promise<Speech>[] = [];
        let chain: Promise<unknown> = Promise.resolve();
        let discard = false;
        const queueSpeech = (sentence: string) => {
          const job = chain.then(() => discard || abort.signal.aborted ? ({ sentence, error: new Error('discarded') } as Speech) : synth(sentence));
          chain = job;
          speechJobs.push(job);
        };
        if (replyLang === 'bba' && body.speech_only !== true) {
          try {
            const translated: string[] = [];
            failureStage = 'translation';
            for (const sentence of speechChunks(french)) {
              const piece = await translate(sentence, 'fr', 'bba', true);
              translated.push(piece);
              for (const part of speechChunks(piece)) queueSpeech(part);
            }
            spoken = translated.join(' ');
          } catch (error) {
            discard = true;
            if (abort.signal.aborted) throw error;
            speechJobs.length = 0;
            spokenLang = 'fr'; fallbackUsed = true; send({ type: 'notice', code: 'translation_fallback', lang: 'fr' });
          }
        }
        if (spoken.length > MAX_VOICE_TEXT) throw new Error('answer_too_long');
        send({ type: 'answer', text: spoken, subtitle: spokenLang === 'bba' && body.speech_only !== true ? french : undefined, lang: spokenLang, model: clean(answer.model) });
        if (spokenLang === 'bba') {
          failureStage = 'tts';
          send({ type: 'stage', stage: 'synthesizing' });
          // speech_only (listening to a long answer) has no translation step: synthesize its chunks now.
          if (!speechJobs.length) for (const part of speechChunks(spoken)) queueSpeech(part);
          for (const job of speechJobs) {
            const speech = await job;
            if (!speech.error && speech.audio_base64) {
              ttsEngine = 'meta-mms-tts-bba';
              send({ type: 'audio', text: speech.sentence, audio_base64: speech.audio_base64, engine: 'meta-mms-tts-bba', model: 'facebook/mms-tts-bba' });
              continue;
            }
            if (abort.signal.aborted) throw speech.error;
            if (speech.error instanceof Error && speech.error.message === 'busy') throw speech.error;
            fallbackUsed = true;
            send({ type: 'notice', code: 'tts_fallback', engine: 'bariba-tts' });
            const fallback = await fn('bariba-tts', { text: speech.sentence, skipRefine: true });
            const audioUrl = new URL(String(fallback.audio_url ?? ''));
            if (audioUrl.protocol !== 'https:') throw new Error('invalid_speech');
            ttsEngine = 'bariba-tts';
            send({ type: 'audio', text: speech.sentence, audio_url: audioUrl.href, engine: 'bariba-tts' });
          }
        }
        failureStage = 'complete';
        terminalStatus = 'done';
        send({ type: 'done' });
      } catch (error) {
        const code = error instanceof Error ? error.message : 'service_unavailable';
        // Only emit allowlisted technical codes: exceptions may include secrets,
        // endpoints, user prompts, transcriptions, or upstream response bodies.
        const allowed = ['clarification_required', 'transcription_unavailable',
          'translation_unavailable', 'busy', 'brain_unavailable', 'brain_rate_limited',
          'answer_unavailable', 'answer_too_long', 'invalid_speech',
          'upstream_failed', 'service_unavailable'];
        const safeCode = allowed.includes(code) ? code : 'service_unavailable';
        terminalStatus = 'error';
        console.warn(JSON.stringify({
          event: 'dunya_voice_failure',
          request_id: id,
          stage: failureStage,
          code: safeCode,
          elapsed_ms: Date.now() - started,
          cancelled: abort.signal.aborted,
        }));
        send({ type: 'error', code: safeCode });
      } finally {
        clearTimeout(timer); req.signal.removeEventListener('abort', cancel);
        console.log(JSON.stringify({
          event: 'dunya_voice_turn', request_id: id, elapsed_ms: Date.now() - started,
          cancelled: abort.signal.aborted, terminal_status: terminalStatus,
          failure_stage: terminalStatus === 'error' ? failureStage : undefined,
          asr_engine: asrEngine, tts_engine: ttsEngine,
          translation_used: translationUsed, memory_reference_count: memoryReferenceCount,
          fallback_used: fallbackUsed,
        }));
        closed = true;
        try { controller.close(); } catch { /* browser disconnected */ }
      }
    },
    cancel() { abort.abort(); clearTimeout(timer); req.signal.removeEventListener('abort', cancel); },
  });
  return new Response(stream, { headers: { ...cors, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

if (Deno.env.get('DUNYA_VOICE_TEST') !== '1') Deno.serve(handleVoiceTurn);

