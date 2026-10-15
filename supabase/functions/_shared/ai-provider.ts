import { createMistralClient, MISTRAL_AUDIO_URL, MISTRAL_CHAT_URL } from './mistral.ts';

export type AIProvider = 'mistral' | 'gemini';
export type AISettings = { id: number; active_provider: AIProvider; version: number; updated_at: string; updated_by: string | null };
type Env = (name: string) => string | undefined;
type Dependencies = { env: Env; fetch?: typeof fetch; settings?: () => Promise<AISettings>; sleep?: (ms: number, signal: AbortSignal) => Promise<void> };
export const AI_CHAT_URL = 'fitila:chat';
export const AI_AUDIO_URL = 'fitila:transcribe';
export const GEMINI_CHAT_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

export function providerKey(provider: AIProvider, env: Env): string {
  const names = provider === 'mistral' ? ['MISTRAL_API_KEY'] : ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'];
  return names.map(name => env(name)?.trim()).find(value => !!value) || '';
}
export function providerModel(provider: AIProvider, env: Env, vision = false): string {
  if (provider === 'gemini') return env('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_MODEL;
  return env(vision ? 'MISTRAL_VISION_MODEL' : 'MISTRAL_CHAT_MODEL')?.trim() || (vision ? 'pixtral-large-latest' : 'mistral-small-latest');
}

/** Read on each call: a database change applies across all workers immediately.
 * Never fall back to a different provider when settings cannot be verified.
 */
export async function readAISettings(deps: Pick<Dependencies, 'env' | 'fetch'>): Promise<AISettings> {
  const url = deps.env('SUPABASE_URL'), key = deps.env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('La configuration IA est indisponible côté serveur.');
  const response = await (deps.fetch ?? globalThis.fetch)(`${url}/rest/v1/fitila_ai_settings?id=eq.1&select=id,active_provider,version,updated_at,updated_by`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('La configuration IA est momentanément indisponible.'); }
  const rows = await response.json();
  const value = rows?.[0];
  if (!value || !['mistral', 'gemini'].includes(value.active_provider) || !Number.isInteger(value.version)) throw new Error('La configuration IA est invalide.');
  return value;
}

export function aiFailure(status: number, retryAfter = 30): { code: string; message: string } {
  if (status === 429) return { code: 'llm_rate_limited', message: `Le fournisseur IA actif est temporairement limité. Réessayez dans ${retryAfter} secondes.` };
  if (status === 401 || status === 403) return { code: 'llm_not_configured', message: 'La clé du fournisseur IA actif doit être vérifiée côté serveur.' };
  if (status === 402) return { code: 'credits_exhausted', message: 'Les crédits du fournisseur IA actif sont épuisés.' };
  return { code: 'llm_unavailable', message: 'Le fournisseur IA actif est momentanément indisponible.' };
}
function failure(provider: AIProvider, status: number, code: string, message: string, retryAfter = 0): Response {
  return new Response(JSON.stringify({ error: { code, message }, message, provider, ...(retryAfter ? { retry_after: retryAfter } : {}) }), {
    status, headers: { 'Content-Type': 'application/json', ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) },
  });
}
function trace(response: Response, settings: AISettings, model: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Fitila-AI-Provider', settings.active_provider);
  headers.set('X-Fitila-AI-Model', model);
  headers.set('X-Fitila-AI-Version', String(settings.version));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
async function wait(ms: number, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function createAIClient(deps: Dependencies) {
  const request: typeof fetch = (...args) => (deps.fetch ?? globalThis.fetch)(...args);
  const mistral = createMistralClient({ env: deps.env, fetch: request, sleep: deps.sleep });
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    if (![AI_CHAT_URL, AI_AUDIO_URL].includes(url)) throw new Error('Unsupported FITILA AI operation');
    const settings = await (deps.settings ? deps.settings() : readAISettings(deps));
    const provider = settings.active_provider;
    const key = providerKey(provider, deps.env);
    const input = url === AI_CHAT_URL ? JSON.parse(typeof init.body === 'string' ? init.body : '{}') : null;
    const vision = input && (String(input.model ?? '').startsWith('pixtral') || input.messages?.some((m: { content?: unknown }) =>
      Array.isArray(m.content) && m.content.some((part: { type?: string }) => part.type === 'image_url')));
    const model = provider === 'mistral' && url === AI_AUDIO_URL
      ? deps.env('MISTRAL_TRANSCRIBE_MODEL')?.trim() || 'voxtral-mini-latest' : providerModel(provider, deps.env, !!vision);
    if (!key) return trace(failure(provider, 503, 'llm_not_configured', `Le fournisseur ${provider === 'gemini' ? 'Gemini' : 'Mistral'} actif n’est pas configuré côté serveur.`), settings, model);
    if (provider === 'mistral') return trace(await mistral(url === AI_CHAT_URL ? MISTRAL_CHAT_URL : MISTRAL_AUDIO_URL, init), settings, model);

    const signal = AbortSignal.any([AbortSignal.timeout(45_000), ...(init.signal ? [init.signal] : [])]);
    let target = GEMINI_CHAT_URL;
    let payload: Record<string, unknown>;
    let audio = false;
    if (url === AI_AUDIO_URL) {
      // Gemini accepts audio directly. Keep the existing transcription contract;
      // word timestamps remain empty because they have not been measured.
      if (!(init.body instanceof FormData)) return trace(failure(provider, 400, 'invalid_audio', 'Le fichier audio est absent.'), settings, model);
      const file = init.body.get('file');
      if (!(file instanceof File) || file.size === 0 || file.size > 12 * 1024 * 1024) return trace(failure(provider, 413, 'invalid_audio', 'Le vocal doit faire moins de 12 Mo.'), settings, model);
      const mime = file.type.split(';')[0] || 'audio/wav';
      if (!['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm', 'video/webm', 'audio/ogg', 'audio/flac', 'audio/aac'].includes(mime)) return trace(failure(provider, 400, 'invalid_audio', 'Format audio non pris en charge.'), settings, model);
      const bytes = new Uint8Array(await file.arrayBuffer());
      let encoded = ''; for (let i = 0; i < bytes.length; i += 0x8000) encoded += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      target = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      payload = {
        contents: [{ role: 'user', parts: [{ text: 'Transcris exactement ce vocal français. Ne réponds pas au locuteur et ne complète pas les passages inaudibles. Retourne un objet JSON avec text (transcription) et language (fr). Si aucun mot n’est intelligible, text doit être vide.' }, { inline_data: { mime_type: mime === 'video/webm' ? 'audio/webm' : mime, data: btoa(encoded) } }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' } },
      };
      audio = true;
    } else {
      const limit = Math.max(256, Math.min(8192, Number(deps.env('MISTRAL_MAX_OUTPUT_TOKENS')) || 4096));
      payload = { ...input, model, max_tokens: Math.min(limit, Math.max(512, Number(input.max_tokens ?? input.max_completion_tokens) || 2048)), reasoning_effort: 'minimal' };
      delete payload.max_completion_tokens;
    }
    const headers: Record<string, string> = audio ? { 'x-goog-api-key': key, 'Content-Type': 'application/json' } : { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    for (let attempt = 0; attempt < 2; attempt++) {
      signal.throwIfAborted();
      let response: Response;
      try { response = await request(target, { method: 'POST', headers, body: JSON.stringify(payload), signal }); }
      catch (error) {
        if (signal.aborted) throw error;
        if (attempt === 0) { await (deps.sleep ?? wait)(700, signal); continue; }
        return trace(failure(provider, 502, 'llm_unavailable', aiFailure(502).message), settings, model);
      }
      if (response.ok) {
        if (!audio) return trace(response, settings, model); // Preserve incremental SSE.
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || '').join('') || '';
        let parsed: { text?: unknown; language?: unknown };
        try { parsed = JSON.parse(text); } catch { return trace(failure(provider, 502, 'llm_unavailable', 'La transcription IA est illisible.'), settings, model); }
        return trace(new Response(JSON.stringify({ text: typeof parsed.text === 'string' ? parsed.text.trim() : '', language: 'fr', words: [], provider, model: data.modelVersion || model }), { headers: { 'Content-Type': 'application/json' } }), settings, model);
      }
      const rawRetry = response.headers.get('Retry-After');
      const parsedRetry = rawRetry === null ? 0 : Number.isFinite(Number(rawRetry)) ? Number(rawRetry) : Math.ceil((Date.parse(rawRetry) - Date.now()) / 1000);
      const seconds = Number.isFinite(parsedRetry) ? Math.max(0, parsedRetry) : 0;
      const status = response.status;
      await response.body?.cancel();
      if (attempt === 0 && [429, 500, 502, 503, 504].includes(status) && seconds <= 2) { await (deps.sleep ?? wait)(Math.max(1100, seconds * 1000), signal); continue; }
      const retryAfter = status === 429 ? Math.max(1, Math.min(86400, seconds || 30)) : 0;
      const result = aiFailure(status, retryAfter);
      return trace(failure(provider, status, result.code, result.message, retryAfter), settings, model);
    }
    throw new Error('Unreachable AI state');
  };
}

const runtime = { env: (name: string) => Deno.env.get(name) };
export const aiFetch = createAIClient(runtime);
/** Only used inside Edge Functions; this value never crosses the client boundary. */
export async function getActiveAIKey(): Promise<string> { return providerKey((await readAISettings(runtime)).active_provider, runtime.env); }
