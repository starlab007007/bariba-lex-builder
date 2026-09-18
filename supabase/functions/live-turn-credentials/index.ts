import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await client.auth.getClaims(token);
  const userId = data?.claims?.sub?.toString() ?? "";
  if (error || !userId) {
    return json({ error: "unauthorized" }, 401);
  }

  const urls = (Deno.env.get("TURN_URLS") ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.startsWith("turn:") || url.startsWith("turns:"));
  const sharedSecret = Deno.env.get("TURN_SHARED_SECRET") ?? "";
  if (urls.length === 0 || !sharedSecret) {
    // Réponse volontairement non bloquante : l'application conservera STUN.
    return json({ configured: false, iceServers: [] });
  }

  const requestedTtl = Number.parseInt(
    Deno.env.get("TURN_TTL_SECONDS") ?? "3600",
    10,
  );
  const ttlSeconds = Number.isFinite(requestedTtl)
    ? Math.min(86400, Math.max(300, requestedTtl))
    : 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiresAt}:${userId}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sharedSecret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const rawSignature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(username)),
  );
  let binarySignature = "";
  for (const byte of rawSignature) {
    binarySignature += String.fromCharCode(byte);
  }
  const credential = btoa(binarySignature);

  return json({
    configured: true,
    expiresAt,
    iceServers: [
      {
        urls: urls.length === 1 ? urls[0] : urls,
        username,
        credential,
      },
    ],
  });
});
