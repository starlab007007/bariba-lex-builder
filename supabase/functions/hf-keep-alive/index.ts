import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPACES = [
  {
    name: 'byt5',
    url: 'https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space/gradio_api/config',
  },
  {
    name: 'tts',
    url: 'https://zimesongbian-baatonum-tts-api-v001.hf.space/gradio_api/config',
  },
  {
    name: 'stt',
    url: 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space/gradio_api/config',
  },
];

async function pingSpace(space: { name: string; url: string }): Promise<{ name: string; status: string; ms: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(space.url, { signal: controller.signal });
    clearTimeout(timeout);

    const ms = Date.now() - start;
    if (res.ok) {
      return { name: space.name, status: 'awake', ms };
    }
    return { name: space.name, status: `error_${res.status}`, ms };
  } catch (err) {
    const ms = Date.now() - start;
    const message = err instanceof Error ? err.name : 'unknown';
    return { name: space.name, status: message === 'AbortError' ? 'timeout' : 'error', ms };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[hf-keep-alive] Pinging ${SPACES.length} HuggingFace Spaces...`);

  const results = await Promise.all(SPACES.map(pingSpace));

  const summary: Record<string, string> = {};
  for (const r of results) {
    summary[r.name] = r.status;
    console.log(`[hf-keep-alive] ${r.name}: ${r.status} (${r.ms}ms)`);
  }

  return new Response(JSON.stringify({ timestamp: new Date().toISOString(), ...summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
