import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
"Je mange du riz" ↔ "Na koko di" | "Il a tué une biche" ↔ "Taaso u nɛmu go"
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

function normalizeBaribaText(input: string): string {
  return input.normalize("NFC").replace(/\s+/g, " ").trim();
}

function applyHardCorrections(input: string): string {
  let out = normalizeBaribaText(input);

  // Retire guillemets parasites renvoyés parfois par le modèle
  out = out.replace(/^["'“”]+|["'“”]+$/g, "");

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
  // Si le modèle sort une paire explicative erronée dans sa réponse (rare), on recadre.
  out = out.replace(/Voir\s*\/?\s*Trouver\s*\/?\s*Obtenir\s*["'“”]?\s*=\s*["'“”]?\s*Mɛɛri/giu, "Voir / Trouver / Obtenir = Wa");

  // Correction proverbes mal formés
  out = out.replace(/Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/giu, "Durɔ goo u kasuu, u ga bɛri");

  return out;
}

function buildSystemPrompt(type: string, direction?: string): string {
  let taskBlock: string;
  let strictRules: string;

  if (type === "translate") {
    // Mode traduction directe — utilise UNIQUEMENT la base de connaissances
    const dirLabel = direction === "ba-fr" ? "Bariba → Français" : "Français → Bariba";
    taskBlock = `TÂCHE — TRADUCTION DIRECTE (${dirLabel}) :
Tu dois traduire ce texte en utilisant EXCLUSIVEMENT :
1. Les règles grammaticales SOV ci-dessus
2. Les expressions idiomatiques de référence
3. Les paires de traduction de référence
4. Le vocabulaire et la structure de la langue Bariba

Si un mot n'a pas d'équivalent connu, translittère-le et marque-le entre crochets [mot].
Retourne UNIQUEMENT la traduction, sans explication ni commentaire.`;
    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT la traduction, rien d'autre
- Utilise l'ordre SOV pour le Bariba
- Utilise les pronoms corrects (U=humain, Ga/Mu=non-humain)
- Préfère les formulations idiomatiques connues
- Applique les corrections lexicales validées (wa ≠ mɛɛri ; bii mɛro ≠ yaa)
- Translittère entre crochets les mots sans équivalent`;
  } else if (type === "transcription") {
    taskBlock = `TÂCHE — RAFFINAGE DE TRANSCRIPTION BARIBA :
Tu reçois une transcription brute d'un modèle ASR. Améliore-la :
1. Corrige la segmentation des mots (mots collés ou mal coupés)
2. Normalise les diacritiques : ɔ, ɛ, ɑ, ã, ɛ̃, ĩ, ɔ̃, ũ
3. Normalise les voyelles longues : aa, ee, oo, ɔɔ, ɛɛ
4. Vérifie les tons marqués (accents graves et aigus)
5. Corrige les mots mal reconnus en utilisant le vocabulaire de référence
6. Préserve les formes idiomatiques validées (salutations, politesse, expressions courantes)`;
    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé, sans explication
- Si le texte est déjà correct, retourne-le tel quel
- Ne traduis PAS, améliore seulement la qualité
- Conserve le sens original
- Préfère les formulations idiomatiques
- N'introduis pas de mots non confirmés`;
  } else {
    // type === 'translation' — raffinage d'une traduction existante
    taskBlock = `TÂCHE — RAFFINAGE DE TRADUCTION (${direction || "fr-ba"}) :
Tu reçois une traduction brute. Améliore-la :
1. Vérifie l'ordre SOV pour le Bariba
2. Vérifie pronoms (U=humain, Ga/Mu=non-humain) et classes nominales
3. Remplace les calques du français par des formulations idiomatiques
4. Utilise les postpositions correctement (sɔɔ, yèn sɔ̃)
5. Vérifie les particules TAM (ràa, koo, ra, -mɔ)
6. Corrige les faux amis (wa vs mɛɛri, bii mɛro vs yaa)
7. Normalise les diacritiques
${direction === "ba-fr" ? "8. Assure un français naturel et fluide" : "8. Utilise des formulations naturelles du Bariba"}`;
    strictRules = `RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé, sans explication
- Si le texte est déjà correct, retourne-le tel quel
- Ne traduis PAS, améliore seulement la qualité
- Conserve le sens original
- Préfère les formulations idiomatiques
- Respecte les corrections lexicales validées par le dictionnaire`;
  }

  return `Tu es un expert linguiste en langue Bariba (Baatonum), langue Niger-Congo parlée au Bénin.

${GRAMMAR_RULES}
${IDIOMS}
${REFERENCE_PAIRS}
${COMMON_MISTAKES}

${taskBlock}

${strictRules}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, type, direction, originalInput } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ refined: "", changes: [], confidence: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({
          refined: normalizeBaribaText(text),
          changes: [],
          confidence: 0,
          error: "API key missing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanedText = normalizeBaribaText(text);
    const cleanedOriginalInput = typeof originalInput === "string" ? normalizeBaribaText(originalInput) : undefined;

    const systemPrompt = buildSystemPrompt(type || "translation", direction);
    const userPrompt = cleanedOriginalInput
      ? `Texte source : "${cleanedOriginalInput}"\nTexte à raffiner : "${cleanedText}"`
      : cleanedText;

    console.log(
      `🔧 refine-bariba: type=${type}, direction=${direction}, text="${cleanedText.substring(0, 80)}..."`,
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
        max_tokens: 1024,
        temperature: type === "translate" ? 0.1 : 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ AI gateway error ${response.status}: ${errText.substring(0, 200)}`);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ refined: cleanedText, changes: [], confidence: 0, error: "Rate limited" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ refined: cleanedText, changes: [], confidence: 0, error: "Credits exhausted" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ refined: cleanedText, changes: [], confidence: 0, error: "AI error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await response.json();
    const rawRefined = json?.choices?.[0]?.message?.content?.trim();
    const refined = rawRefined ? applyHardCorrections(rawRefined) : rawRefined;

    if (!refined || refined.length === 0) {
      console.warn("⚠️ AI returned empty response, keeping original");
      return new Response(
        JSON.stringify({ refined: cleanedText, changes: [], confidence: 50 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Detect changes
    const changes: string[] = [];
    if (refined !== cleanedText) {
      if (refined.length !== cleanedText.length) changes.push("Longueur modifiée");
      if (/[ɔɛɑãɛ̃ĩɔ̃ũ]/u.test(refined) && !/[ɔɛɑãɛ̃ĩɔ̃ũ]/u.test(cleanedText)) changes.push("Diacritiques ajoutés");
      if (refined.toLowerCase() !== cleanedText.toLowerCase()) changes.push("Corrections linguistiques");

      // Indicateurs de corrections ciblées
      if (
        /\bA kpuna n do\?\b/u.test(refined) ||
        /\bBɛɛ ka yoka\b/u.test(refined) ||
        /\bAnna wunɛn wasi\?\b/u.test(refined) ||
        /\bAlaafia\b/u.test(refined)
      ) {
        changes.push("Formule idiomatique corrigée");
      }
      if (/\bWa\b/i.test(refined) && /\bvoir|trouver|obtenir\b/i.test(cleanedOriginalInput || "")) {
        changes.push("Verbe clé corrigé (wa)");
      }
    }

    const confidence = changes.length > 0 ? 85 : 95;

    console.log(`✅ refine-bariba: ${changes.length} changes, confidence=${confidence}`);
    console.log(`   Original: "${cleanedText.substring(0, 60)}"`);
    console.log(`   Refined:  "${refined.substring(0, 60)}"`);

    return new Response(
      JSON.stringify({ refined, changes, confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Fatal error in refine-bariba:", error);
    return new Response(
      JSON.stringify({
        refined: "",
        changes: [],
        confidence: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
