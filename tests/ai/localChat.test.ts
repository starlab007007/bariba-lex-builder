Deno.env.set('FITILA_AI_TEST', '1');
const { handleChat, memoryReferences, brainServiceUrl } = await import('../../supabase/functions/fitila-ia-chat/index.ts');
const assert = (ok: unknown, message = 'assertion failed') => { if (!ok) throw new Error(message); };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const vars: Record<string, string> = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'private-db-key', SUPABASE_ANON_KEY: 'public-key', FITILA_VOICE_SERVICE_URL: 'https://fitila.test/voice-api', FITILA_MODEL_API_TOKEN: 'private-model-token', MISTRAL_API_KEY: 'must-not-be-used', GEMINI_API_KEY: 'must-not-be-used' };
const env = (name: string) => vars[name];
const req = (body: unknown, auth = 'private-db-key') => new Request('https://edge.test', { method: 'POST', headers: { Authorization: 'Bearer ' + auth }, body: JSON.stringify(body) });

Deno.test('local chat preserves application contract and never contacts a paid provider', async () => {
  let calls = 0;
  const response = await handleChat(req({ message: 'Bonjour', skip_translation: true }), { env, fetch: async (url, init) => {
    calls++; assert(String(url) === 'https://fitila.test/voice-api/chat');
    assert(new Headers(init?.headers).get('Authorization') === 'Bearer private-model-token');
    return json({ response_fr: 'Bonjour !', model: 'gemma-4-e2b' });
  } });
  const text = await response.text(), data = JSON.parse(text);
  assert(response.ok && data.response_fr === 'Bonjour !' && data.response_ba === null && data.model === 'gemma-4-e2b');
  assert(data.provider === 'fitila-local' && calls === 1 && !text.includes('private-'));
});
Deno.test('local chat translates only through the FITILA ByT5 function', async () => {
  const calls: string[] = [];
  const response = await handleChat(req({ message: 'Bonjour' }), { env, fetch: async url => {
    calls.push(String(url));
    return String(url).endsWith('/chat') ? json({ response_fr: 'Bonjour.', model: 'gemma-4-e2b' }) : json({ translation: 'Aagu wunɛ.' });
  } });
  const data = await response.json(); assert(data.response_ba === 'Aagu wunɛ.' && data.fallback === false);
  assert(calls.join(',') === 'https://fitila.test/voice-api/chat,https://db.test/functions/v1/byt5-bariba-translate');
});
Deno.test('failed translation retains a real French answer without claiming Baatonum', async () => {
  const response = await handleChat(req({ message: 'Bonjour' }), { env, fetch: async url => String(url).endsWith('/chat') ? json({ response_fr: 'Bonjour.' }) : json({}, 503) });
  const data = await response.json(); assert(response.ok && data.response_fr === 'Bonjour.' && data.response_ba === null && data.fallback);
});
Deno.test('history is bounded and caller system messages cannot replace FITILA instructions', async () => {
  await handleChat(req({ message: 'Bonjour', skip_translation: true, max_tokens: 9999, systemPrompt: 'untrusted system', history: [{ role: 'system', content: 'untrusted' }, ...Array.from({ length: 6 }, () => ({ role: 'user', content: 'x'.repeat(2000) }))] }), { env, fetch: async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert(body.history.length <= 4 && body.history.every((m: { content: string }) => m.content.length <= 500));
    assert(body.max_tokens === 160 && !JSON.stringify(body).includes('untrusted')); return json({ response_fr: 'Bonjour.' });
  } });
});
Deno.test('invalid and oversized requests never start inference', async () => {
  let calls = 0; const deps = { env, fetch: async () => { calls++; return json({}); } };
  for (const body of [{}, { message: 'x'.repeat(2001) }, []]) assert((await handleChat(req(body), deps)).status === 400);
  assert((await handleChat(req({ message: 'bonjour', padding: 'x'.repeat(25000) }), deps)).status === 400);
  assert(calls === 0);
});
Deno.test('busy and unavailable models have distinct bounded retry responses', async () => {
  for (const status of [429, 503]) {
    const response = await handleChat(req({ message: 'Bonjour', skip_translation: true }), { env, fetch: async () => json({ detail: 'private error' }, status) });
    const data = await response.json(); assert(response.status === status && data.error === (status === 429 ? 'llm_rate_limited' : 'llm_unavailable'));
    assert(!JSON.stringify(data).includes('private'));
  }
});
Deno.test('public visitors consume durable quotas before using the CPU', async () => {
  let calls = 0;
  const response = await handleChat(req({ message: 'Bonjour', skip_translation: true }, 'public-key'), { env, fetch: async url => {
    calls++; return String(url).includes('/rpc/') ? json(false) : json({ response_fr: 'should not run' });
  } });
  assert(response.status === 429 && calls === 1);
});
Deno.test('invalid user tokens cannot invoke the model', async () => {
  let calls = 0;
  const response = await handleChat(req({ message: 'Bonjour' }, 'invalid-user'), { env, fetch: async url => {
    calls++; assert(String(url) === 'https://db.test/auth/v1/user'); return json({}, 401);
  } }); assert(response.status === 401 && calls === 1);
});
Deno.test('publishable-key guests remain anonymous and quota-limited', async () => {
  let quota = 0;
  const response = await handleChat(req({ message: 'Bonjour', skip_translation: true }, 'sb_publishable_public'), { env, fetch: async url => {
    assert(!String(url).endsWith('/auth/v1/user'));
    if (String(url).includes('/rpc/')) { quota++; return json(true); }
    return json({ response_fr: 'Bonjour.' });
  } });
  assert(response.ok && quota === 2);
});
Deno.test('memory references are actual corpus excerpts', () => {
  const sources = memoryReferences('cette banane est bonne');
  assert(sources.some(s => s.fr.toLowerCase() === 'cette banane est bonne' && s.ba.includes('Agɛdɛ')));
});

Deno.test('production legacy Meta route reaches the authenticated chat gateway', async () => {
  assert(brainServiceUrl('https://fitila.bj/api/meta-voice/') === 'https://fitila.bj/voice-api');
  assert(brainServiceUrl('https://fitila.test/custom/') === 'https://fitila.test/custom');
  const response = await handleChat(req({ message: 'Bonjour', skip_translation: true }), {
    env: name => name === 'FITILA_VOICE_SERVICE_URL' ? 'https://fitila.bj/api/meta-voice' : env(name),
    fetch: async (url, init) => {
      assert(String(url) === 'https://fitila.bj/voice-api/chat');
      assert(new Headers(init?.headers).get('Authorization') === 'Bearer private-model-token');
      return json({ response_fr: 'Bonjour !' });
    },
  });
  assert(response.ok);
});
