// Secured gateway to the FITILA CPU voice service (experiments/bariba_voice_compare on the VPS).
// - Requires a signed-in FITILA user (JWT checked against this project's auth).
// - Forwards only two engines: meta-mms-tts-bba (text->wav) and meta-asr-300m (wav->text).
// - The VPS token stays server-side (secret FITILA_MODEL_API_TOKEN); audio is not stored.
// Secrets needed on the canonical project: FITILA_VOICE_SERVICE_URL, FITILA_MODEL_API_TOKEN.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const ENGINES = new Set(["meta-mms-tts-bba", "meta-asr-300m"]);
const MAX_TEXT = 400;
const MAX_AUDIO_B64 = 11_000_000; // ~8 MB WAV

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!token) return json(401, { error: "auth_required" });
  const { data: u, error: authErr } = await createClient(url, anon).auth.getUser(token);
  if (authErr || !u?.user) return json(401, { error: "auth_required" });

  const serviceUrl = (Deno.env.get("FITILA_VOICE_SERVICE_URL") ?? "").replace(/\/+$/, "");
  const serviceToken = Deno.env.get("FITILA_MODEL_API_TOKEN") ?? "";
  if (!serviceUrl || !serviceToken) return json(503, { error: "not_configured", code: "not_configured" });

  let body: { engine?: unknown; text?: unknown; audio_base64?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const engine = String(body.engine ?? "");
  if (!ENGINES.has(engine)) return json(400, { error: "invalid_engine" });
  const payload: Record<string, string> = { engine };
  if (engine === "meta-mms-tts-bba") {
    const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
    if (!text || text.length > MAX_TEXT) return json(400, { error: "invalid_text" });
    payload.text = text;
  } else {
    const a = typeof body.audio_base64 === "string" ? body.audio_base64 : "";
    if (!a) return json(400, { error: "audio_required" });
    if (a.length > MAX_AUDIO_B64) return json(413, { error: "audio_too_large" });
    payload.audio_base64 = a;
  }

  try {
    const r = await fetch(`${serviceUrl}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceToken}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(engine === "meta-asr-300m" ? 90_000 : 60_000),
    });
    if (!r.ok) {
      console.error("[meta-voice-gateway] upstream", engine, r.status);
      return json(r.status === 413 ? 413 : 502, { error: "upstream_failed", status: r.status });
    }
    const data = await r.json();
    return json(200, engine === "meta-asr-300m"
      ? { engine, transcript: String(data.transcript ?? "") }
      : { engine, audio_mime: "audio/wav", audio_base64: String(data.audio_base64 ?? "") });
  } catch (e) {
    console.error("[meta-voice-gateway] unreachable", engine, e instanceof Error ? e.name : "error");
    return json(503, { error: "service_unreachable" });
  }
});
