// Politique FITILA (25/10/2026) : aucun fournisseur IA payant (Gemini, Mistral/Voxtral).
// La transcription passe par NOTRE service vocal (Meta Omnilingual ASR, voice-gateway sur le VPS FITILA).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const base = (Deno.env.get("FITILA_VOICE_SERVICE_URL") ?? "").replace(/\/+$/, "");
  const token = Deno.env.get("FITILA_MODEL_API_TOKEN") ?? "";
  if (!base || !token) return json(503, { error: "not_configured", message: "Service vocal FITILA non configuré." });
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file") ?? form.get("audio");
    if (f instanceof File) file = f;
  } catch { /* corps invalide */ }
  if (!file || file.size === 0 || file.size > 11 * 1024 * 1024) return json(400, { error: "invalid_audio", message: "Audio absent ou trop volumineux (11 Mo max)." });
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  try {
    const r = await fetch(`${base}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ engine: "meta-asr-300m", audio_base64: btoa(bin) }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) { await r.body?.cancel(); return json(503, { error: "asr_unavailable", message: "Reconnaissance vocale FITILA indisponible." }); }
    const data = await r.json();
    const text = typeof data?.transcript === "string" ? data.transcript.trim() : "";
    return json(200, { text, language: "fr", words: [], provider: "fitila-omnilingual", model: "omniASR_CTC_300M" });
  } catch {
    return json(503, { error: "asr_unavailable", message: "Reconnaissance vocale FITILA indisponible." });
  }
});
