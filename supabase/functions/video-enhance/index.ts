/**
 * video-enhance edge function
 * Manages post-upload video enhancement jobs.
 *
 * POST /video-enhance
 * Body: { videoUrl: string }
 * Returns: { jobId, status }
 *
 * GET /video-enhance?jobId=xxx
 * Returns: job status and renditions
 *
 * NOTE: Actual FFmpeg processing requires an external service (e.g., AWS MediaConvert,
 * Mux, or a dedicated server with FFmpeg). This function creates/manages job records
 * and would trigger the external pipeline via webhook in production.
 *
 * PIPELINE (for external service integration):
 * 1. Multi-rendition HLS transcode: 360p/540p/720p/1080p
 * 2. Perceptual pass on 1080p: face-aware exposure + mild denoise + mild sharpen
 * 3. Audio loudness normalization (EBU R128, -14 LUFS)
 *
 * FFmpeg commands for reference:
 * - Transcode: ffmpeg -i input.mp4 -vf "scale=1920:1080" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k output_1080p.mp4
 * - Denoise+Sharpen: ffmpeg -i input.mp4 -vf "hqdn3d=3:3:6:6,unsharp=3:3:0.5:3:3:0" output_enhanced.mp4
 * - Audio normalize: ffmpeg -i input.mp4 -af loudnorm=I=-14:TP=-1:LRA=11 output_normalized.mp4
 * - HLS: ffmpeg -i input.mp4 -codec: copy -start_number 0 -hls_time 6 -hls_list_size 0 -f hls output.m3u8
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      // GET: Check job status
      const url = new URL(req.url);
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        return new Response(JSON.stringify({ error: "jobId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: job, error } = await supabase
        .from("video_processing_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single();

      if (error || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(job), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // POST: Create new enhancement job
      const { videoUrl } = await req.json();

      if (!videoUrl) {
        return new Response(JSON.stringify({ error: "videoUrl required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create job record
      const { data: job, error } = await supabase
        .from("video_processing_jobs")
        .insert({
          user_id: user.id,
          video_url: videoUrl,
          status: "pending",
          renditions: {
            "360p": null,
            "540p": null,
            "720p": null,
            "1080p": null,
            "hls_playlist": null,
          },
        })
        .select()
        .single();

      if (error) {
        console.error("Job creation error:", error);
        return new Response(JSON.stringify({ error: "Failed to create job" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // In production, trigger external processing service here:
      // await fetch('https://your-ffmpeg-service.com/process', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     jobId: job.id,
      //     videoUrl,
      //     callbackUrl: `${supabaseUrl}/functions/v1/video-enhance-callback`,
      //     pipeline: [
      //       { type: 'transcode', renditions: ['360p', '540p', '720p', '1080p'] },
      //       { type: 'perceptual_pass', target: '1080p', denoise: 3, sharpen: 0.5 },
      //       { type: 'audio_normalize', target_lufs: -14 },
      //       { type: 'hls_package' },
      //     ],
      //   }),
      // });

      return new Response(
        JSON.stringify({
          jobId: job.id,
          status: job.status,
          message: "Enhancement job created. Processing will begin shortly.",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("video-enhance error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
