// Voice Corpus Export — admin-only
// Generates a ZIP containing metadata.csv (HF Datasets format) + wavs/<name>.wav + wavs/<name>.txt pairs.
// Returns a signed download URL (1h).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportPayload {
  category?: string | null;
  validated_only?: boolean;
  min_duration?: number;
  max_duration?: number;
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
    const validatedOnly = payload.validated_only === true;
    const minDur = typeof payload.min_duration === "number" ? payload.min_duration : 0;
    const maxDur = typeof payload.max_duration === "number" ? payload.max_duration : Number.POSITIVE_INFINITY;

    // 2. Fetch recordings + phrase data
    let q = admin
      .from("bariba_voice_recordings")
      .select("id, user_id, phrase_id, storage_path, file_name, duration_seconds, mime_type, created_at, validated, rejected, bariba_corpus_phrases ( text_bariba, text_french, category, source )")
      .eq("rejected", false)
      .order("created_at", { ascending: true });

    if (validatedOnly) q = q.eq("validated", true);

    const { data: recordings, error: recErr } = await q;
    if (recErr) throw recErr;

    let filtered = (recordings || []).filter((r: any) => {
      const d = r.duration_seconds ?? 0;
      if (d < minDur || d > maxDur) return false;
      if (payload.category && r.bariba_corpus_phrases?.category !== payload.category) return false;
      return true;
    });

    if (filtered.length === 0) {
      return new Response(JSON.stringify({ error: "No recordings to export", recording_count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Build ZIP — training-ready layout
    const zip = new JSZip();
    const wavsFolder = zip.folder("wavs")!;
    const legacyFolder = zip.folder("legacy")!;

    // CSV header — HuggingFace audiofolder + Common Voice friendly
    const csvLines: string[] = [
      "file_name,transcription,transcription_french,category,duration,user_id,recorded_at,is_wav",
    ];

    let wavCount = 0;
    let legacyCount = 0;

    for (const r of filtered) {
      const p: any = r.bariba_corpus_phrases || {};
      const isWav = (r.mime_type || "").includes("wav") || r.file_name.toLowerCase().endsWith(".wav");

      // Download original from storage
      const { data: fileBlob, error: dlErr } = await admin.storage
        .from("bariba-voice-corpus")
        .download(r.storage_path);
      if (dlErr || !fileBlob) {
        console.error("Could not download", r.storage_path, dlErr);
        continue;
      }
      const buf = new Uint8Array(await fileBlob.arrayBuffer());

      // Build a clean, training-ready filename
      const slugCat = slugify(p.category || "autres", 20);
      const slugTxt = slugify(p.text_bariba || "phrase", 30);
      const shortId = r.id.replace(/-/g, "").slice(0, 8);
      const baseName = `${slugCat}_${slugTxt}_${shortId}`;

      if (isWav) {
        // Pair: <base>.wav + <base>.txt (UTF-8, Bariba-only transcript)
        wavsFolder.file(`${baseName}.wav`, buf);
        wavsFolder.file(`${baseName}.txt`, p.text_bariba || "");
        wavCount++;
        csvLines.push(csvRow([
          `wavs/${baseName}.wav`,
          p.text_bariba,
          p.text_french,
          p.category,
          (r.duration_seconds ?? 0).toFixed(2),
          r.user_id,
          r.created_at,
          "true",
        ]));
      } else {
        // Keep original (webm/mp4) in legacy/ — admin can re-encode offline
        const origExt = guessExt(r.mime_type, r.file_name);
        const legacyName = `${baseName}.${origExt}`;
        legacyFolder.file(legacyName, buf);
        legacyFolder.file(`${baseName}.txt`, p.text_bariba || "");
        legacyCount++;
        csvLines.push(csvRow([
          `legacy/${legacyName}`,
          p.text_bariba,
          p.text_french,
          p.category,
          (r.duration_seconds ?? 0).toFixed(2),
          r.user_id,
          r.created_at,
          "false",
        ]));
      }
    }

    zip.file("metadata.csv", csvLines.join("\n"));
    zip.file("README.txt", buildReadme(wavCount, legacyCount, payload));

    const zipBlob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

    // 4. Upload zip & return signed URL
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const catSlug = payload.category ? slugify(payload.category, 20) + "_" : "";
    const zipName = `exports/corpus_bariba_${catSlug}${ts}.zip`;

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
      wav_count: wavCount,
      legacy_count: legacyCount,
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

function slugify(s: string, max: number): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max) || "x";
}

function guessExt(mime: string | null, fileName: string): string {
  const lower = (fileName || "").toLowerCase();
  if (lower.endsWith(".webm")) return "webm";
  if (lower.endsWith(".mp4") || lower.endsWith(".m4a")) return "m4a";
  if (lower.endsWith(".ogg")) return "ogg";
  if (lower.endsWith(".wav")) return "wav";
  if (mime?.includes("webm")) return "webm";
  if (mime?.includes("mp4")) return "m4a";
  if (mime?.includes("ogg")) return "ogg";
  return "bin";
}

function csvRow(cells: any[]): string {
  return cells.map(cellToCsv).join(",");
}

function cellToCsv(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function buildReadme(wavCount: number, legacyCount: number, payload: ExportPayload): string {
  return `Bariba Voice Corpus Export
Generated: ${new Date().toISOString()}

Recordings:
  - WAV (training-ready): ${wavCount}
  - Legacy (webm/mp4): ${legacyCount}
  - Total: ${wavCount + legacyCount}

Filters applied:
  - Category: ${payload.category || "all"}
  - Validated only: ${payload.validated_only ? "yes" : "no (all non-rejected)"}
  - Duration range: ${payload.min_duration ?? 0}s .. ${payload.max_duration ?? "∞"}s

Layout:
  metadata.csv             one row per recording (HuggingFace audiofolder format)
                           columns: file_name,transcription,transcription_french,
                                    category,duration,user_id,recorded_at,is_wav
  wavs/<base>.wav          WAV PCM 16-bit mono 16 kHz — universal ASR format
  wavs/<base>.txt          UTF-8 transcription (Bariba only) for the matching .wav
  legacy/<base>.<ext>      webm/mp4 originals captured before WAV-pipeline rollout
  legacy/<base>.txt        UTF-8 transcription for the matching legacy file

Quick-load (HuggingFace):
  from datasets import load_dataset
  ds = load_dataset("audiofolder", data_dir="./wavs")

Whisper / Wav2Vec2 ready: WAV files are already 16 kHz mono PCM.
Legacy files require ffmpeg conversion: ffmpeg -i in.webm -ar 16000 -ac 1 out.wav
`;
}
