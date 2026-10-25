// FITILA owns the model and runs it on its VPS. Never call a paid provider.
import { TM_PAIRS } from '../_shared/translation-memory.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
type Dependencies = { env?: (name: string) => string | undefined; fetch?: typeof fetch };
const clean = (v: unknown) => typeof v === 'string' ? v.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
const fold = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const stop = new Set('comment pourquoi quand dans avec pour peux peut faire fait sont vous nous une des les est que qui mon ton son explique donne moi'.split(' '));
const reply = (status: number, value: unknown, retry = 0) => new Response(JSON.stringify(value), {
  status, headers: { ...cors, 'Content-Type': 'application/json', ...(retry ? { 'Retry-After': String(retry) } : {}) },
});

// The older Meta /infer proxy is still configured in production. Its route
// does not serve chat; the shared authenticated gateway does.
export function brainServiceUrl(configured: string): string {
  const url = new URL(configured);
  if (url.pathname.replace(/\/+$/, '') === '/api/meta-voice') url.pathname = '/voice-api';
  return url.toString().replace(/\/+$/, '');
}

export function memoryReferences(message: string) {
  const terms = [...new Set(fold(message).split(' ').filter(w => w.length >= 3 && !stop.has(w)))];
  if (!terms.length) return [];
  return TM_PAIRS.map(([fr, ba]) => {
    const tokens = new Set(fold(fr + ' ' + ba).split(' '));
    return { fr, ba, score: terms.filter(w => tokens.has(w)).length };
  }).filter(r => r.score >= Math.min(2, terms.length)).sort((a, b) => b.score - a.score).slice(0, 3);
}

async function bodyWithinLimit(req: Request): Promise<Record<string, unknown> | null> {
  const reader = req.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder(); let size = 0, input = '';
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 24000) { await reader.cancel(); return null; }
      input += decoder.decode(value, { stream: true });
    }
    input += decoder.decode();
    const value = JSON.parse(input);
    return value && !Array.isArray(value) && typeof value === 'object' ? value : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export async function handleChat(req: Request, deps: Dependencies = {}): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const started = Date.now(), env = deps.env ?? (name => Deno.env.get(name)), request = deps.fetch ?? globalThis.fetch;
  const body = await bodyWithinLimit(req), message = clean(body?.message);
  if (!body || !message || message.length > 2000) return reply(400, { error: 'invalid_message', message: 'Écrivez un message de moins de 2 000 caractères.' });
  const url = env('SUPABASE_URL') ?? '', key = env('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const voiceUrl = (env('FITILA_VOICE_SERVICE_URL') ?? '').replace(/\/+$/, ''), voiceKey = env('FITILA_MODEL_API_TOKEN') ?? '';
  if (!url || !key || !voiceUrl || !voiceKey) return reply(503, { error: 'llm_not_configured', message: 'Le cerveau FITILA est momentanément indisponible.' });
  const headers = { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
  try {
    const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    // The orchestrator has already checked its durable quotas. All direct users
    // have a separate bounded capability; the service key never leaves servers.
    if (auth !== key) {
      let actor = 'guest:' + (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
      // supabase-js may send the public publishable key as its guest bearer.
      // This remains an anonymous, rate-limited capability, never a user identity.
      if (auth && auth !== env('SUPABASE_ANON_KEY') && !auth.startsWith('sb_publishable_')) {
        const response = await request(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${auth}` }, signal: AbortSignal.timeout(5000) });
        const user = await response.json();
        if (!response.ok || !user.id) return reply(401, { error: 'auth_required', message: 'Reconnectez-vous.' });
        actor = 'user:' + user.id;
      }
      const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(voiceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const hash = [...new Uint8Array(await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(actor)))].map(x => x.toString(16).padStart(2, '0')).join('');
      for (const [bucket, limit] of [['brain:global', 30], ['brain:' + hash, 6]] as const) {
        const response = await request(`${url}/rest/v1/rpc/consume_dunya_voice_quota`, { method: 'POST', headers, body: JSON.stringify({ p_key: bucket, p_limit: limit, p_window: 60 }), signal: AbortSignal.timeout(5000) });
        if (!response.ok) return reply(503, { error: 'quota_unavailable', message: 'Réessayez dans un instant.' });
        if (await response.json() !== true) return reply(429, { error: 'llm_rate_limited', message: 'Service sollicité. Réessayez dans une minute.', retry_after: 60 }, 60);
      }
    }
    const historyInput = body.history ?? body.conversationHistory;
    const history = (Array.isArray(historyInput) ? historyInput : []).slice(-4)
      .filter(x => x && ['user', 'assistant'].includes(x.role) && typeof x.content === 'string')
      .map(x => ({ role: x.role, content: clean(x.content).slice(0, 500) }));
    const references = memoryReferences(message);
    const brainUrl = brainServiceUrl(env('FITILA_BRAIN_SERVICE_URL') || voiceUrl);
    const response = await request(`${brainUrl}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${voiceKey}` },
      body: JSON.stringify({ message, history, voice: body.voice === true, context: references.map(r => `${r.fr} — ${r.ba}`).join('\n'), max_tokens: Math.max(32, Math.min(160, Number(body.max_tokens) || 96)) }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(65000)]),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn(JSON.stringify({ event: 'fitila_local_brain_failure', status: response.status,
        upstream_host: new URL(brainUrl).hostname, upstream_path: new URL(brainUrl).pathname,
        code: typeof data.error === 'string' ? data.error.slice(0, 60) : 'upstream_failed' }));
      const limited = response.status === 429;
      return reply(limited ? 429 : 503, { error: limited ? 'llm_rate_limited' : 'llm_unavailable', message: limited ? 'Le cerveau FITILA est occupé. Réessayez.' : 'Réponse momentanément indisponible. Réessayez.', retry_after: limited ? 10 : 20 }, limited ? 10 : 20);
    }
    const french = clean(data.response_fr);
    if (!french) return reply(503, { error: 'llm_unavailable', message: 'La réponse est vide. Réessayez.' });
    let ba: string | null = null;
    if (body.skip_translation !== true) {
      try {
        const translated = await request(`${url}/functions/v1/byt5-bariba-translate`, {
          method: 'POST', headers, body: JSON.stringify({ text: french, sourceLang: 'french', targetLang: 'bariba' }),
          signal: AbortSignal.any([req.signal, AbortSignal.timeout(25000)]),
        });
        const result = await translated.json();
        if (translated.ok) ba = clean(result.translation) || null;
      } catch { /* Keep the real French answer; never present it as Baatɔnum. */ }
    }
    return reply(200, { response_fr: french, response_ba: ba, fallback: ba === null,
      model: clean(data.model) || 'gemma-4-e2b', provider: 'fitila-local', duration: Date.now() - started,
      sources: references.map(r => ({ title: 'Mémoire FITILA', text: `${r.fr} — ${r.ba}`, kind: 'translation-memory' })) });
  } catch {
    return reply(503, { error: 'llm_unavailable', message: 'Le cerveau FITILA ne répond pas. Réessayez.', duration: Date.now() - started }, 20);
  }
}

if (Deno.env.get('FITILA_AI_TEST') !== '1') Deno.serve(req => handleChat(req));
