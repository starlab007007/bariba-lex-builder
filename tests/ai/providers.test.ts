import { AI_AUDIO_URL, AI_CHAT_URL, createAIClient, GEMINI_CHAT_URL, readAISettings, type AISettings } from '../../supabase/functions/_shared/ai-provider.ts';
import { MISTRAL_CHAT_URL } from '../../supabase/functions/_shared/mistral.ts';

function assert(value: unknown, message = 'assertion failed'): asserts value { if (!value) throw new Error(message); }
const json = (value: unknown, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const keys: Record<string, string> = { SUPABASE_URL: 'https://project.test', SUPABASE_SERVICE_ROLE_KEY: 'server-key', MISTRAL_API_KEY: 'mistral-secret', GEMINI_API_KEY: 'gemini-secret' };
const env = (name: string) => keys[name];
const setting = (provider: 'gemini' | 'mistral', version = 1): AISettings => ({ id: 1, active_provider: provider, version, updated_at: '2026-10-15T00:00:00Z', updated_by: null });
const options = (extra = {}) => ({ body: JSON.stringify({ messages: [{ role: 'user', content: 'Bonjour' }], ...extra }) });

Deno.test('Gemini alone works without a Mistral key and preserves JSON, images and selected model', async () => {
  let calls = 0;
  const call = createAIClient({ env: name => name === 'MISTRAL_API_KEY' ? undefined : env(name), settings: async () => setting('gemini'), fetch: async (url, init) => {
    calls++; assert(String(url) === GEMINI_CHAT_URL);
    const headers = new Headers(init?.headers); assert(headers.get('Authorization') === 'Bearer gemini-secret');
    const body = JSON.parse(String(init?.body)); assert(body.model === 'gemini-3.1-flash-lite' && body.reasoning_effort === 'minimal');
    assert(body.response_format.type === 'json_object' && body.messages[0].content[1].type === 'image_url');
    return json({ model: body.model, choices: [{ message: { content: '{"ok":true}' } }] });
  } });
  const response = await call(AI_CHAT_URL, options({ model: 'pixtral-large-latest', response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: 'JSON' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } }] }] }));
  assert(response.ok && response.headers.get('X-Fitila-AI-Provider') === 'gemini'); assert(Number(calls) === 1);
});
Deno.test('Mistral remains usable without a Gemini key', async () => {
  const call = createAIClient({ env: name => name === 'GEMINI_API_KEY' ? undefined : env(name), settings: async () => setting('mistral'), fetch: async (url, init) => {
    assert(String(url) === MISTRAL_CHAT_URL); assert(new Headers(init?.headers).get('Authorization') === 'Bearer mistral-secret');
    return json({ choices: [{ message: { content: 'Bonjour' } }] });
  } });
  assert((await call(AI_CHAT_URL, options())).headers.get('X-Fitila-AI-Provider') === 'mistral');
});
Deno.test('a changed global choice applies on the next request across new clients', async () => {
  let selected = setting('mistral'); const hosts: string[] = [];
  const deps = { env, settings: async () => selected, fetch: async (url: RequestInfo | URL) => { hosts.push(new URL(String(url)).hostname); return json({}); } };
  await createAIClient(deps)(AI_CHAT_URL, options()); selected = setting('gemini', 2);
  const response = await createAIClient(deps)(AI_CHAT_URL, options());
  assert(hosts.join(',') === 'api.mistral.ai,generativelanguage.googleapis.com'); assert(response.headers.get('X-Fitila-AI-Version') === '2');
});
Deno.test('missing selected-provider key never silently sends data to another provider', async () => {
  let calls = 0;
  const call = createAIClient({ env: name => name === 'GEMINI_API_KEY' ? undefined : env(name), settings: async () => setting('gemini'), fetch: async () => { calls++; throw new Error('Must not call'); } });
  const response = await call(AI_CHAT_URL, options()); const body = await response.json();
  assert(response.status === 503 && body.provider === 'gemini' && body.error.code === 'llm_not_configured' && calls === 0);
});
Deno.test('settings failure fails closed without changing provider', async () => {
  let calls = 0;
  const call = createAIClient({ env, settings: async () => { throw new Error('configuration unavailable'); }, fetch: async () => { calls++; return json({}); } });
  let failed = false; try { await call(AI_CHAT_URL, options()); } catch { failed = true; } assert(failed && calls === 0);
});
Deno.test('arbitrary endpoints and caller authorisation cannot receive either server key', async () => {
  let calls = 0;
  const call = createAIClient({ env, settings: async () => setting('gemini'), fetch: async (url, init) => {
    calls++; assert(String(url) === GEMINI_CHAT_URL); assert(new Headers(init?.headers).get('Authorization') === 'Bearer gemini-secret'); return json({});
  } });
  let failed = false; try { await call('https://untrusted.test', options()); } catch { failed = true; } assert(failed && calls === 0);
  await call(AI_CHAT_URL, { ...options({ provider: 'mistral', model: 'mistral-small-latest' }), headers: { Authorization: 'Bearer caller-key' } }); assert(Number(calls) === 1);
});
Deno.test('Gemini SSE remains a stream with the existing application protocol', async () => {
  const content = 'data: {"choices":[{"delta":{"content":"Bonjour"}}]}\n\ndata: [DONE]\n\n';
  const call = createAIClient({ env, settings: async () => setting('gemini'), fetch: async () => new Response(content, { headers: { 'Content-Type': 'text/event-stream' } }) });
  const response = await call(AI_CHAT_URL, options({ stream: true })); assert(!response.bodyUsed); assert(await response.text() === content);
});
Deno.test('Gemini French audio preserves text, language and honest empty word timestamps', async () => {
  const form = new FormData(); form.set('file', new File([new Uint8Array(44)], 'voice.wav', { type: 'audio/wav' }));
  const call = createAIClient({ env, settings: async () => setting('gemini'), fetch: async (url, init) => {
    assert(String(url).endsWith('gemini-3.1-flash-lite:generateContent'));
    const headers = new Headers(init?.headers); assert(headers.get('x-goog-api-key') === 'gemini-secret' && !headers.has('Authorization'));
    const body = JSON.parse(String(init?.body)); assert(body.contents[0].parts[1].inline_data.mime_type === 'audio/wav');
    return json({ modelVersion: 'gemini-tested', candidates: [{ content: { parts: [{ text: '{"text":"Bonjour à tous","language":"fr"}' }] } }] });
  } });
  const data = await (await call(AI_AUDIO_URL, { body: form })).json(); assert(data.text === 'Bonjour à tous' && data.language === 'fr' && data.words.length === 0 && data.provider === 'gemini');
});
Deno.test('Gemini rate limits preserve provider, status and retry delay with no fallback', async () => {
  let calls = 0;
  const call = createAIClient({ env, settings: async () => setting('gemini'), fetch: async () => { calls++; return json({ secret: 'private error body' }, 429, { 'Retry-After': '60' }); } });
  const response = await call(AI_CHAT_URL, options()); const data = await response.json();
  assert(response.status === 429 && data.error.code === 'llm_rate_limited' && data.provider === 'gemini' && data.retry_after === 60 && calls === 1); assert(!JSON.stringify(data).includes('private error body'));
});
Deno.test('Mistral audio trace reports Voxtral rather than the text model', async () => {
  const form = new FormData(); form.set('file', new File(['audio'], 'voice.wav', { type: 'audio/wav' }));
  const call = createAIClient({ env, settings: async () => setting('mistral'), fetch: async (url, init) => {
    assert(String(url).endsWith('/audio/transcriptions')); assert(init?.body instanceof FormData && init.body.get('model') === 'voxtral-mini-latest'); return json({ text: 'Bonjour' });
  } });
  const response = await call(AI_AUDIO_URL, { body: form }); assert(response.headers.get('X-Fitila-AI-Model') === 'voxtral-mini-latest');
});
Deno.test('Gemini Retry-After dates are respected without an immediate extra request', async () => {
  let calls = 0;
  const call = createAIClient({ env, settings: async () => setting('gemini'), fetch: async () => { calls++; return json({}, 429, { 'Retry-After': new Date(Date.now() + 60000).toUTCString() }); } });
  const response = await call(AI_CHAT_URL, options()); assert(response.status === 429 && Number(response.headers.get('Retry-After')) >= 59 && calls === 1);
});
Deno.test('database setting reads require server credentials and reject invalid providers', async () => {
  let requests = 0;
  const deps = { env, fetch: async (_url: RequestInfo | URL, init?: RequestInit) => { requests++; assert(new Headers(init?.headers).get('Authorization') === 'Bearer server-key'); return json([{ ...setting('mistral'), active_provider: 'unknown' }]); } };
  let failed = false; try { await readAISettings(deps); } catch { failed = true; } assert(failed && requests === 1);
});

