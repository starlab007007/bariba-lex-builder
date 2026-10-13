// Serves audio produced by FITILA's private Hugging Face voice Spaces to browsers and phones.
// The Space is private, so its file URLs answer 404 without the project's token: this
// function fetches the file with the token and streams it. Only files from the FITILA
// voice Spaces are allowed.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
};

const ALLOWED = [
  "https://zimesongbian-baatonum-tts-api-v001.hf.space/",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const target = new URL(req.url).searchParams.get("u") || "";
  const allowed = ALLOWED.some((p) => target.startsWith(p)) && /\/(gradio_api\/)?file=/.test(target);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "URL non autorisée" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = Deno.env.get("HUGGING_FACE_API_TOKEN") || "";
  const upstream = await fetch(target, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(20000),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: `audio indisponible (${upstream.status})` }), {
      status: upstream.status === 404 ? 404 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") || "audio/wav",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
