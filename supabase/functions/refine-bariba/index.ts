import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
4. VERBES invariables + particules TAM : ∅(passé), koo(futur), ra(habituel), -mɔ(progressif)
5. NÉGATION : ǹ/kun/ku entre sujet et verbe
6. POSTPOSITIONS : sɔɔ(dans), yɛn sɔ̃(à cause de), ka(vers)
7. ADJECTIFS APRÈS le nom : "Kɛkɛ baka" = camion grand
8. ÊTRE = wɑ̃ɑ, AVOIR = mɔ
9. TONS : 3 niveaux (Haut ´, Moyen ∅, Bas \`)
10. CONNECTEURS : Yen biru(puis), Yɛn sɔ̃(parce que), Ama(mais), Kɑ(et), Goo(si)
`;

const IDIOMS = `
IDIOMES DE RÉFÉRENCE :
"Bonjour" = "Kua dɔ̃ɔ" | "Bonsoir" = "Kua wɛrɛ" | "Comment vas-tu?" = "A kɛra?"
"Je vais bien" = "Na kɛra sãa sãa" | "Merci" = "A nii koo" | "Bienvenue" = "Aagu wunɛ ka weru"
"Au revoir" = "Ka bɛsɛ" | "Bonne nuit" = "Ka kpunu sãa"
"Je suis content" = "Nɛn sũu doma" | "Je suis triste" = "Nɛn sũu sɛ̃rɑ"
"J'ai faim" = "Gɔ̃ɔ man dera" | "J'ai soif" = "Nim nɔnkuru man dera"
"Mon père" = "Nɛn baa" | "Ma mère" = "Nɛn yaa" | "Mon enfant" = "Nɛn bii"
"Viens ici" = "Na mini" | "Assieds-toi" = "A sina" | "Lève-toi" = "A seewo"
"Il pleut" = "Gura nɛ" | "Il va pleuvoir" = "Gura ya koo nɛ"
"L'union fait la force" = "Tɔmbu ba yɛru dɔmbɔ sɔɔ, sɛ̃ɛ kun ba dera"
"Qui cherche trouve" = "Goo u gɑ̃ɑ kasuu, u ga bɛri"
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
"Aller" ↔ "Da" | "Venir" ↔ "Na" | "Manger" ↔ "Di" | "Voir" ↔ "Mɛɛri"
"Dire" ↔ "Nɛɛ" | "Faire" ↔ "Ko" | "Boire" ↔ "Nɔ" | "Dormir" ↔ "Kpuna"
`;

function buildSystemPrompt(type: string, direction?: string): string {
  const taskBlock = type === 'transcription'
    ? `TÂCHE — RAFFINAGE DE TRANSCRIPTION BARIBA :
Tu reçois une transcription brute d'un modèle ASR. Améliore-la :
1. Corrige la segmentation des mots (mots collés ou mal coupés)
2. Normalise les diacritiques : ɔ, ɛ, ɑ, ã, ɛ̃, ĩ, ɔ̃, ũ
3. Normalise les voyelles longues : aa, ee, oo, ɔɔ, ɛɛ
4. Vérifie les tons marqués (accents graves et aigus)
5. Corrige les mots mal reconnus en utilisant le vocabulaire de référence`
    : `TÂCHE — RAFFINAGE DE TRADUCTION (${direction || 'fr-ba'}) :
Tu reçois une traduction brute. Améliore-la :
1. Vérifie l'ordre SOV pour le Bariba
2. Vérifie pronoms (U=humain, Ga/Mu=non-humain) et classes nominales
3. Remplace les calques du français par des formulations idiomatiques
4. Utilise les postpositions correctement (sɔɔ, yɛn sɔ̃)
5. Vérifie les particules TAM (koo, ra, -mɔ)
6. Normalise les diacritiques
${direction === 'ba-fr' ? '7. Assure un français naturel et fluide' : '7. Utilise des formulations naturelles du Bariba'}`;

  return `Tu es un expert linguiste en langue Bariba (Baatonum), langue Niger-Congo parlée au Bénin.

${GRAMMAR_RULES}
${IDIOMS}
${REFERENCE_PAIRS}

${taskBlock}

RÈGLES STRICTES :
- Retourne UNIQUEMENT le texte corrigé, sans explication
- Si le texte est déjà correct, retourne-le tel quel
- Ne traduis PAS, améliore seulement la qualité
- Conserve le sens original
- Préfère les formulations idiomatiques`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, type, direction, originalInput } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ refined: '', changes: [], confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ refined: text.trim(), changes: [], confidence: 0, error: 'API key missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = buildSystemPrompt(type || 'translation', direction);
    const userPrompt = originalInput
      ? `Texte source : "${originalInput}"\nTexte à raffiner : "${text.trim()}"`
      : text.trim();

    console.log(`🔧 refine-bariba: type=${type}, direction=${direction}, text="${text.substring(0, 80)}..."`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ AI gateway error ${response.status}: ${errText.substring(0, 200)}`);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ refined: text.trim(), changes: [], confidence: 0, error: 'Rate limited' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ refined: text.trim(), changes: [], confidence: 0, error: 'Credits exhausted' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ refined: text.trim(), changes: [], confidence: 0, error: 'AI error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const json = await response.json();
    const refined = json?.choices?.[0]?.message?.content?.trim();

    if (!refined || refined.length === 0) {
      console.warn('⚠️ AI returned empty response, keeping original');
      return new Response(
        JSON.stringify({ refined: text.trim(), changes: [], confidence: 50 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect changes
    const changes: string[] = [];
    if (refined !== text.trim()) {
      if (refined.length !== text.trim().length) changes.push('Longueur modifiée');
      if (/[ɔɛɑãɛ̃ĩɔ̃ũ]/.test(refined) && !/[ɔɛɑãɛ̃ĩɔ̃ũ]/.test(text)) changes.push('Diacritiques ajoutés');
      if (refined.toLowerCase() !== text.trim().toLowerCase()) changes.push('Corrections linguistiques');
    }

    const confidence = changes.length > 0 ? 85 : 95;

    console.log(`✅ refine-bariba: ${changes.length} changes, confidence=${confidence}`);
    console.log(`   Original: "${text.substring(0, 60)}"`);
    console.log(`   Refined:  "${refined.substring(0, 60)}"`);

    return new Response(
      JSON.stringify({ refined, changes, confidence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Fatal error in refine-bariba:', error);
    return new Response(
      JSON.stringify({
        refined: '',
        changes: [],
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
