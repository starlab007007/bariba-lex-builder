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
    const { phone_number, display_name, new_pin } = await req.json();

    // Validate inputs
    if (!phone_number || typeof phone_number !== "string" || phone_number.length < 10) {
      return new Response(JSON.stringify({ error: "Numéro de téléphone invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!display_name || typeof display_name !== "string" || display_name.trim().length < 1) {
      return new Response(JSON.stringify({ error: "Nom requis" }), {
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

    // Find profile matching phone + display_name (case-insensitive)
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

    // Verify display_name matches (case-insensitive, trimmed)
    const storedName = (profile.display_name || "").trim().toLowerCase();
    const providedName = display_name.trim().toLowerCase();

    if (storedName !== providedName) {
      return new Response(JSON.stringify({ error: "Le nom ne correspond pas à celui du compte" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