Deno.env.set('FITILA_AI_TEST', '1');
const { handleAIProviderSettings } = await import('../../supabase/functions/ai-provider-settings/index.ts');
type Scenario = { admin?: boolean; invalid?: boolean; geminiKey?: boolean; providerStatus?: number; conflict?: boolean };
function administration(config: Scenario = {}) {
  let current = setting('mistral'); let writes = 0; let providerCalls = 0; const calls: string[] = [];
  const deps = { env: (name: string) => config.geminiKey === false && name === 'GEMINI_API_KEY' ? undefined : env(name), fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); calls.push(url);
    if (url.endsWith('/auth/v1/user')) return config.invalid ? json({}, 401) : json({ id: '11111111-1111-4111-8111-111111111111', user_metadata: { role: 'admin', is_admin: true } });
    if (url.endsWith('/rpc/has_role')) { const body = JSON.parse(String(init?.body)); assert(body._user_id === '11111111-1111-4111-8111-111111111111' && body._role === 'admin'); return json(config.admin !== false); }
    if (url.includes('/rest/v1/fitila_ai_settings')) {
      if (init?.method === 'PATCH') {
        writes++; if (config.conflict) return json([]);
        assert(url.endsWith('version=eq.1')); current = { ...current, ...JSON.parse(String(init.body)) }; return json([current]);
      }
      return json([current]);
    }
    if (url === GEMINI_CHAT_URL || url === MISTRAL_CHAT_URL) {
      providerCalls++; return config.providerStatus ? json({}, config.providerStatus, { 'Retry-After': '60' }) : json({ model: 'tested-model', choices: [{ message: { content: 'OK' } }] });
    }
    throw new Error('Unexpected request: ' + url);
  } };
  const request = (body: unknown, token = 'Bearer valid-user-jwt') => handleAIProviderSettings(new Request('https://edge.test', { method: 'POST', headers: { Authorization: token }, body: JSON.stringify(body) }), deps);
  return { request, status: () => ({ current, writes, providerCalls, calls }) };
}
Deno.test('visitors cannot read or change the AI selection', async () => {
  const app = administration(); const response = await app.request({ action: 'activate', provider: 'gemini', expected_version: 1 }, '');
  assert(response.status === 401 && app.status().calls.length === 0);
});
Deno.test('editable metadata cannot grant admin access', async () => {
  const app = administration({ admin: false }); const response = await app.request({ action: 'activate', provider: 'gemini', expected_version: 1 });
  assert(response.status === 403 && app.status().writes === 0 && app.status().providerCalls === 0);
});
Deno.test('invalid authenticated sessions cannot change the AI selection', async () => {
  const app = administration({ invalid: true }); assert((await app.request({ action: 'get' })).status === 401); assert(app.status().writes === 0);
});
Deno.test('admin reads expose only key presence, never secret values', async () => {
  const app = administration(); const response = await app.request({ action: 'get' }); const text = await response.text();
  assert(response.ok && text.includes('configured') && !text.includes('mistral-secret') && !text.includes('gemini-secret') && !text.includes('server-key'));
});
Deno.test('activation is blocked without the selected key', async () => {
  const app = administration({ geminiKey: false }); const response = await app.request({ action: 'activate', provider: 'gemini', expected_version: 1 });
  assert(response.status === 503 && app.status().writes === 0 && app.status().current.active_provider === 'mistral');
});
Deno.test('a failed provider test preserves the existing global selection', async () => {
  const app = administration({ providerStatus: 429 }); const response = await app.request({ action: 'activate', provider: 'gemini', expected_version: 1 });
  assert(response.status === 429 && app.status().writes === 0 && app.status().current.active_provider === 'mistral');
});
Deno.test('testing a provider does not activate it', async () => {
  const app = administration(); const response = await app.request({ action: 'test', provider: 'gemini' });
  assert(response.ok && app.status().writes === 0 && app.status().providerCalls === 1 && app.status().current.active_provider === 'mistral');
});
Deno.test('a successful activation persists a versioned global choice with the verified admin identity', async () => {
  const app = administration(); const response = await app.request({ action: 'activate', provider: 'gemini', expected_version: 1 }); const data = await response.json();
  assert(response.ok && app.status().writes === 1 && app.status().providerCalls === 1 && data.settings.active_provider === 'gemini' && data.settings.version === 2 && data.settings.updated_by === '11111111-1111-4111-8111-111111111111');
  assert((await (await app.request({ action: 'get' })).json()).settings.active_provider === 'gemini');
});
Deno.test('stale versions and concurrent activation cannot overwrite a newer choice', async () => {
  const stale = administration(); assert((await stale.request({ action: 'activate', provider: 'gemini', expected_version: 0 })).status === 409); assert(stale.status().providerCalls === 0);
  const race = administration({ conflict: true }); assert((await race.request({ action: 'activate', provider: 'gemini', expected_version: 1 })).status === 409); assert(race.status().current.active_provider === 'mistral');
});

