import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_PROFILE_USERNAME = "fitila_ia";

// Thèmes de contenu patrimoine bariba
const CONTENT_THEMES = [
  "conte traditionnel bariba avec morale",
  "proverbe bariba expliqué avec contexte culturel",
  "histoire du patrimoine baatonou",
  "description d'une cérémonie traditionnelle bariba",
  "légende bariba sur la nature et les animaux",
  "sagesse des anciens bariba",
  "récit d'un griot sur l'histoire du Borgou",
  "tradition culinaire bariba",
];

interface SuperIARequest {
  prompt?: string;
  theme?: string;
}

/**
 * Génère du contenu via Lovable AI (Gemini)
 */
async function generateContent(prompt: string): Promise<{ text_fr: string; title: string; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { text_fr: "", title: "", error: "LOVABLE_API_KEY manquant" };

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es Fitila IA, un créateur de contenu culturel bariba (baatonou). 
Tu génères des récits authentiques, éducatifs et captivants sur la culture bariba du Bénin.
IMPORTANT: Réponds en français UNIQUEMENT avec ce format JSON strict:
{"title": "Titre court (max 60 caractères)", "content": "Le récit complet en 3-5 paragraphes (200-400 mots)"}
Le contenu doit être culturellement authentique, éducatif et engageant.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 800,
        tools: [
          {
            type: "function",
            function: {
              name: "create_cultural_content",
              description: "Crée un contenu culturel bariba structuré",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Titre court du récit (max 60 caractères)" },
                  content: { type: "string", description: "Le récit complet en français (200-400 mots)" },
                },
                required: ["title", "content"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_cultural_content" } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      if (resp.status === 429) return { text_fr: "", title: "", error: "Rate limit dépassé, réessaie dans quelques secondes" };
      if (resp.status === 402) return { text_fr: "", title: "", error: "Crédits IA insuffisants" };
      return { text_fr: "", title: "", error: `AI gateway ${resp.status}: ${errText.substring(0, 100)}` };
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return { text_fr: args.content || "", title: args.title || "Récit Bariba" };
    }

    // Fallback: try to parse content directly
    const rawContent = data?.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(rawContent);
      return { text_fr: parsed.content || rawContent, title: parsed.title || "Récit Bariba" };
    } catch {
      return { text_fr: rawContent, title: "Récit Bariba" };
    }
  } catch (e) {
    return { text_fr: "", title: "", error: e instanceof Error ? e.message : "Erreur génération" };
  }
}

/**
 * Traduit le texte FR -> Bariba via ByT5
 */
async function translateToBariba(text: string): Promise<{ text_ba: string; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey) return { text_ba: "", error: "Config manquante pour ByT5" };

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/byt5-bariba-translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        text: text.substring(0, 500), // Limiter pour la traduction
        sourceLang: "french",
        targetLang: "bariba",
        mode: "quality",
        skipRefine: false,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      return { text_ba: "", error: `ByT5 ${resp.status}: ${err.substring(0, 100)}` };
    }

    const data = await resp.json();
    return { text_ba: data?.translation || data?.translated_text || "" };
  } catch (e) {
    return { text_ba: "", error: e instanceof Error ? e.message : "Erreur traduction" };
  }
}

/**
 * Synthèse vocale via Bariba TTS
 */
async function synthesizeSpeech(text: string): Promise<{ audio_url: string; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey) return { audio_url: "", error: "Config manquante pour TTS" };

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/bariba-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ text, skipRefine: true }),
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      return { audio_url: "", error: `TTS ${resp.status}: ${err.substring(0, 100)}` };
    }

    const data = await resp.json();
    return { audio_url: data?.audio_url || "" };
  } catch (e) {
    return { audio_url: "", error: e instanceof Error ? e.message : "Erreur TTS" };
  }
}

/**
 * Trouve ou crée le profil IA
 */
