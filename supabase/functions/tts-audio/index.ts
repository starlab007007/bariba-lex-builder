// Serves Baatɔnum speech to browsers and phones as a plain https audio URL.
//  1. ?t=<text>&s=<signature> : synthesized by the FITILA Meta voice service (facebook/mms-tts-bba).
//     Only texts signed by bariba-tts are accepted, so the endpoint cannot be used freely.
//  2. ?u=<hf file url>        : legacy files of the private Hugging Face voice Space, fetched with the token.
import { base64ToBytes, metaVoiceInfer, signText } from "../_shared/meta-voice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
};
const ALLOWED = ["https://zimesongbian-baatonum-tts-api-v001.hf.space/"];
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const params = new URL(req.url).searchParams;

  const text = params.get("t");
  if (text !== null) {
    if (!text.trim() || text.length > 400) return json(400, { error: "texte invalide" });
    if (params.get("s") !== await signText(text)) return json(403, { error: "signature invalide" });
    const meta = await metaVoiceInfer({ engine: "meta-mms-tts-bba", text }, 30_000);
    const b64 = typeof meta?.audio_base64 === "string" ? meta.audio_base64 : "";
    if (b64.length < 100) return json(503, { error: "voix indisponible" });
    return new Response(base64ToBytes(b64), {
      headers: { ...corsHeaders, "Content-Type": "audio/wav", "Cache-Control": "public, max-age=86400" },
    });
  }

  const target = params.get("u") || "";
  const allowed = ALLOWED.some((p) => target.startsWith(p)) && /\/(gradio_api\/)?file=/.test(target);
  if (!allowed) return json(400, { error: "URL non autorisée" });
  const token = Deno.env.get("HUGGING_FACE_API_TOKEN") || "";
  const upstream = await fetch(target, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(20000) });
  if (!upstream.ok || !upstream.body) return json(upstream.status === 404 ? 404 : 502, { error: `audio indisponible (${upstream.status})` });
  return new Response(upstream.body, {
    headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") || "audio/wav", "Cache-Control": "public, max-age=3600" },
  });
});
