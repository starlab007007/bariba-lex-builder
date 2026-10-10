import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function objectUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/classe-audio/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function probe(path: string) {
  try {
    const res = await fetch(objectUrl(path), {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: "bytes=0-0",
        "cache-control": "no-cache",
      },
    });
    if (res.ok || res.status === 206) {
      try { await res.body?.cancel(); } catch {}
      return { ok: true, error: null };
    }
    let error = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      error = body?.code || body?.message || error;
    } catch {}
    return { ok: false, error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 100);
  const offset = Math.max(Number(body.offset) || 0, 0);
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await db
    .from("classe_content_audios")
    .select("id,content_key,storage_path")
    .eq("status", "approved")
    .eq("is_current", true)
    .order("content_key", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let available = 0;
  let missing = 0;
  for (let i = 0; i < (rows ?? []).length; i += 10) {
    const checked = await Promise.all(
      (rows ?? []).slice(i, i + 10).map(async (row) => ({ row, result: await probe(row.storage_path) })),
    );
    for (const { row, result } of checked) {
      await db.from("classe_content_audios").update({
        storage_available: result.ok,
        storage_checked_at: new Date().toISOString(),
        storage_error: result.ok ? null : result.error,
      }).eq("id", row.id);
      result.ok ? available++ : missing++;
    }
  }

  return Response.json({ offset, checked: (rows ?? []).length, available, missing });
});