const { handleChat } = await import('../../supabase/functions/fitila-ia-chat/index.ts');
const { handleImageAnimation } = await import('../../supabase/functions/generate-image-animation/index.ts');
const realFetch = globalThis.fetch;
async function geminiOnly<T>(fetcher: typeof fetch, run: () => Promise<T>) {
  const names = ['MISTRAL_API_KEY', 'GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HF_INFERENCE_TOKEN', 'HUGGING_FACE_API_TOKEN', 'FITILA_VOICE_SERVICE_URL', 'FITILA_MODEL_API_TOKEN'];
  const before = names.map(name => Deno.env.get(name)); names.forEach(name => Deno.env.delete(name));
  Deno.env.set('GEMINI_API_KEY', 'gemini-secret'); Deno.env.set('SUPABASE_URL', 'https://project.test'); Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'server-key');
  globalThis.fetch = async (url, init) => String(url).includes('/rest/v1/fitila_ai_settings') ? json([setting('gemini')]) : fetcher(url, init);
  try { return await run(); } finally { globalThis.fetch = realFetch; names.forEach((name, i) => before[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, before[i]!)); }
}
Deno.test('DUNYA cannot use configured Gemini when only the FITILA brain is allowed', async () => {
  let calls = 0;
  await geminiOnly(async () => { calls++; throw new Error('Paid provider must not be contacted'); }, async () => {
    const r = await handleChat(new Request('https://edge.test',{method:'POST',body:JSON.stringify({message:'Bonjour',skip_translation:true})})); assert(r.status === 503 && (await r.json()).error === 'llm_not_configured');
  });
  assert(calls === 0);
});

Deno.test('image analysis never falls back to a configured paid Gemini key', async () => {
  let calls = 0;
  await geminiOnly(async () => { calls++; throw new Error('Paid provider must not be contacted'); }, async () => {
    const r = await handleImageAnimation(new Request('https://edge.test',{method:'POST',body:JSON.stringify({imageBase64:'AA==',story:'Souvenir',analysisType:'full'})})); assert(!r.ok);
  });
  assert(calls === 0);
});
