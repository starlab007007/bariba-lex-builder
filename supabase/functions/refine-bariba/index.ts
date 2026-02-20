import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_TIMEOUT_MS = 12_000;

type RefineType = "translate" | "translation" | "transcription";
type RefineDirection = "fr-ba" | "ba-fr";

interface RefineRequest {
  text?: string;
  type?: RefineType;
  direction?: RefineDirection;
  originalInput?: string;
}

// ═══════════════════════════════════════════════════════════════════
// PROMPT SYSTÈME LINGUISTIQUE BARIBA — injecté dans chaque appel
// ═══════════════════════════════════════════════════════════════════

const GRAMMAR_RULES = `
RÈGLES GRAMMATICALES BARIBA (BAATONUM) :

1. ORDRE SOV (Sujet-Objet-Verbe) : "Na koko di" = Je riz mange
2. PRONOMS sujet : Na(je), A(tu), U(il humain), Ga/Mu(il chose), Sa(nous), I(vous), Ba(ils)
   Possessif : Nɛn(mon), Wunɛn(ton), Win(son), Sun(notre), Bɛɛn(votre), Ben(leur)
   CRITIQUE : U = humain, Ga/Mu = non-humain
3. CLASSES NOMINALES : -bu/-mbu(humain pl.→Ba), a-/y-(animé→Ga), m-(inanimé→Mu), -nu/-su(collectif)
4. VERBES invariables + particules TAM : ∅(passé), ràa(passé révolu), koo(futur), ra(habituel), -mɔ(progressif)
5. NÉGATION : ǹ/kun/ku entre sujet et verbe
6. POSTPOSITIONS : sɔɔ(dans), yèn sɔ̃(à cause de), ka(vers)
7. ADJECTIFS APRÈS le nom : "Kɛkɛ baka" = camion grand
8. ÊTRE = wãa (être quelque part), wã (être bon) | AVOIR = mɔ
9. TONS : 3 niveaux (Haut ´, Moyen ∅, Bas \`)
10. CONNECTEURS : Yen biru(puis), yèn sɔ̃(parce que), Ama(mais), Kɑ(et), yɛ/yè(si/quand), Goo(un certain...)
11. QUESTIONS : anna(comment), mba(quoi), domma(quand), amɔna(pourquoi)
12. VERBES CLÉS : wa = voir/trouver/obtenir ; mɛɛri = regarder/étudier/apprendre
`;

const IDIOMS = `
IDIOMES / FORMULES VALIDÉES (priorité haute) :
"Bonjour (matin)" = "A kpuna n do?"
"Bonsoir" = "Bɛɛ ka yoka"
"Comment vas-tu?" = "Anna wunɛn wasi?"
"Je vais bien / Merci" = "Alaafia"

"Merci" = "siara" | "a kua" | "ami"
"Merci (je te remercie)" = "Na nun siara"
"Merci pour votre secours" = "Bɛɛ ka faaba"

"Père" = "baa" | "Mon père" = "Nɛn baa"
"Mère" = "bii mɛro"
"Enfant" = "bii"

"J'ai soif" = "nim nɔru"
"Viens ici" = "Na mini"
"Assieds-toi" = "A sina"
"Lève-toi" = "A seewo"

"Il pleut" = "Gura nɛ"
"Il va pleuvoir" = "Gura ya koo nɛ"

"Qui cherche trouve" = "Durɔ goo u kasuu, u ga bɛri"
`;

const REFERENCE_PAIRS = `
PAIRES DE TRADUCTION DE RÉFÉRENCE :
"Je mange du riz" ↔ "Na mɔri di" | "Il a tué une biche" ↔ "Taaso u nɛmu go"
"Je cherche du travail" ↔ "Na sɔmburu kasuu" | "Où es-tu?" ↔ "Mɑnɑ ɑ wɑ̃ɑ?"
"Quand es-tu venu?" ↔ "Domma a na?" | "As-tu vu ces gens?" ↔ "A tɔn be wa?"
"Je n'ai pas le courage" ↔ "Na ǹ kãkɔ" | "J'ai besoin d'argent" ↔ "Na gobin bukaata mɔ"
"Il travaille bien" ↔ "U sɔmburu mɔ sãa sãa" | "Il y a du monde" ↔ "Tɔmbu ba dabi"
"Eau" ↔ "Nim" | "Feu" ↔ "Dɔ̃ɔ" | "Terre" ↔ "Tem" | "Village" ↔ "Wuu"
"Maison" ↔ "Yɛnu" | "Homme" ↔ "Durɔ" | "Femme" ↔ "Kurɔ" | "Enfant" ↔ "Bii"
"Aller" ↔ "Da" | "Venir" ↔ "Na" | "Manger" ↔ "Di" | "Voir / Trouver / Obtenir" ↔ "Wa"
"Regarder / Étudier / Apprendre" ↔ "Mɛɛri"
"Dire" ↔ "Nɛɛ" | "Faire" ↔ "Ko" | "Boire" ↔ "Nɔ" | "Dormir" ↔ "Kpuna"
"Lundi" ↔ "Litinin" | "Mardi" ↔ "Talata" | "Mercredi" ↔ "Alaaruba / Adaaruba"
"Je te remercie" ↔ "Na nun siara" | "Merci" ↔ "siara / a kua / ami"
`;

