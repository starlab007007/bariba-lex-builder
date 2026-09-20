import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  normalizeBaribaText,
  isInvalidUiLikeText,
  applyHardCorrections,
  detectRefinementChanges,
  computeRefinementConfidence,
  buildRefineSystemPrompt,
} from "../_shared/bariba-linguistic-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_TIMEOUT_MS = 12_000;

type RefineType = "translate" | "translation" | "transcription";
type RefineDirection = "fr-ba" | "ba-fr";
type RefineStyle = "correct" | "simplify" | "natural" | "formal";

interface RefineRequest {
  text?: string;
  type?: RefineType;
  direction?: RefineDirection;
  originalInput?: string;
  style?: RefineStyle;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), GLOBAL_TIMEOUT_MS);

  try {
    const body: RefineRequest = await req.json().catch(() => ({}));

    const text = typeof body.text === "string" ? body.text : "";
    const type: RefineType =
      body.type === "translate" || body.type === "transcription" || body.type === "translation"
        ? body.type
        : "translation";
    const direction: RefineDirection | undefined =
      body.direction === "fr-ba" || body.direction === "ba-fr" ? body.direction : undefined;
    const style: RefineStyle =
      body.style === "simplify" || body.style === "natural" || body.style === "formal" || body.style === "correct"
        ? body.style
        : "correct";

    const originalInput =
      typeof body.originalInput === "string" ? normalizeBaribaText(body.originalInput) : undefined;

    if (!normalizeBaribaText(text)) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          refined: "",
          changes: [],
          confidence: 0,
          meta: { duration: Date.now() - startedAt, fallback: true },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const cleanedText = normalizeBaribaText(text);

    // Fallback immédiat si texte ressemble à du bruit UI
    if (isInvalidUiLikeText(cleanedText)) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          refined: cleanedText,
          changes: [],
          confidence: 35,
          error: "Invalid input text",
          meta: { duration: Date.now() - startedAt, fallback: true, aiUsed: false },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Si pas de clé IA, on applique seulement les hard corrections
    if (!LOVABLE_API_KEY) {
      const fallbackRefined = applyHardCorrections(cleanedText);
      const changes = detectRefinementChanges({
        original: cleanedText,
        refined: fallbackRefined,
        originalInput,
      });

      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          refined: fallbackRefined,
          changes,
          confidence: computeRefinementConfidence({
            original: cleanedText,
            refined: fallbackRefined,
            changes,
            aiUsed: false,
          }),
          error: "LOVABLE_API_KEY missing",
          meta: { duration: Date.now() - startedAt, fallback: true, aiUsed: false },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseSystemPrompt = buildRefineSystemPrompt(type, direction);
    const styleInstruction: Record<RefineStyle, string> = {
      correct: "Corrige les erreurs linguistiques et rends le texte exact, sans changer le sens.",
      simplify: "Simplifie la formulation pour la rendre plus courte et plus facile à comprendre, sans supprimer d’information essentielle.",
      natural: "Rends la formulation plus naturelle, idiomatique et fluide pour un locuteur natif, sans changer le sens.",
      formal: "Rends la formulation plus formelle, claire et respectueuse, sans changer le sens.",
    };
    const systemPrompt = baseSystemPrompt + "\n\nSTYLE DE POST-ÉDITION DEMANDÉ :\n" + styleInstruction[style] + "\nRetourne uniquement le texte final.";
    const userPrompt = originalInput
      ? `Texte source : "${originalInput}"\nTexte à traiter : "${cleanedText}"`
      : cleanedText;

    console.log(
      `🔧 refine-bariba: type=${type}, direction=${direction || "-"}, text="${cleanedText.substring(0, 80)}..."`,
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 700,
        temperature: type === "translate" ? 0.1 : 0.15,
      }),
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`❌ AI gateway error ${response.status}: ${errText.substring(0, 200)}`);

      const fallbackRefined = applyHardCorrections(cleanedText);
      const changes = detectRefinementChanges({
        original: cleanedText,
        refined: fallbackRefined,
        originalInput,
      });

      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          refined: fallbackRefined,
          changes,
          confidence: computeRefinementConfidence({
            original: cleanedText,
            refined: fallbackRefined,
            changes,
            aiUsed: false,
            hadError: true,
          }),
          error:
            response.status === 429
              ? "Rate limited"
              : response.status === 402
              ? "Credits exhausted"
              : "AI error",
          meta: {
            duration: Date.now() - startedAt,
            fallback: true,
            aiUsed: false,
            status: response.status,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await response.json().catch(() => ({}));
    const rawRefined = String(json?.choices?.[0]?.message?.content || "");

    let refined = applyHardCorrections(rawRefined);

    // Si l'IA renvoie vide / bruit, fallback sur texte original + hard corrections
    if (!refined || isInvalidUiLikeText(refined)) {
      console.warn("⚠️ AI returned empty or invalid response, using hard-correction fallback");
      refined = applyHardCorrections(cleanedText);
    }

    const changes = detectRefinementChanges({
      original: cleanedText,
      refined,
      originalInput,
    });

    const confidence = computeRefinementConfidence({
      original: cleanedText,
      refined,
      changes,
      aiUsed: true,
    });

    clearTimeout(timeoutId);

    console.log(`✅ refine-bariba: ${changes.length} change(s), confidence=${confidence}`);
    console.log(`   Original: "${cleanedText.substring(0, 60)}"`);
    console.log(`   Refined:  "${refined.substring(0, 60)}"`);

    return new Response(
      JSON.stringify({
        refined,
        changes,
        confidence,
        meta: {
          duration: Date.now() - startedAt,
          fallback: false,
          aiUsed: true,
          type,
          direction: direction || null,
          style,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = /aborted|timeout/i.test(message);

    console.error("Fatal error in refine-bariba:", error);

    return new Response(
      JSON.stringify({
        refined: "",
        changes: [],
        confidence: 0,
        error: isTimeout ? "Request timeout" : message,
        meta: {
          duration: Date.now() - startedAt,
          fallback: true,
          aiUsed: false,
        },
      }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
