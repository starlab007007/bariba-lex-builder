import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"];
const AI_TIMEOUT_MS = 22_000;

type Json = Record<string, unknown>;

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function clamp01(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJson(text: string): Json | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

async function callAi(messages: Array<{ role: string; content: string }>, maxTokens = 900): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  for (const model of MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          ...(model.startsWith("openai/")
            ? { max_completion_tokens: maxTokens }
            : { temperature: 0.1, max_tokens: maxTokens }),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) continue;
      const data = await response.json();
      const text = normalize(data?.choices?.[0]?.message?.content);
      if (text) return text;
    } catch {
      // Try next model.
    }
  }
  throw new Error("Lumière IA indisponible");
}

function periodBucket(year: number | null): string {
  if (year == null) return "Période non précisée";
  if (year < 1960) return "Avant 1960";
  if (year <= 1979) return "1960–1979";
  if (year <= 1999) return "1980–1999";
  if (year <= 2019) return "2000–2019";
  return "Depuis 2020";
}

function computeGaps(rows: Json[]): Array<Json> {
  const periods = ["Avant 1960", "1960–1979", "1980–1999", "2000–2019", "Depuis 2020"];
  const periodCounts = new Map(periods.map((label) => [label, 0]));
  const genderCounts = new Map<string, number>();
  const lineageCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();

  for (const row of rows) {
    const yearRaw = row.period_year;
    const year = typeof yearRaw === "number" ? yearRaw : Number(yearRaw);
    const bucket = periodBucket(Number.isFinite(year) ? year : null);
    if (periodCounts.has(bucket)) periodCounts.set(bucket, (periodCounts.get(bucket) ?? 0) + 1);

    const gender = normalize(row.witness_gender);
    if (gender && gender !== "unspecified") genderCounts.set(gender, (genderCounts.get(gender) ?? 0) + 1);

    const lineage = normalize(row.lineage_key);
    if (lineage) lineageCounts.set(lineage, (lineageCounts.get(lineage) ?? 0) + 1);

    const theme = normalize(row.theme_key);
    if (theme) themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
  }

  const gaps: Array<Json> = [];
  for (const [label, count] of periodCounts) {
    if (count === 0) gaps.push({ type: "period", value: label, source_count: 0, severity: 1 });
  }
  if (genderCounts.size === 0) gaps.push({ type: "gender", value: "Voix non documentées", source_count: 0, severity: 0.72 });
  if (lineageCounts.size === 0) gaps.push({ type: "lineage", value: "Lignée non documentée", source_count: 0, severity: 0.66 });
  if (themeCounts.size === 0) gaps.push({ type: "theme", value: "Thème non documenté", source_count: 0, severity: 0.58 });

  if (gaps.length === 0 && rows.length > 0) {
    const least = [...periodCounts.entries()].sort((a, b) => a[1] - b[1])[0];
    gaps.push({
      type: "period",
      value: least[0],
      source_count: least[1],
      severity: Math.max(0.25, 1 - least[1] / Math.max(1, rows.length)),
    });
  }
  return gaps.sort((a, b) => Number(b.severity ?? 0) - Number(a.severity ?? 0));
}

function fallbackQuestion(lieuName: string, gap: Json | undefined): string {
  const name = lieuName || "ce lieu";
  if (!gap) return `Quel souvenir souhaitez-vous transmettre de ${name} ?`;
  const type = normalize(gap.type);
  const value = normalize(gap.value);
  if (type === "period") return `Qui peut raconter ${value} à ${name} ?`;
  if (type === "lineage") return `Quelle lignée peut encore raconter ${name} ?`;
  if (type === "theme") return `Quel aspect de ${name} n'a pas encore été raconté ?`;
  return `Quelle voix manque encore pour raconter ${name} ?`;
}

function locateEvidence(transcript: string, evidence: string): { start_char: number | null; end_char: number | null } {
  if (!evidence) return { start_char: null, end_char: null };
  const index = transcript.toLocaleLowerCase().indexOf(evidence.toLocaleLowerCase());
  if (index < 0) return { start_char: null, end_char: null };
  return { start_char: index, end_char: index + evidence.length };
}

