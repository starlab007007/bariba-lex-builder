// Copie les audios Classe (fichiers + lignes) vers le projet cible.
// Accès réservé aux administrateurs. Traitement par lots : { offset, limit }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const SRC_URL = Deno.env.get("SUPABASE_URL")!;
    const SRC_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const DST_URL = Deno.env.get("TARGET_SUPABASE_URL");
    const DST_KEY = Deno.env.get("TARGET_SUPABASE_SERVICE_ROLE_KEY");
    if (!DST_URL || !DST_KEY) return json({ error: "Projet cible non configuré" }, 500);

    const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await src.auth.getUser(token);
    if (!u?.user) return json({ error: "Non authentifié" }, 401);
    const { data: isAdmin } = await src.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin uniquement" }, 403);

    const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const offset = Math.max(Number(body.offset) || 0, 0);
    const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 50);

    await dst.storage.createBucket("classe-audio", { public: false }).catch(() => {});

    const { data: rows, error } = await src
      .from("classe_content_audios").select("*")
      .order("created_at", { ascending: true }).range(offset, offset + limit - 1);
    if (error) return json({ error: error.message }, 500);

    const report = { copied_files: 0, copied_rows: 0, failures: [] as { id: string; step: string; error: string }[] };
    for (const row of rows ?? []) {
      const { data: blob, error: dErr } = await src.storage.from("classe-audio").download(row.storage_path);
      if (dErr || !blob) { report.failures.push({ id: row.id, step: "download", error: dErr?.message ?? "vide" }); continue; }
      const { error: uErr } = await dst.storage.from("classe-audio")
        .upload(row.storage_path, blob, { contentType: "audio/wav", upsert: true });
      if (uErr) { report.failures.push({ id: row.id, step: "upload", error: uErr.message }); continue; }
      report.copied_files++;
      const { error: iErr } = await dst.from("classe_content_audios").upsert(row, { onConflict: "id" });
      if (iErr) { report.failures.push({ id: row.id, step: "row", error: iErr.message }); continue; }
      report.copied_rows++;
    }
    const done = (rows?.length ?? 0) < limit;
    return json({ offset, processed: rows?.length ?? 0, next_offset: done ? null : offset + limit, ...report });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
