// Politique FITILA (25/10/2026) : aucun fournisseur IA payant (Gemini, Mistral).
// fitila-tem-ia-chat ne contacte plus aucun modèle externe ; l'application utilise ses moteurs propres
// (ByT5, ASR/TTS du serveur FITILA, mémoire, cerveau local Gemma) et bascule d'elle-même.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  return new Response(
    JSON.stringify({ error: "local_only", message: "Aucun fournisseur IA payant : moteurs propres FITILA uniquement." }),
    { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
