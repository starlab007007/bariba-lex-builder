/** Server-only transport shared by FITILA text, vision and French transcription.
 * Image generation and Bariba speech keep their specialised providers.
 */
type Dependencies = {
  env: (name: string) => string | undefined;
  fetch?: typeof fetch;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
};

export const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
export const MISTRAL_AUDIO_URL = 'https://api.mistral.ai/v1/audio/transcriptions';

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function mistralFailure(status: number, retryAfter = 0): { code: string; message: string } {
  if (status === 429) return { code: 'llm_rate_limited', message: `Le service IA est temporairement limité. Réessayez dans ${Math.max(1, retryAfter || 30)} secondes.` };
  if (status === 401 || status === 403) return { code: 'llm_not_configured', message: 'La clé Mistral doit être vérifiée côté serveur.' };
  if (status === 402) return { code: 'credits_exhausted', message: 'Le quota de facturation Mistral est épuisé.' };
  return { code: 'llm_unavailable', message: 'Le service IA est momentanément indisponible. Réessayez plus tard.' };
}

export function createMistralClient(deps: Dependencies) {
  const request: typeof fetch = (...args) => (deps.fetch ?? globalThis.fetch)(...args);
  const sleep = deps.sleep ?? delay;
  return async function mistralFetch(url: string, init: RequestInit = {}): Promise<Response> {
    // A fixed allowlist prevents sending the server secret to a caller-controlled URL.
    if (url !== MISTRAL_CHAT_URL && url !== MISTRAL_AUDIO_URL) throw new Error('Unsupported Mistral endpoint');
    const key = deps.env('MISTRAL_API_KEY')?.trim();
    if (!key) return failureResponse(503, 'llm_not_configured', 'Le service Mistral n’est pas configuré côté serveur.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${key}`);
    let body = init.body;
    if (url === MISTRAL_CHAT_URL) {
      const payload = JSON.parse(typeof body === 'string' ? body : '{}');
      const vision = String(payload.model ?? '').startsWith('pixtral') || payload.messages?.some((m: { content?: unknown }) =>
        Array.isArray(m.content) && m.content.some((part: { type?: string }) => part.type === 'image_url'));
      payload.model = deps.env(vision ? 'MISTRAL_VISION_MODEL' : 'MISTRAL_CHAT_MODEL')?.trim()
        || (vision ? 'pixtral-large-latest' : 'mistral-small-latest');
      const configuredLimit = Number(deps.env('MISTRAL_MAX_OUTPUT_TOKENS')) || 4096;
      const limit = Math.max(256, Math.min(8192, configuredLimit));
      payload.max_tokens = Math.max(1, Math.min(limit, Number(payload.max_tokens ?? payload.max_completion_tokens) || 2048));
      delete payload.max_completion_tokens;
      body = JSON.stringify(payload);
      headers.set('Content-Type', 'application/json');
    } else if (body instanceof FormData) {
      const form = new FormData();
      for (const [name, value] of body.entries()) form.append(name, value);
      form.set('model', deps.env('MISTRAL_TRANSCRIBE_MODEL')?.trim() || 'voxtral-mini-latest');
      body = form;
      headers.delete('Content-Type'); // fetch must supply the multipart boundary.
    }
    const signal = AbortSignal.any([AbortSignal.timeout(45_000), ...(init.signal ? [init.signal] : [])]);
    for (let attempt = 0; attempt < 2; attempt++) {
      signal.throwIfAborted();
      let response: Response;
      try {
        response = await request(url, { ...init, method: 'POST', headers, body, signal });
      } catch (error) {
        if (signal.aborted) throw error;
        if (attempt === 0) { await sleep(600, signal); continue; }
        return failureResponse(502, 'llm_unavailable', mistralFailure(502).message);
      }
      if (response.ok) return response; // Includes SSE; never buffer successful streams.
      const retryHeader = response.headers.get('Retry-After');
      const parsedRetry = retryHeader === null ? 0 : Number.isFinite(Number(retryHeader))
        ? Number(retryHeader) : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000);
      const retrySeconds = Number.isFinite(parsedRetry) ? Math.max(0, parsedRetry) : 0;
      const retryable = response.status === 429 || [500, 502, 503, 504].includes(response.status);
      const status = response.status;
      await response.body?.cancel(); // Never log upstream bodies (may include user prompts).
      if (attempt === 0 && retryable && retrySeconds <= 2) {
        await sleep(Math.max(retrySeconds * 1000, 1100 + (deps.random ?? Math.random)() * 300), signal);
        continue;
      }
      const retryAfter = status === 429 ? Math.max(1, Math.min(86400, retrySeconds || 30)) : 0;
      const failure = mistralFailure(status, retryAfter);
      return failureResponse(status, failure.code, failure.message, retryAfter);
    }
    throw new Error('Unreachable Mistral state');
  };
}

function failureResponse(status: number, code: string, message: string, retryAfter = 0): Response {
  return new Response(JSON.stringify({ error: { code, message }, message, provider: 'mistral', ...(retryAfter ? { retry_after: retryAfter } : {}) }), {
    status,
    headers: { 'Content-Type': 'application/json', ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) },
  });
}

// Politique FITILA : aucun appel Mistral (payant). Voir ai-provider.ts.
export const mistralFetch = async (_url: string, _init: RequestInit = {}): Promise<Response> =>
  failureResponse(503, 'llm_not_configured', 'Aucun fournisseur IA payant : cerveau local FITILA uniquement.');