async function getOrCreateAIProfile(db: any): Promise<string | null> {
  // Chercher le profil existant (par flag is_ai_profile, peu importe le username exact)
  const { data: existing } = await db
    .from("tamtam_profiles")
    .select("user_id")
    .eq("is_ai_profile", true)
    .limit(1)
    .maybeSingle();

  if (existing?.user_id) return existing.user_id;

  // Fallback: chercher par username
  const { data: byName } = await db
    .from("tamtam_profiles")
    .select("user_id")
    .ilike("username", `${AI_PROFILE_USERNAME}%`)
    .limit(1)
    .maybeSingle();

  if (byName?.user_id) {
    await db.from("tamtam_profiles")
      .update({ is_ai_profile: true, is_verified: true })
      .eq("user_id", byName.user_id);
    return byName.user_id;
  }

  // Créer un user auth fictif via admin API
  const { data: newUser, error: userError } = await db.auth.admin.createUser({
    email: "fitila-ia-bot@fitila.app",
    password: crypto.randomUUID(), // mot de passe aléatoire (jamais utilisé)
    email_confirm: true,
    user_metadata: { display_name: "Fitila IA 🤖", is_bot: true },
  });

  if (userError || !newUser?.user?.id) {
    console.error("[super-ia] Failed to create auth user:", userError);
    // Si l'utilisateur existe déjà, le récupérer via listUsers
    try {
      const { data: list } = await db.auth.admin.listUsers();
      const found = list?.users?.find((u: any) => u.email === "fitila-ia-bot@fitila.app");
      if (found?.id) {
        await db.from("tamtam_profiles")
          .update({ is_ai_profile: true, is_verified: true, display_name: "Fitila IA 🤖" })
          .eq("user_id", found.id);
        return found.id;
      }
    } catch (e) {
      console.error("[super-ia] listUsers fallback failed:", e);
    }
    return null;
  }

  // Mettre à jour le profil auto-créé par le trigger
  const { error: updateError } = await db
    .from("tamtam_profiles")
    .update({
      is_ai_profile: true,
      is_verified: true,
      display_name: "Fitila IA 🤖",
    })
    .eq("user_id", newUser.user.id);

  if (updateError) {
    console.error("[super-ia] Failed to update profile:", updateError);
  }

  return newUser.user.id;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    // Vérifier l'auth admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Vérifier que l'appelant est admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Vérifier le rôle admin
    const adminDb = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminDb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body: SuperIARequest = await req.json().catch(() => ({}));
    const theme = body.theme || CONTENT_THEMES[Math.floor(Math.random() * CONTENT_THEMES.length)];
    const prompt = body.prompt || `Génère un récit culturel bariba sur le thème: "${theme}". Le récit doit être authentique, éducatif et captivant.`;

    console.log(`[super-ia] Admin ${userId} generating content: "${prompt.substring(0, 100)}"`);

    // Step 1: Générer le contenu FR via Gemini
    const content = await generateContent(prompt);
    if (!content.text_fr) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: content.error || "Échec génération contenu", 
        step: "generate" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[super-ia] Content generated: "${content.title}" (${content.text_fr.length} chars)`);

    // Step 2: Traduire en bariba (best effort)
    const translation = await translateToBariba(content.text_fr);
    if (translation.error) {
      console.warn(`[super-ia] Translation warning: ${translation.error}`);
    }

    // Step 3: TTS bariba (best effort)  
    const ttsInput = translation.text_ba || content.text_fr.substring(0, 200);
    const tts = await synthesizeSpeech(ttsInput);
    if (tts.error) {
      console.warn(`[super-ia] TTS warning: ${tts.error}`);
    }

    // Step 4: Trouver/créer le profil IA
    const aiUserId = await getOrCreateAIProfile(adminDb);
    if (!aiUserId) {
      return new Response(JSON.stringify({ error: "Impossible de créer le profil IA", step: "profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: Publier le post
    const { data: post, error: postError } = await adminDb.from("tamtam_posts").insert({
      user_id: aiUserId,
      transcript_fr: content.text_fr,
      transcript_ba: translation.text_ba || null,
      audio_url: tts.audio_url || null,
      ai_generated: true,
      is_public: true,
      topic: content.title,
      feeling_emoji: "🤖",
      hashtags: ["#FitilaIA", "#PatrimoineBaatonou", "#CultureBariba"],
    }).select().single();

    if (postError) {
      console.error("[super-ia] Post insert error:", postError);
      return new Response(JSON.stringify({ error: "Échec publication", details: postError.message, step: "publish" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const duration = Date.now() - startedAt;
    console.log(`[super-ia] Post published: ${post.id} in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        post_id: post.id,
        title: content.title,
        text_fr: content.text_fr,
        text_ba: translation.text_ba || null,
        audio_url: tts.audio_url || null,
        has_translation: !!translation.text_ba,
        has_audio: !!tts.audio_url,
        duration_ms: duration,
        warnings: [
          ...(translation.error ? [`Traduction: ${translation.error}`] : []),
          ...(tts.error ? [`TTS: ${tts.error}`] : []),
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[super-ia] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne", duration_ms: Date.now() - startedAt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
