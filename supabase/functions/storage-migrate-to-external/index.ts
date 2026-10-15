// Migration conservatrice Lovable Cloud -> projet externe canonique.
// Admin uniquement. Jamais d'écrasement : copie seulement les objets absents
// à la destination, puis vérifie taille + SHA-256 par re-téléchargement.
// Body: { mode: "audit"|"copy", bucket: string, offset?: number, limit?: number }
//    ou { mode: "rows", table: string, offset?, limit? }  (insère uniquement les id absents)
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ALLOWED_TABLES = new Set([
  "bariba_voice_recordings", "bariba_corpus_phrases", "classe_content_audios",
  "battle_challenges", "battle_responses", "battle_response_votes", "corpus_contributions",
  "handunia_lieux", "handunia_fragments", "handunia_fragment_likes",
]);

async function sha256(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function listAll(c: SupabaseClient, bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await c.storage.from(bucket).list(prefix, { limit: 1000, offset: page * 1000, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const it of data) {
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) out.push(...(await listAll(c, bucket, p)));
      else out.push(p);
    }
    if (data.length < 1000) break;
    page++;
  }
  return out;
}

async function fetchBytes(c: SupabaseClient, bucket: string, path: string) {
  const { data, error } = await c.storage.from(bucket).download(path);
  if (error || !data) {
    const msg = error?.message ?? "absent";
    const missing = /not.?found|NoSuchKey|400|404|Object not found/i.test(msg + JSON.stringify(error ?? {}));
    return { ok: false as const, missing, error: msg };
  }
  const buf = await data.arrayBuffer();
  return { ok: true as const, buf, type: data.type, size: buf.byteLength, sha: await sha256(buf) };
}

// Sonde directe avec code HTTP : 200 = présent, 400/404 + not_found = absent, sinon inconnu.
async function probeDst(url: string, key: string, bucket: string, path: string) {
  const enc = path.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(`${url}/storage/v1/object/authenticated/${bucket}/${enc}`, { headers: { Authorization: `Bearer ${key}`, apikey: key } });
  if (r.ok) {
    const buf = await r.arrayBuffer();
    return { ok: true as const, size: buf.byteLength, sha: await sha256(buf) };
  }
  const t = await r.text();
  const missing = (r.status === 404 || r.status === 400) && /not.?found|NoSuchKey/i.test(t);
  return { ok: false as const, missing, error: `HTTP ${r.status} ${t.slice(0, 160)}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const src = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const DST_URL = Deno.env.get("TARGET_SUPABASE_URL"), DST_KEY = Deno.env.get("TARGET_SUPABASE_SERVICE_ROLE_KEY");
    if (!DST_URL || !DST_KEY) return json({ status: "blocked", error: "Accès destination non configuré" }, 500);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await src.auth.getUser(token);
    if (!u?.user) return json({ error: "Non authentifié" }, 401);
    const { data: isAdmin } = await src.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin uniquement" }, 403);

    const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode ?? "audit");
    const offset = Math.max(Number(body.offset) || 0, 0);
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);

    // ---- Lignes : insertion des id absents uniquement, jamais d'écrasement ----
    if (mode === "rows") {
      const table = String(body.table ?? "");
      if (!ALLOWED_TABLES.has(table)) return json({ error: "Table non autorisée" }, 400);
      const { data: rows, error } = await src.from(table).select("*").order("id").range(offset, offset + limit - 1);
      if (error) return json({ error: error.message }, 500);
      const ids = (rows ?? []).map((r: any) => r.id);
      const { data: existing, error: eErr } = await dst.from(table).select("*").in("id", ids);
      if (eErr) return json({ status: "blocked", error: eErr.message }, 500);
      const exMap = new Map((existing ?? []).map((r: any) => [r.id, r]));
      const report = { identical: 0, divergent: [] as string[], inserted: 0, failures: [] as any[] };
      for (const r of rows ?? []) {
        const d = exMap.get((r as any).id);
        if (d) {
          const keys = Object.keys(r).filter((k) => k in d && k !== "updated_at");
          const same = keys.every((k) => JSON.stringify((r as any)[k]) === JSON.stringify((d as any)[k]));
          same ? report.identical++ : report.divergent.push((r as any).id);
          continue;
        }
        const { error: iErr } = await dst.from(table).insert(r);
        iErr ? report.failures.push({ id: (r as any).id, error: iErr.message }) : report.inserted++;
      }
      const n = rows?.length ?? 0;
      return json({ mode, table, offset, processed: n, next_offset: n < limit ? null : offset + limit, ...report });
    }

    // ---- Stockage ----
    const bucket = String(body.bucket ?? "");
    const { data: srcBucket } = await src.storage.getBucket(bucket);
    if (!srcBucket) return json({ error: "Bucket source introuvable" }, 400);
    const { data: dstBucket } = await dst.storage.getBucket(bucket);
    if (!dstBucket) {
      if (srcBucket.public || mode !== "copy")
        return json({ bucket, status: "blocked", reason: srcBucket.public ? "Bucket public absent à destination : création manuelle requise" : "Bucket absent à destination" });
      const { error: cErr } = await dst.storage.createBucket(bucket, { public: false });
      if (cErr) return json({ bucket, status: "blocked", reason: cErr.message });
    }

    const all = await listAll(src, bucket);
    const slice = all.slice(offset, offset + limit);
    const manifest: any[] = [];
    for (const path of slice) {
      const s = await fetchBytes(src, bucket, path);
      if (!s.ok) { manifest.push({ path, state: "source_bytes_missing", error: s.error }); continue; }
      if (s.size === 0) { manifest.push({ path, state: "source_empty_skipped", size: 0 }); continue; }
      const d = await probeDst(DST_URL, DST_KEY, bucket, path);
      if (d.ok) {
        manifest.push({ path, size: s.size, sha256: s.sha, state: d.sha === s.sha ? "already_identical" : "divergent_not_touched", dst_size: d.size });
        continue;
      }
      if (!d.missing) { manifest.push({ path, size: s.size, sha256: s.sha, state: "dst_unknown_not_touched", error: d.error }); continue; }
      if (mode !== "copy") { manifest.push({ path, size: s.size, sha256: s.sha, state: "would_copy" }); continue; }
      const { error: upErr } = await dst.storage.from(bucket).upload(path, new Blob([s.buf], { type: s.type || "application/octet-stream" }), { upsert: false, contentType: s.type || undefined });
      if (upErr) { manifest.push({ path, size: s.size, sha256: s.sha, state: "copy_failed", error: upErr.message }); continue; }
      const v = await probeDst(DST_URL, DST_KEY, bucket, path);
      manifest.push({ path, size: s.size, sha256: s.sha, state: v.ok && v.sha === s.sha && v.size === s.size ? "copied_verified" : "copied_unverified", error: v.ok ? undefined : v.error });
    }
    const summary: Record<string, number> = {};
    for (const m of manifest) summary[m.state] = (summary[m.state] ?? 0) + 1;
    return json({ mode, bucket, total_source_objects: all.length, offset, processed: slice.length, next_offset: offset + limit >= all.length ? null : offset + limit, summary, manifest });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
