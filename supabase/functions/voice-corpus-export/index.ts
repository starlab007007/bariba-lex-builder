// Voice Corpus Export — admin-only
// Generates a ZIP containing metadata.csv + audio/ folder, returns a signed download URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportPayload {
  category?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Validate JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing authorization", 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return jsonError("Invalid token", 401);
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return jsonError("Admin only", 403);
    }

    const payload: ExportPayload = await req.json().catch(() => ({}));

    // 2. Fetch recordings + phrase data
    let q = admin
      .from("bariba_voice_recordings")
      .select("id, user_id, phrase_id, storage_path, file_name, duration_seconds, mime_type, created_at, bariba_corpus_phrases ( text_bariba, text_french, category, source )")
      .order("created_at", { ascending: true });

    const { data: recordings, error: recErr } = await q;
    if (recErr) throw recErr;

    let filtered = recordings || [];
    if (payload.category) {
      filtered = filtered.filter((r: any) => r.bariba_corpus_phrases?.category === payload.category);
    }

    if (filtered.length === 0) {
      return new Response(JSON.stringify({ error: "No recordings to export", recording_count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Build ZIP
    const zip = new JSZip();
    const audioFolder = zip.folder("audio")!;

    const csvLines: string[] = ["recording_id,phrase_id,user_id,category,source,text_bariba,text_french,audio_filename,duration_sec,mime_type,created_at"];

    for (const r of filtered) {
      const p: any = r.bariba_corpus_phrases || {};
      // Download file from storage
      const { data: fileBlob, error: dlErr } = await admin.storage
        .from("bariba-voice-corpus")
        .download(r.storage_path);
      if (dlErr || !fileBlob) {
        console.error("Could not download", r.storage_path, dlErr);
        continue;
      }
      const buf = new Uint8Array(await fileBlob.arrayBuffer());
      audioFolder.file(r.file_name, buf);

      const csv = (s: any) => {
        if (s === null || s === undefined) return "";
        const str = String(s).replace(/"/g, '""');
        return `"${str}"`;
      };
      csvLines.push([
        csv(r.id), csv(r.phrase_id), csv(r.user_id),
        csv(p.category), csv(p.source),
        csv(p.text_bariba), csv(p.text_french),
        csv(r.file_name), csv(r.duration_seconds), csv(r.mime_type),
        csv(r.created_at),
      ].join(","));
    }

    zip.file("metadata.csv", csvLines.join("\n"));
    zip.file("README.txt",
      `Bariba Voice Corpus Export
Generated: ${new Date().toISOString()}
Total recordings: ${filtered.length}
${payload.category ? `Filtered by category: ${payload.category}` : "All categories"}

Structure:
  metadata.csv     - one row per recording, mapping text to audio file
  audio/           - audio files (webm/mp4/wav)

Format compatible with HuggingFace datasets, Whisper fine-tuning, and Wav2Vec2 training pipelines.
`);

    const zipBlob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

    // 4. Upload zip & return signed URL
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const zipName = `exports/corpus_bariba_${payload.category ? payload.category.replace(/[^a-z0-9]/gi, "_") + "_" : ""}${ts}.zip`;

    const { error: upErr } = await admin.storage
      .from("bariba-voice-corpus")
      .upload(zipName, zipBlob, { contentType: "application/zip", upsert: true });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await admin.storage
      .from("bariba-voice-corpus")
      .createSignedUrl(zipName, 3600);
    if (signErr) throw signErr;

    return new Response(JSON.stringify({
      download_url: signed.signedUrl,
      recording_count: filtered.length,
      zip_size_bytes: zipBlob.byteLength,
      expires_in_sec: 3600,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[voice-corpus-export]", e);
    return jsonError(e.message || "Internal error", 500);
  }
});

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
