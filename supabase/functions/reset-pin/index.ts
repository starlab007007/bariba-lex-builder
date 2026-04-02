import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone_number, security_answers, new_pin } = await req.json();

    // Validate inputs
    if (!phone_number || typeof phone_number !== "string" || phone_number.length < 10) {
      return new Response(JSON.stringify({ error: "Numéro de téléphone invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(security_answers) || security_answers.length !== 4) {
      return new Response(JSON.stringify({ error: "4 réponses visuelles requises" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!new_pin || typeof new_pin !== "string" || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
      return new Response(JSON.stringify({ error: "PIN invalide (6 chiffres requis)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find profile by phone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("tamtam_profiles")
      .select("user_id, display_name, phone_number")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Aucun compte trouvé avec ce numéro" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check security_answers record
    const { data: secRecord, error: secError } = await supabaseAdmin
      .from("security_answers")
      .select("*")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (secError || !secRecord) {
      return new Response(JSON.stringify({ error: "Aucun code secret configuré. Contactez un administrateur." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if locked
    if (secRecord.locked_until && new Date(secRecord.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(secRecord.locked_until).getTime() - Date.now()) / 60000);
      return new Response(JSON.stringify({ 
        error: `Trop de tentatives. Réessayez dans ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
        locked: true 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the provided answers (same logic as set-security)
    const sorted = [
      ...[security_answers[0], security_answers[1]].sort(),
      security_answers[2],
      security_answers[3],
    ].map((a: string) => (a || "").trim().toLowerCase());

    const hashInput = sorted.join("|");
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const providedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Compare hashes
    if (providedHash !== secRecord.answers_hash) {
      const newAttempts = (secRecord.failed_attempts || 0) + 1;
      const updateData: Record<string, unknown> = { failed_attempts: newAttempts };
      
      // Lock after 3 failed attempts for 15 minutes
      if (newAttempts >= 3) {
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        updateData.failed_attempts = 0;
      }

      await supabaseAdmin
        .from("security_answers")
        .update(updateData)
        .eq("user_id", profile.user_id);

      const remaining = 3 - newAttempts;
      return new Response(JSON.stringify({ 
        error: remaining > 0 
          ? `Code secret incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`
          : "Trop de tentatives. Compte verrouillé pendant 15 minutes.",
        remaining 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success - reset failed attempts
    await supabaseAdmin
      .from("security_answers")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("user_id", profile.user_id);

    // Update the user's password (PIN)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
      { password: new_pin }
    );

    if (updateError) {
      console.error("Error updating PIN:", updateError);
      return new Response(JSON.stringify({ error: "Impossible de réinitialiser le PIN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("reset-pin error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
