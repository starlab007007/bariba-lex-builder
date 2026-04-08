/**
 * generate-video-posters — Edge Function
 * 
 * Handles two actions:
 * 1. LIST: Returns videos that have no real poster (image_url points to .mp4)
 * 2. SAVE: Receives a poster image (base64 JPEG), uploads to storage,
 *    and updates image_url in anime_scene_library
 * 
 * The actual frame extraction happens CLIENT-SIDE using <video> + <canvas>
 * (browsers have native video decoders; Edge Functions don't).
 * 
 * Admin-only: validates auth token + admin role.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Auth check (admin only) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return jsonResponse({ error: "Admin only" }, 403);
    }

    // --- Parse body ---
    const body = await req.json();

    // ============================================================
    // ACTION: LIST — return videos whose image_url is a video file
    // ============================================================
    if (body.action === "list") {
      const limit = Math.min(body.limit || 20, 100);

      const { data, error, count } = await supabaseAdmin
        .from("anime_scene_library")
        .select("id, video_url, scene_type, emotion, image_url", {
          count: "exact",
        })
        .eq("asset_type", "video")
        .or("image_url.like.%.mp4,image_url.like.%.webm,image_url.like.%.mov")
        .limit(limit);

      if (error) throw error;

      return jsonResponse({
        videos: data,
        fetched: data?.length || 0,
        remaining: (count || 0) - (data?.length || 0),
      });
    }

    // ============================================================
    // ACTION: SAVE — receive poster base64, upload, update DB
    // ============================================================
    if (body.action === "save") {
      const { video_id, poster_base64 } = body;
      if (!video_id || !poster_base64) {
        return jsonResponse(
          { error: "video_id and poster_base64 required" },
          400
        );
      }

      // Decode base64 → Uint8Array
      const binaryString = atob(poster_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to anime-library/posters/<id>.jpg
      const posterPath = `posters/${video_id}.jpg`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("anime-library")
        .upload(posterPath, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage
        .from("anime-library")
        .getPublicUrl(posterPath);

      // Update image_url in DB → now points to a real JPEG
      const { error: updateError } = await supabaseAdmin
        .from("anime_scene_library")
        .update({ image_url: publicUrl })
        .eq("id", video_id);

      if (updateError) throw updateError;

      return jsonResponse({ success: true, poster_url: publicUrl });
    }

    return jsonResponse({ error: 'Invalid action. Use "list" or "save".' }, 400);
  } catch (error: unknown) {
    console.error("generate-video-posters error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