const COMMON_MISTAKES = `
ATTENTION AUX ERREURS COURANTES (INTERDITES) :
- Ne pas traduire "voir" par "mɛɛri" par défaut → utiliser "wa" (voir/trouver/obtenir)
- "mɛɛri" = regarder / étudier / apprendre
- "yaa" = viande / animal (PAS "mère")
- "mère" = "bii mɛro"
- "kɛra" n'est pas "aller bien" (kɛra = râcler)
- "Comment vas-tu ?" = "Anna wunɛn wasi?" (pas "A kɛra?")
- "Je vais bien / Merci" = "Alaafia" (pas "Na kɛra sãa sãa")
- "J'ai soif" = "nim nɔru" (pas "nim nɔnkuru")
- "Bonjour (matin)" = "A kpuna n do?" (pas "Kua dɔ̃ɔ")
- "Bonsoir" = "Bɛɛ ka yoka" (pas "Kua wɛrɛ")
- Proverbe "Qui cherche trouve" : "Durɔ goo u kasuu, u ga bɛri"
`;

const INVALID_OUTPUT_PATTERNS = [
  "share via link",
  "loading",
  "submit",
  "clear",
  "undefined",
  "null",
  "<html",
  "<!doctype",
];

function normalizeBaribaText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function stripWrappingQuotes(input: string): string {
  return input.replace(/^["'“”`]+|["'“”`]+$/g, "");
}

function cleanModelText(input: string): string {
  let out = normalizeBaribaText(input);

  // Enlève fences markdown éventuels
  out = out.replace(/^```[\w-]*\s*/i, "").replace(/\s*```$/i, "");
  out = stripWrappingQuotes(out);

  // Certains modèles renvoient "Traduction: ..."
  out = out.replace(/^traduction\s*:\s*/i, "");
  out = out.replace(/^texte corrigé\s*:\s*/i, "");
  out = out.replace(/^réponse\s*:\s*/i, "");

  return normalizeBaribaText(out);
}

function isInvalidUiLikeText(input: string): boolean {
  const s = normalizeBaribaText(input).toLowerCase();
  return INVALID_OUTPUT_PATTERNS.some((p) => s.includes(p));
}

function applyHardCorrections(input: string): string {
  let out = cleanModelText(input);

  // Corrections de salutations / formules
  out = out.replace(/\bKua dɔ̃ɔ\b/giu, "A kpuna n do?");
  out = out.replace(/\bKua wɛrɛ\b/giu, "Bɛɛ ka yoka");
  out = out.replace(/\bA kɛra\s*\?/giu, "Anna wunɛn wasi?");
  out = out.replace(/\bNa kɛra sãa sãa\b/giu, "Alaafia");
  out = out.replace(/\bA nii koo\b/giu, "siara");

  // Correction "soif"
  out = out.replace(/\bNim nɔnkuru\b/giu, "nim nɔru");
  out = out.replace(/\bnim nɔnkuru\b/giu, "nim nɔru");

  // Correction "mère"
  out = out.replace(/\bNɛn yaa\b/giu, "bii mɛro");

  // Correction faux-ami "voir"
  out = out.replace(
    /Voir\s*\/?\s*Trouver\s*\/?\s*Obtenir\s*["'“”]?\s*=\s*["'“”]?\s*Mɛɛri/giu,
    "Voir / Trouver / Obtenir = Wa",
  );

  // Correction proverbe mal formé
  out = out.replace(/Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/giu, "Durɔ goo u kasuu, u ga bɛri");

  return normalizeBaribaText(out);
}

function buildSystemPrompt(type: RefineType, direction?: RefineDirection): string {
  let taskBlock: string;
  let strictRules: string;

  if (type === "translate") {
    const dirLabel = direction === "ba-fr" ? "Bariba → Français" : "Français → Bariba";
    taskBlock = `TÂCHE — TRADUCTION DIRECTE (${dirLabel}) :
Tu dois traduire ce texte en utilisant EXCLUSIVEMENT :
1. Les règles grammaticales ci-dessus
2. Les expressions idiomatiques validées
3. Les paires de traduction de référence

Si un mot n'a pas d'équivalent connu, translittère-le et marque-le entre crochets [mot].
Retourne UNIQUEMENT la traduction, sans explication ni commentaire.`;

    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT la traduction
- Aucune explication, aucun commentaire, aucun JSON
- Utilise l'ordre SOV pour le Bariba
- Utilise wa pour voir/trouver/obtenir ; mɛɛri pour regarder/étudier/apprendre
- Utilise bii mɛro pour "mère"
- Utilise nim nɔru pour "j'ai soif"`;
  } else if (type === "transcription") {
    taskBlock = `TÂCHE — RAFFINAGE DE TRANSCRIPTION BARIBA :
Tu reçois une transcription brute d'un modèle ASR. Améliore-la :
1. Corrige la segmentation des mots
2. Normalise les diacritiques (ɔ, ɛ, ɑ, ã, ɛ̃, ĩ, ɔ̃, ũ)
3. Corrige les mots mal reconnus avec le vocabulaire de référence
4. Préserve les expressions idiomatiques validées`;

    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé
- Ne traduis PAS
- Ne change pas le sens
- Conserve la phrase la plus naturelle possible en Bariba`;
  } else {
    taskBlock = `TÂCHE — RAFFINAGE DE TRADUCTION (${direction || "fr-ba"}) :
Tu reçois une traduction brute. Améliore-la :
1. Corrige la grammaire
2. Corrige les faux amis (wa vs mɛɛri, bii mɛro vs yaa)
3. Corrige les salutations/formules de politesse
4. Normalise les diacritiques
${direction === "ba-fr" ? "5. Rends le français naturel et fluide" : "5. Rends le Bariba naturel et idiomatique"}`;

    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé
- Ne traduis PAS de nouveau, raffine seulement
- Aucune explication
- Respecte les formes idiomatiques validées`;
  }

  return `Tu es un expert linguiste en langue Bariba (Baatonum), langue Niger-Congo parlée au Bénin.

${GRAMMAR_RULES}
${IDIOMS}
${REFERENCE_PAIRS}
${COMMON_MISTAKES}

${taskBlock}

${strictRules}`;
}

function detectChanges(params: {
  original: string;
  refined: string;
  originalInput?: string;
}): string[] {
  const { original, refined, originalInput } = params;
  const changes: string[] = [];

  if (refined === original) return changes;

  if (refined.length !== original.length) changes.push("Longueur modifiée");
  if (refined.toLowerCase() !== original.toLowerCase()) changes.push("Corrections linguistiques");

  const hadDiac = /[ɔɛɑãɛ̃ĩɔ̃ũ]/u.test(original);
  const hasDiac = /[ɔɛɑãɛ̃ĩɔ̃ũ]/u.test(refined);
  if (hasDiac && !hadDiac) changes.push("Diacritiques ajoutés");

  if (
    /\bA kpuna n do\?\b/u.test(refined) ||
    /\bBɛɛ ka yoka\b/u.test(refined) ||
    /\bAnna wunɛn wasi\?\b/u.test(refined) ||
    /\bAlaafia\b/u.test(refined)
  ) {
    changes.push("Formule idiomatique corrigée");
  }

  if (/\bbii mɛro\b/iu.test(refined) && !/\bbii mɛro\b/iu.test(original)) {
    changes.push('Lexique corrigé ("mère")');
  }

  if (/\bnim nɔru\b/iu.test(refined) && !/\bnim nɔru\b/iu.test(original)) {
    changes.push('Lexique corrigé ("soif")');
  }

  if (/\bwa\b/iu.test(refined) && /voir|trouver|obtenir/i.test(originalInput || "")) {
    changes.push("Verbe clé corrigé (wa)");
  }

  return [...new Set(changes)];
}

function computeConfidence(params: {
  original: string;
  refined: string;
  changes: string[];
  aiUsed: boolean;
  hadError?: boolean;
}): number {
  const { original, refined, changes, aiUsed, hadError } = params;

  if (hadError) return 45;
  if (!refined) return 30;

  let score = 78;

  if (aiUsed) score += 6;
  if (changes.length === 0) score += 10;
  if (/[ɔɛɑãɛ̃ĩɔ̃ũ]/u.test(refined)) score += 3;
  if (/\b(A kpuna n do\?|Bɛɛ ka yoka|Anna wunɛn wasi\?|Alaafia|bii mɛro|nim nɔru)\b/iu.test(refined)) {
    score += 3;
  }
  if (refined === original) score += 2;

  return Math.max(35, Math.min(97, score));
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
      const changes = detectChanges({ original: cleanedText, refined: fallbackRefined, originalInput });

      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          refined: fallbackRefined,
          changes,
          confidence: computeConfidence({
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

    const systemPrompt = buildSystemPrompt(type, direction);
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
      const changes = detectChanges({ original: cleanedText, refined: fallbackRefined, originalInput });

      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          refined: fallbackRefined,
          changes,
          confidence: computeConfidence({
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

    const changes = detectChanges({
      original: cleanedText,
      refined,
      originalInput,
    });

    const confidence = computeConfidence({
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
