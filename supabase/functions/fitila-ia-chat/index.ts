// Politique FITILA (25/10/2026) : aucun fournisseur IA payant (Gemini, Mistral).
// Le raisonnement de Fitila IA / DUNYA se fait sur le téléphone (Gemma, mode « Malin ») ;
// la traduction FR <-> Baatɔnum reste fournie par nos propres moteurs (byt5-bariba-translate).
// Cette fonction ne contacte donc plus aucun modèle externe : elle l'indique clairement.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function handleChat(req: Request): Response {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      error: "local_brain_required",
      message: "Fitila IA utilise le cerveau local gratuit de l'application (DUNYA › Réglages › Cerveau). Aucun fournisseur payant n'est utilisé.",
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

if (Deno.env.get("FITILA_AI_TEST") !== "1") Deno.serve(handleChat);
