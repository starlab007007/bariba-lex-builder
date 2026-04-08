import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Accès refusé - Admin requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, userId, userData } = await req.json();

    switch (action) {
      case "list": {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({
          perPage: 1000,
        });
        if (error) throw error;

        // Get roles and profiles
        const { data: roles } = await adminClient.from("user_roles").select("user_id, role");
        const { data: profiles } = await adminClient
          .from("tamtam_profiles")
          .select("user_id, display_name, username, avatar_url, phone_number");

        const enrichedUsers = users.map((u) => {
          const userRoles = roles?.filter((r) => r.user_id === u.id) || [];
          const profile = profiles?.find((p) => p.user_id === u.id);
          return {
            id: u.id,
            email: u.email,
            phone: u.phone || profile?.phone_number,
            display_name: profile?.display_name || u.user_metadata?.display_name,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            banned: (u as any).banned_until ? true : false,
            banned_until: (u as any).banned_until,
            roles: userRoles.map((r) => r.role),
          };
        });

        return new Response(JSON.stringify({ users: enrichedUsers }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        if (!userId) throw new Error("userId requis");
        
        // Update profile
        if (userData?.display_name || userData?.username) {
          const updateData: Record<string, string> = {};
          if (userData.display_name) updateData.display_name = userData.display_name;
          if (userData.username) updateData.username = userData.username;
          
          await adminClient
            .from("tamtam_profiles")
            .update(updateData)
            .eq("user_id", userId);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "ban": {
        if (!userId) throw new Error("userId requis");
        // Ban for 100 years = effectively permanent
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
        });
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "unban": {
        if (!userId) throw new Error("userId requis");
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        if (!userId) throw new Error("userId requis");
        // Don't allow deleting self
        if (userId === caller.id) {
          throw new Error("Impossible de supprimer votre propre compte");
        }
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resetPin": {
        if (!userId || !userData?.newPin) throw new Error("userId et newPin requis");
        if (userData.newPin.length !== 6 || !/^\d{6}$/.test(userData.newPin)) {
          throw new Error("Le PIN doit être exactement 6 chiffres");
        }
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          password: userData.newPin,
        });
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Action inconnue: ${action}`);
    }
  } catch (error: any) {
    console.error("Admin users error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur serveur" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
