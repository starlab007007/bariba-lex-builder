import { createMistralClient, MISTRAL_AUDIO_URL, MISTRAL_CHAT_URL } from '../../supabase/functions/_shared/mistral.ts';

function assert(ok: unknown, message = 'assertion failed'): asserts ok { if (!ok) throw new Error(message); }
const json = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const options = (extra = {}) => ({ body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: 'Bonjour' }], ...extra }) });

Deno.test('one server secret, configurable model and bounded output; caller credentials are ignored', async () => {
  const env: Record<string, string> = { MISTRAL_API_KEY: 'server-secret', MISTRAL_CHAT_MODEL: 'configured-text', MISTRAL_MAX_OUTPUT_TOKENS: '500' };
  const call = createMistralClient({ env: name => env[name], fetch: async (_url, init) => {
    assert(new Headers(init?.headers).get('Authorization') === 'Bearer server-secret');
    const body = JSON.parse(String(init?.body));
    assert(body.model === 'configured-text' && body.max_tokens === 500 && body.response_format.type === 'json_object');
    return json({ choices: [{ message: { content: 'Bonjour' } }] });
  } });
  const response = await call(MISTRAL_CHAT_URL, { ...options({ max_tokens: 9000, response_format: { type: 'json_object' } }), headers: { Authorization: 'Bearer untrusted' } });
  assert(response.ok); assert(!(await response.text()).includes('server-secret'));
});
Deno.test('vision messages use the vision model while preserving image content', async () => {
  const call = createMistralClient({ env: name => name === 'MISTRAL_API_KEY' ? 'key' : name === 'MISTRAL_VISION_MODEL' ? 'configured-vision' : undefined, fetch: async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert(body.model === 'configured-vision'); assert(body.messages[0].content[0].image_url.url.startsWith('data:image/'));
    return json({});
  } });
  await call(MISTRAL_CHAT_URL, options({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } }] }] }));
});
Deno.test('missing key fails without network and arbitrary destinations cannot receive secrets', async () => {
  let calls = 0;
  const call = createMistralClient({ env: () => undefined, fetch: async () => { calls++; return json({}); } });
  const response = await call(MISTRAL_CHAT_URL, options());
  assert(response.status === 503 && (await response.json()).error.code === 'llm_not_configured'); assert(calls === 0);
  let blocked = false; try { await call('https://untrusted.test', options()); } catch { blocked = true; } assert(blocked && calls === 0);
});
Deno.test('a transient 429 is retried once then succeeds', async () => {
  let calls = 0, waits = 0;
  const call = createMistralClient({ env: () => 'key', sleep: async () => { waits++; }, fetch: async () => ++calls === 1 ? json({}, 429) : json({ answer: 'ok' }) });
  assert((await call(MISTRAL_CHAT_URL, options())).ok); assert(calls === 2 && waits === 1);
});
Deno.test('long Retry-After is respected without retry storm and upstream body stays private', async () => {
  let calls = 0;
  const call = createMistralClient({ env: () => 'key', fetch: async () => { calls++; return json({ sensitive: 'private-prompt' }, 429, { 'Retry-After': '60' }); } });
  const response = await call(MISTRAL_CHAT_URL, options());
  assert(response.status === 429 && response.headers.get('Retry-After') === '60');
  const data = await response.json(); assert(data.error.code === 'llm_rate_limited' && data.retry_after === 60); assert(!JSON.stringify(data).includes('private-prompt')); assert(calls === 1);
});
Deno.test('persistent transient failures are bounded to two attempts', async () => {
  let calls = 0;
  const call = createMistralClient({ env: () => 'key', sleep: async () => {}, fetch: async () => { calls++; return json({}, 503); } });
  assert((await call(MISTRAL_CHAT_URL, options())).status === 503); assert(calls === 2);
});
Deno.test('invalid key is not retried', async () => {
  let calls = 0;
  const call = createMistralClient({ env: () => 'key', fetch: async () => { calls++; return json({}, 401); } });
  const response = await call(MISTRAL_CHAT_URL, options());
  assert(response.status === 401 && (await response.json()).error.code === 'llm_not_configured'); assert(calls === 1);
});
Deno.test('cancellation during backoff prevents a second paid request', async () => {
  let calls = 0;
  const abort = new AbortController();
  const call = createMistralClient({ env: () => 'key', sleep: async () => { abort.abort(); }, fetch: async () => { calls++; return json({}, 429); } });
  let cancelled = false; try { await call(MISTRAL_CHAT_URL, { ...options(), signal: abort.signal }); } catch { cancelled = true; }
  assert(cancelled && calls === 1);
});
Deno.test('successful SSE is passed through without buffering', async () => {
  const response = new Response('data: {"choices":[]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  const call = createMistralClient({ env: () => 'key', fetch: async () => response });
  const actual = await call(MISTRAL_CHAT_URL, options({ stream: true })); assert(actual === response && !actual.bodyUsed); await actual.text();
});
Deno.test('French transcription uses the same key and keeps multipart audio and language', async () => {
  const form = new FormData(); form.set('file', new File(['audio'], 'voice.wav', { type: 'audio/wav' })); form.set('language', 'fr');
  const call = createMistralClient({ env: name => name === 'MISTRAL_API_KEY' ? 'key' : undefined, fetch: async (_url, init) => {
    assert(init?.body instanceof FormData); assert(init.body.get('model') === 'voxtral-mini-latest');
    assert(init.body.get('language') === 'fr' && init.body.get('file') instanceof File);
    assert(!new Headers(init.headers).has('Content-Type')); return json({ text: 'Bonjour' });
  } });
  assert((await call(MISTRAL_AUDIO_URL, { body: form })).ok);
});

Deno.env.set('FITILA_AI_TEST', '1');
const { handleChat } = await import('../../supabase/functions/fitila-ia-chat/index.ts');
const { handleTemplateAssets } = await import('../../supabase/functions/generate-template-assets/index.ts');
const { handleImageAnimation } = await import('../../supabase/functions/generate-image-animation/index.ts');
const { handleRefine, controlledEdit } = await import('../../supabase/functions/refine-bariba/index.ts');
const { handleByT5 } = await import('../../supabase/functions/byt5-bariba-translate/index.ts');
const { ensureMemory } = await import('../../supabase/functions/_shared/translation-verifier.ts');
await ensureMemory();
const realFetch = globalThis.fetch;

async function mocked<T>(fetcher: typeof fetch, run: () => Promise<T>): Promise<T> {
  const names = ['MISTRAL_API_KEY', 'HF_INFERENCE_TOKEN', 'HUGGING_FACE_API_TOKEN', 'FITILA_IMAGE_API_KEY', 'FITILA_IMAGE_API_URL', 'GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const before = names.map(name => Deno.env.get(name));
  names.forEach(name => Deno.env.delete(name)); Deno.env.set('MISTRAL_API_KEY', 'server-test-key');
  Deno.env.set('SUPABASE_URL', 'https://project.test'); Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  globalThis.fetch = async (url, init) => String(url).includes('/rest/v1/fitila_ai_settings')
    ? json([{ id: 1, active_provider: 'mistral', version: 1, updated_at: '2026-10-15T00:00:00Z', updated_by: null }])
    : fetcher(url, init);
  try { return await run(); }
  finally { globalThis.fetch = realFetch; names.forEach((name, i) => before[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, before[i]!)); }
}
const req = (body: unknown) => new Request('https://edge.test', { method: 'POST', body: JSON.stringify(body) });

Deno.test('DUNYA chat contract returns the actual Mistral model and skips redundant translation', async () => {
  await mocked(async (url, init) => {
    assert(String(url) === MISTRAL_CHAT_URL); assert(new Headers(init?.headers).get('Authorization') === 'Bearer server-test-key');
    return json({ model: 'mistral-tested', choices: [{ message: { content: 'Bonjour !' } }] });
  }, async () => {
    const response = await handleChat(req({ message: 'Présente FITILA.', skip_translation: true })); const data = await response.json();
    assert(response.ok && data.response_fr === 'Bonjour !' && data.model === 'mistral-tested' && data.response_ba === null);
  });
});
Deno.test('Mistral quota stays HTTP 429 with a readable message instead of generic 500', async () => {
  await mocked(async () => json({}, 429, { 'Retry-After': '60' }), async () => {
    const response = await handleChat(req({ message: 'Présente FITILA.', skip_translation: true })); const data = await response.json();
    assert(response.status === 429 && data.error === 'llm_rate_limited' && data.retry_after === 60 && data.message.includes('limité'));
  });
});
Deno.test('template voice descriptions work with only Mistral configured', async () => {
  await mocked(async (url) => { assert(String(url) === MISTRAL_CHAT_URL); return json({ choices: [{ message: { content: 'Partagez votre histoire.' } }] }); }, async () => {
    const response = await handleTemplateAssets(req({ action: 'generate_voice_description', templateLabel: 'Histoire', templateDescription: 'Raconter un souvenir' }));
    const data = await response.json(); assert(response.ok && data.voiceDescription === 'Partagez votre histoire.');
  });
});
Deno.test('image and emotion analysis route to Mistral vision and text without an image generator key', async () => {
  const models: string[] = [];
  await mocked(async (url, init) => {
    assert(String(url) === MISTRAL_CHAT_URL); const body = JSON.parse(String(init?.body)); models.push(body.model);
    return json({ choices: [{ message: { content: JSON.stringify({ subjects: [], focusPoints: [], depthLayers: [], segments: [], mood: 'calm', colorPalette: [] }) } }] });
  }, async () => {
    const response = await handleImageAnimation(req({ imageBase64: 'AA==', story: 'Une personne raconte un souvenir.', analysisType: 'full' }));
    assert(response.ok); assert(models.join(',') === 'pixtral-large-latest,mistral-small-latest');
  });
});

Deno.test('post-editing rejects changed quantities, French negation and unattested Bariba words', () => {
  assert(!controlledEdit('Il reste 12 litres.', 'Il reste 13 litres.', 'fr').accepted);
  assert(!controlledEdit('Il ne vient pas ici.', 'Il vient ici.', 'fr').accepted);
  assert(!controlledEdit('Aagu wunɛ ka weru', 'Aagu wunɛ ka weruzzz', 'ba').accepted);
  assert(controlledEdit('Aagu wunɛ ka weru', 'Aagu wunɛ ka weru.', 'ba').accepted);
});
Deno.test('an attested source takes precedence without a Mistral rewrite', async () => {
  await mocked(async () => { throw new Error('attested pair must not call Mistral'); }, async () => {
    const response = await handleRefine(req({ originalInput: 'Salut ! Bonne arrivée !', text: 'un brouillon erroné', direction: 'fr-ba', type: 'translate' }));
    const data = await response.json(); assert(data.refined.includes('Aagu') && data.meta.attested && !data.meta.aiUsed && data.meta.requiresHumanValidation && data.linguisticQualityCertified === false);
  });
});
Deno.test('transcription reconstruction uses references without calling either LLM and keeps raw words', async () => {
  let requests = 0;
  await mocked(async (url) => {
    requests++;
    if (String(url).includes('consume_dunya_voice_quota')) return json(true);
    if (String(url).includes('fitila_asr_reference_candidates')) return json([{ query_index: 0, text: 'Agɛdɛ ye ya do.', source: 'apprendre', source_id: 'lesson', validation: 'catalogue', kind: 'lecon' }]);
    throw new Error('transcription must not use the conversational provider');
  }, async () => {
    const data = await (await handleRefine(req({ text: 'Agede ye ya do', type: 'transcription' }))).json();
    assert(data.refined === 'Agede ye ya do' && data.raw_transcription === 'Agede ye ya do');
    assert(data.repair.proposals[0].text === 'Agɛdɛ ye ya do.' && !data.meta.aiUsed && data.meta.requiresHumanValidation);
    assert(requests === 3);
  });
});
Deno.test('retired typed and target reference review cannot search, rewrite or call an AI provider', async () => {
  let calls = 0;
  await mocked(async () => {
    calls++; throw new Error('Retired reference review must not use the network');
  }, async () => {
    for (const scope of ['source', 'translation']) {
      const response = await handleRefine(req({ text: 'Je ne donne pas 1200 à Ali', type: 'reference-review', scope, language: 'fr', originalInput: 'Agede ye ya do' }));
      const result = await response.json();
      assert(response.status === 410 && result.code === 'voice_transcription_only');
      assert(result.refined === undefined && result.review === undefined && calls === 0);
    }
  });
});
Deno.test('French post-editing preserves its direction and reports an unverified heuristic', async () => {
  await mocked(async (_url, init) => {
    const body = JSON.parse(String(init?.body)); assert(body.messages[0].content.includes('Retourne uniquement du français'));
    return json({ model: 'mistral-tested', choices: [{ message: { content: 'La mère est ici.' } }] });
  }, async () => {
    const data = await (await handleRefine(req({ originalInput: 'phrase bariba hors mémoire', text: 'La mère est ici', direction: 'ba-fr', type: 'translation' }))).json();
    assert(data.refined === 'La mère est ici.' && data.meta.accepted && data.confidenceKind === 'heuristic-unverified' && data.meta.requiresHumanValidation && data.confidence <= 65);
  });
});
Deno.test('ByT5 keeps its original draft and reports no applied revision when Mistral is limited', async () => {
  await mocked(async (url, init) => {
    const target = String(url);
    if (target.endsWith('/queue/join')) return json({ event_id: 'fake' });
    if (target.includes('/queue/data')) return new Response('data: ' + JSON.stringify({ msg: 'process_completed', success: true, output: { data: ['La mère est ici.', null] } }) + '\n');
    if (target.endsWith('/refine-bariba')) return await handleRefine(req(JSON.parse(String(init?.body))));
    if (target === MISTRAL_CHAT_URL) return json({}, 429, { 'Retry-After': '60' });
    throw new Error('Unexpected provider call: ' + target);
  }, async () => {
    Deno.env.set('HUGGING_FACE_API_TOKEN', 'test-hf-key');
    Deno.env.set('SUPABASE_URL', 'https://edge.test'); Deno.env.set('SUPABASE_ANON_KEY', 'test-public-key');
    const data = await (await handleByT5(req({ text: 'phrase bariba hors mémoire', sourceLang: 'bariba', targetLang: 'french' }))).json();
    assert(data.translation === 'La mère est ici.' && data.refinement.applied === false && data.refinement.error === 'llm_rate_limited');
    assert(data.modelInfo.weightsRevision === null && data.modelInfo.weightsRevisionVerified === false);
  });
});
