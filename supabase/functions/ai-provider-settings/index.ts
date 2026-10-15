import { AI_CHAT_URL, type AIProvider, type AISettings, createAIClient, providerKey, providerModel, readAISettings } from '../_shared/ai-provider.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
type Dependencies = { env: (name: string) => string | undefined; fetch?: typeof fetch };
const runtime: Dependencies = { env: name => Deno.env.get(name) };
const isProvider = (value: unknown): value is AIProvider => value === 'gemini' || value === 'mistral';

export async function handleAIProviderSettings(req: Request, deps: Dependencies = runtime): Promise<Response> {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (!['GET', 'POST'].includes(req.method)) return reply({ error: 'method_not_allowed' }, 405);
  const token = req.headers.get('Authorization') || '';
  if (!/^Bearer \S+$/i.test(token)) return reply({ error: 'auth_required', message: 'Connectez-vous avec un compte administrateur.' }, 401);
  const base = deps.env('SUPABASE_URL'), key = deps.env('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return reply({ error: 'configuration_unavailable', message: 'Configuration serveur indisponible.' }, 503);
  const request: typeof fetch = (...args) => (deps.fetch ?? globalThis.fetch)(...args);
  const serverHeaders = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  try {
    const auth = await request(`${base}/auth/v1/user`, { headers: { apikey: key, Authorization: token }, signal: AbortSignal.timeout(5000) });
    if (!auth.ok) { await auth.body?.cancel(); return reply({ error: 'auth_required', message: 'Votre session a expiré. Reconnectez-vous.' }, 401); }
    const user = await auth.json();
    if (typeof user.id !== 'string') return reply({ error: 'auth_required' }, 401);
    // Authorisation comes from user_roles, never from editable user_metadata.
    const role = await request(`${base}/rest/v1/rpc/has_role`, { method: 'POST', headers: serverHeaders, body: JSON.stringify({ _user_id: user.id, _role: 'admin' }), signal: AbortSignal.timeout(5000) });
    if (!role.ok) { await role.body?.cancel(); return reply({ error: 'forbidden' }, 403); }
    if (await role.json() !== true) return reply({ error: 'forbidden', message: 'Cette action est réservée aux administrateurs.' }, 403);
    const settings = await readAISettings(deps);
    const summary = (value: AISettings) => ({ settings: value, providers: (['mistral', 'gemini'] as AIProvider[]).map(provider => ({ provider, configured: !!providerKey(provider, deps.env), model: providerModel(provider, deps.env), vision_model: providerModel(provider, deps.env, true) })) });
    if (req.method === 'GET') return reply(summary(settings));
    if (Number(req.headers.get('Content-Length')) > 4096) return reply({ error: 'invalid_request' }, 413);
    const raw = await req.text();
    if (raw.length > 4096) return reply({ error: 'invalid_request' }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return reply({ error: 'invalid_request' }, 400); }
    if (!body || Array.isArray(body) || typeof body !== 'object') return reply({ error: 'invalid_request' }, 400);
    if (body.action === 'get') return reply(summary(settings));
    if (!['test', 'activate'].includes(String(body.action)) || !isProvider(body.provider)) return reply({ error: 'invalid_request' }, 400);
    const provider = body.provider;
    if (body.action === 'activate' && (!Number.isInteger(body.expected_version) || body.expected_version !== settings.version)) return reply({ error: 'configuration_changed', message: 'Le réglage a changé. Actualisez avant de réessayer.' }, 409);
    if (!providerKey(provider, deps.env)) return reply({ error: 'llm_not_configured', message: `Ajoutez le secret ${provider === 'gemini' ? 'GEMINI_API_KEY' : 'MISTRAL_API_KEY'} dans les Edge Functions de FITILA.`, ...summary(settings) }, 503);
    if (body.action === 'activate' && provider === settings.active_provider) return reply({ ...summary(settings), unchanged: true });
    const started = Date.now();
    const probe = createAIClient({ ...deps, settings: async () => ({ ...settings, active_provider: provider }) });
    const response = await probe(AI_CHAT_URL, { body: JSON.stringify({ messages: [{ role: 'user', content: 'Réponds uniquement OK.' }], max_tokens: 16, temperature: 0 }), signal: AbortSignal.timeout(20_000) });
    const data = await response.json().catch(() => ({}));
    const text = data?.choices?.[0]?.message?.content;
    if (!response.ok || typeof text !== 'string' || !text.trim()) return reply({
      error: data.error?.code || 'llm_unavailable', message: data.error?.message || 'Le fournisseur ne répond pas correctement. Le choix actif est conservé.',
      provider, retry_after: data.retry_after, ...summary(settings),
    }, response.ok ? 502 : response.status);
    const test = { ok: true, provider, model: data.model || response.headers.get('X-Fitila-AI-Model'), duration_ms: Date.now() - started };
    if (body.action === 'test') return reply({ ...summary(settings), test });
    const update = await request(`${base}/rest/v1/fitila_ai_settings?id=eq.1&version=eq.${settings.version}`, {
      method: 'PATCH', headers: { ...serverHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({ active_provider: provider, version: settings.version + 1, updated_at: new Date().toISOString(), updated_by: user.id }), signal: AbortSignal.timeout(5000),
    });
    if (!update.ok) { await update.body?.cancel(); return reply({ error: 'configuration_unavailable', message: 'Le changement n’a pas pu être enregistré.' }, 503); }
    const rows = await update.json();
    if (!rows?.[0]) return reply({ error: 'configuration_changed', message: 'Un autre administrateur a modifié le réglage. Actualisez.' }, 409);
    console.log(JSON.stringify({ event: 'ai_provider_activated', provider, version: rows[0].version, admin_id: user.id }));
    return reply({ ...summary(rows[0]), test });
  } catch (error) {
    console.warn(JSON.stringify({ event: 'ai_provider_settings_unavailable', timeout: error instanceof Error && /abort|timeout/i.test(error.message) }));
    return reply({ error: 'configuration_unavailable', message: 'Le service de configuration IA est momentanément indisponible. Le choix précédent est conservé.' }, 503);
  }
}

if (Deno.env.get('FITILA_AI_TEST') !== '1') {
  console.info(JSON.stringify({ event: 'ai_provider_configuration', mistral_configured: !!providerKey('mistral', runtime.env), gemini_configured: !!providerKey('gemini', runtime.env) }));
  Deno.serve(req => handleAIProviderSettings(req));
}
