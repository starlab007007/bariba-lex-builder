import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPACES = [
  {
    name: 'byt5',
    url: 'https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space',
  },
  {
    name: 'tts',
    url: 'https://zimesongbian-baatonum-tts-api-v001.hf.space',
  },
  {
    name: 'stt',
    url: 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space',
  },
];

const PING_PATHS = ['/gradio_api/config', '/'];

async function pingSpace(
  space: { name: string; url: string },
  hfToken: string | null,
): Promise<{ name: string; status: string; ms: number; path?: string }> {
  const start = Date.now();
  const headers: Record<string, string> = {};
  if (hfToken) {
    headers['Authorization'] = `Bearer ${hfToken}`;
  }

  for (const path of PING_PATHS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${space.url}${path}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const ms = Date.now() - start;
      if (res.ok) {
        return { name: space.name, status: 'awake', ms, path };
      }
      // If 404 on /gradio_api/config, try fallback /
      if (res.status === 404 && path === '/gradio_api/config') {
        continue;
      }
      return { name: space.name, status: `error_${res.status}`, ms, path };
    } catch (err) {
      // If first path fails, try fallback
      if (path === '/gradio_api/config') continue;
      const ms = Date.now() - start;
      const message = err instanceof Error ? err.name : 'unknown';
      return { name: space.name, status: message === 'AbortError' ? 'timeout' : 'error', ms };
    }
  }

  return { name: space.name, status: 'unreachable', ms: Date.now() - start };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const hfToken = Deno.env.get('HUGGING_FACE_API_TOKEN') || null;

  console.log(`[hf-keep-alive] Pinging ${SPACES.length} HuggingFace Spaces (auth: ${!!hfToken})...`);

  const results = await Promise.all(SPACES.map((s) => pingSpace(s, hfToken)));

  const summary: Record<string, any> = {};
  let allAwake = true;
  for (const r of results) {
    summary[r.name] = { status: r.status, ms: r.ms, path: r.path };
    if (r.status !== 'awake') allAwake = false;
    console.log(`[hf-keep-alive] ${r.name}: ${r.status} (${r.ms}ms) via ${r.path || '?'}`);
  }

  return new Response(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      allAwake,
      spaces: summary,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
