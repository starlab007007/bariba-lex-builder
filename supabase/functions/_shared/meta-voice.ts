// FITILA Meta voice service (facebook/mms-tts-bba, Omnilingual ASR) hosted on fitila.bj.
// Server-to-server only: the token never leaves Supabase.

export async function metaVoiceInfer(
  payload: Record<string, string>,
  timeoutMs: number,
): Promise<Record<string, unknown> | null> {
  const url = (Deno.env.get("FITILA_VOICE_SERVICE_URL") ?? "").replace(/\/+$/, "");
  const token = Deno.env.get("FITILA_MODEL_API_TOKEN") ?? "";
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) {
      await r.body?.cancel();
      return null;
    }
    return await r.json();
  } catch {
    return null;
  }
}

/** HMAC so that only texts approved by bariba-tts can be synthesized through tts-audio. */
export async function signText(text: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`mms-tts-bba:${text}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