function sanitizeAnalysis(raw: Json, transcript: string): Json {
  const entitiesRaw = Array.isArray(raw.entities) ? raw.entities : [];
  const claimsRaw = Array.isArray(raw.claims) ? raw.claims : [];
  const entities = entitiesRaw
    .map((item: any) => {
      const evidence = normalize(item?.evidence_text);
      return {
        type: normalize(item?.type).toLowerCase(),
        value: normalize(item?.value),
        confidence: clamp01(item?.confidence),
        evidence_text: evidence,
        ...locateEvidence(transcript, evidence),
      };
    })
    .filter((item: any) => item.type && item.value);
  const claims = claimsRaw
    .map((item: any) => {
      const evidence = normalize(item?.evidence_text);
      return {
        text: normalize(item?.text),
        confidence: clamp01(item?.confidence),
        evidence_text: evidence,
        ...locateEvidence(transcript, evidence),
      };
    })
    .filter((item: any) => item.text);

  const allowedScopes = new Set(["elders", "lineage", "community", "all"]);
  const scope = normalize(raw.suggested_scope).toLowerCase();

  return {
    summary: normalize(raw.summary),
    confidence: clamp01(raw.confidence),
    entities,
    claims,
    period_year: Number.isFinite(Number(raw.period_year)) ? Number(raw.period_year) : null,
    period_label: normalize(raw.period_label) || null,
    theme_key: normalize(raw.theme_key) || null,
    lineage_key: normalize(raw.lineage_key) || null,
    witness_gender: normalize(raw.witness_gender) || "unspecified",
    sensitivity_level: normalize(raw.sensitivity_level) || "normal",
    suggested_scope: allowedScopes.has(scope) ? scope : "community",
    scope_reason: normalize(raw.scope_reason),
    movement: raw.movement && typeof raw.movement === "object" ? raw.movement : null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !authorization) return jsonResponse({ error: "auth_required" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData.user;
  if (authError || !user) return jsonResponse({ error: "auth_required" }, 401);

  const body = (await req.json().catch(() => ({}))) as Json;
  const mode = normalize(body.mode).toLowerCase();

  try {
    if (mode === "question" || mode === "gaps") {
      const lieuId = normalize(body.lieu_id);
      const lieuName = normalize(body.lieu_name);
      if (!lieuId) return jsonResponse({ error: "lieu_required" }, 400);

      const { data: rows, error } = await userClient
        .from("handunia_fragments")
        .select("id,text,transcript_text,period_year,period_label,witness_gender,lineage_key,theme_key,created_at")
        .eq("lieu_id", lieuId)
        .is("withdrawn_at", null)
        .order("created_at", { ascending: false })
        .limit(180);
      if (error) throw error;

      const gaps = computeGaps((rows ?? []) as Json[]);
      if (mode === "gaps") return jsonResponse({ state: "ready", gaps });

      const primary = gaps[0];
      let question = fallbackQuestion(lieuName, primary);
      try {
        const prompt = [
          {
            role: "system",
            content:
              "Tu assistes Handunia Wasa. Tu ne dois jamais inventer un souvenir. Formule UNE question courte de collecte patrimoniale (18 mots maximum) à partir de la lacune fournie. Aucun préambule.",
          },
          {
            role: "user",
            content: JSON.stringify({ lieu: lieuName, lacune: primary ?? null, voix_existantes: (rows ?? []).length }),
          },
        ];
        const generated = normalize(await callAi(prompt, 90));
        if (generated && generated.length <= 180) question = generated.replace(/^["“]|["”]$/g, "");
      } catch {
        // Deterministic fallback remains valid.
      }
      return jsonResponse({
        state: "ready",
        question,
        reason: primary ? `Lacune détectée : ${normalize(primary.value)}` : "Première voix à documenter",
        gap: primary ?? null,
        gaps,
      });
    }

    if (mode === "analyze") {
      const transcript = normalize(body.transcript);
      if (!transcript) return jsonResponse({ error: "transcript_required" }, 400);
      const lieuName = normalize(body.lieu_name);
      const language = normalize(body.language_code) || "ba";
      const system =
        "Tu analyses un témoignage humain pour Handunia Wasa. Tu n'inventes rien et tu n'infères pas un fait non prononcé. Retourne uniquement un objet JSON. Les evidence_text doivent être de courts extraits EXACTS du transcript. Si une information est absente: null ou liste vide. suggested_scope: elders|lineage|community|all. sensitivity_level: normal|sensitive|reserved. Un contenu potentiellement réservé ou citant une personne vivante peut justifier une portée plus restrictive, mais la décision restera humaine.";
      const schema = {
        summary: "résumé fidèle en 20 mots max",
        confidence: 0.0,
        entities: [{ type: "place|period|person|lineage|theme|event|movement", value: "", confidence: 0.0, evidence_text: "" }],
        claims: [{ text: "", confidence: 0.0, evidence_text: "" }],
        period_year: null,
        period_label: null,
        theme_key: null,
        lineage_key: null,
        witness_gender: "unspecified",
        sensitivity_level: "normal",
        suggested_scope: "community",
        scope_reason: "",
        movement: { detected: false, from: null, to: null, evidence_text: null },
      };
      const answer = await callAi(
        [
          { role: "system", content: system },
          {
            role: "user",
            content: `Lieu courant: ${lieuName}\nLangue: ${language}\nSchéma JSON attendu: ${JSON.stringify(schema)}\nTranscript humain:\n${transcript}`,
          },
        ],
        1100,
      );
      const parsed = safeJson(answer);
      if (!parsed) return jsonResponse({ state: "unavailable", message: "Analyse IA indisponible" }, 503);
      return jsonResponse({ state: "ready", analysis: sanitizeAnalysis(parsed, transcript) });
    }

    if (mode === "compare") {
      const transcript = normalize(body.transcript);
      const lieuId = normalize(body.lieu_id);
      if (!transcript || !lieuId) return jsonResponse({ error: "compare_input_required" }, 400);

      const { data: rows, error } = await userClient
        .from("handunia_fragments")
        .select("id,text,transcript_text,period_label,period_year,theme_key,created_at")
        .eq("lieu_id", lieuId)
        .is("withdrawn_at", null)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      const candidates = (rows ?? []).map((row: any) => ({
        id: row.id,
        text: normalize(row.transcript_text || row.text).slice(0, 900),
        period: row.period_label || row.period_year || null,
        theme: row.theme_key || null,
      }));
      if (candidates.length === 0) {
        return jsonResponse({ state: "ready", comparison: { relation: "new", target_fragment_id: null, confidence: 1, reason: "Première voix accessible pour ce lieu." } });
      }
      const answer = await callAi(
        [
          {
            role: "system",
            content:
              "Compare un nouveau témoignage Handunia avec des témoignages existants. Ne décide jamais quelle version est vraie. Choisis relation parmi corroborates, nuances, diverges, new. target_fragment_id doit être exactement un ID fourni ou null. JSON uniquement.",
          },
          {
            role: "user",
            content: JSON.stringify({ nouveau_temoignage: transcript, temoignages_existants: candidates }),
          },
        ],
        420,
      );
      const parsed = safeJson(answer) ?? {};
      const allowed = new Set(["corroborates", "nuances", "diverges", "new"]);
      const relation = allowed.has(normalize(parsed.relation).toLowerCase()) ? normalize(parsed.relation).toLowerCase() : "new";
      const candidateIds = new Set(candidates.map((c: any) => String(c.id)));
      const targetRaw = normalize(parsed.target_fragment_id);
      const target = candidateIds.has(targetRaw) ? targetRaw : null;
      return jsonResponse({
        state: "ready",
        comparison: {
          relation: target ? relation : "new",
          target_fragment_id: target,
          confidence: clamp01(parsed.confidence),
          reason: normalize(parsed.reason) || (target ? "Relation détectée avec une voix existante." : "Aucune relation fiable détectée."),
        },
      });
    }

    if (mode === "persist") {
      if (!serviceKey) return jsonResponse({ error: "server_configuration" }, 500);
      const fragmentId = normalize(body.fragment_id);
      if (!fragmentId) return jsonResponse({ error: "fragment_required" }, 400);

      const { data: fragment, error } = await userClient
        .from("handunia_fragments")
        .select("id,user_id,lieu_id")
        .eq("id", fragmentId)
        .maybeSingle();
      if (error || !fragment || fragment.user_id !== user.id) return jsonResponse({ error: "fragment_forbidden" }, 403);

      const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const analysis = body.analysis && typeof body.analysis === "object" ? body.analysis as Json : {};
      const comparison = body.comparison && typeof body.comparison === "object" ? body.comparison as Json : {};
      const entities = Array.isArray(analysis.entities) ? analysis.entities : [];
      const claims = Array.isArray(analysis.claims) ? analysis.claims : [];

      await service.from("handunia_fragments").update({
        ai_assisted: true,
        ai_summary: normalize(analysis.summary) || null,
        ai_confidence: clamp01(analysis.confidence),
        review_status: "user_validated",
        sensitivity_level: normalize(analysis.sensitivity_level) || "normal",
        suggested_scope: normalize(analysis.suggested_scope) || null,
        memory_state: "sealed",
      }).eq("id", fragmentId).eq("user_id", user.id);

      if (entities.length > 0) {
        const rows = entities.map((item: any) => ({
          user_id: user.id,
          fragment_id: fragmentId,
          entity_type: normalize(item.type) || "unknown",
          entity_value: normalize(item.corrected_value || item.value),
          confidence: clamp01(item.confidence),
          evidence_text: normalize(item.evidence_text) || null,
          start_ms: Number.isFinite(Number(item.start_ms)) ? Math.max(0, Math.round(Number(item.start_ms))) : null,
          end_ms: Number.isFinite(Number(item.end_ms)) ? Math.max(0, Math.round(Number(item.end_ms))) : null,
          validated: item.validated === true,
          corrected_value: normalize(item.corrected_value) || null,
        })).filter((item: any) => item.entity_value);
        if (rows.length) await service.from("handunia_fragment_entities").insert(rows);
      }

      if (claims.length > 0) {
        const rows = claims.map((item: any) => ({
          user_id: user.id,
          fragment_id: fragmentId,
          claim_text: normalize(item.text),
          confidence: clamp01(item.confidence),
          evidence_text: normalize(item.evidence_text) || null,
          start_ms: Number.isFinite(Number(item.start_ms)) ? Math.max(0, Math.round(Number(item.start_ms))) : null,
          end_ms: Number.isFinite(Number(item.end_ms)) ? Math.max(0, Math.round(Number(item.end_ms))) : null,
          validated: item.validated === true,
        })).filter((item: any) => item.claim_text);
        if (rows.length) await service.from("handunia_fragment_claims").insert(rows);
      }

      const suggestedScope = normalize(analysis.suggested_scope);
      if (suggestedScope) {
        await service.from("handunia_ai_scope_suggestions").insert({
          user_id: user.id,
          fragment_id: fragmentId,
          suggested_scope: suggestedScope,
          reason: normalize(analysis.scope_reason) || null,
          confidence: clamp01(analysis.confidence),
          accepted: normalize(body.selected_scope) === suggestedScope,
        });
      }

      const relation = normalize(comparison.relation).toLowerCase();
      const targetId = normalize(comparison.target_fragment_id);
      if (["corroborates", "nuances", "diverges"].includes(relation) && targetId) {
        const { data: target } = await userClient.from("handunia_fragments").select("id").eq("id", targetId).maybeSingle();
        if (target) {
          await service.from("handunia_memory_links").insert({
            user_id: user.id,
            source_fragment_id: fragmentId,
            target_fragment_id: targetId,
            link_type: relation,
            confidence: clamp01(comparison.confidence),
            rationale: normalize(comparison.reason) || null,
          });
          if (relation === "diverges") {
            await service.from("handunia_divergences").insert({
              lieu_id: fragment.lieu_id,
              subject: normalize(comparison.reason) || "Deux versions existent.",
              version_a_id: targetId,
              version_b_id: fragmentId,
              status: "open",
            });
          }
        }
      }

      const sessionId = normalize(body.session_id);
      if (sessionId) {
        await service.from("handunia_ai_sessions").update({ status: "sealed", updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", user.id);
      }
      return jsonResponse({ state: "sealed", fragment_id: fragmentId });
    }

    return jsonResponse({ error: "unknown_mode" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Handunia IA";
    return jsonResponse({ state: "unavailable", message: "Lumière IA indisponible", detail: message }, 503);
  }
});
