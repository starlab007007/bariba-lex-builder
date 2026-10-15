import { reconstructTranscript, normalizeTranscript, transcriptSegments, type RepairLanguage, type TranscriptReference, type TranscriptRepair } from './transcription-repair.ts';
type Dependencies = { env: (key: string) => string | undefined; fetch: typeof fetch };
/** Only server credentials can retrieve references. Never let a failed lookup destroy recognized words. */
export async function repairRecognizedTranscript(raw: string, lang: RepairLanguage, signal?: AbortSignal, deps: Dependencies = { env: key => Deno.env.get(key), fetch: globalThis.fetch }): Promise<TranscriptRepair> {
  const segments = transcriptSegments(normalizeTranscript(raw));
  if (!segments.length || raw.length > 5000) return reconstructTranscript(raw, lang, [], true);
  const url = deps.env('SUPABASE_URL'), key = deps.env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reconstructTranscript(raw, lang, [], true);
  const headers = { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
  const requestSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(5000)]);
  try {
    for (const [bucket, limit, window] of [['asr-repair-global', 120, 60], ['asr-repair-day', 3000, 86400]] as const) {
      const budget = await deps.fetch(`${url}/rest/v1/rpc/consume_dunya_voice_quota`, { method: 'POST', headers, body: JSON.stringify({ p_key: bucket, p_limit: limit, p_window: window }), signal: requestSignal });
      if (!budget.ok || await budget.json() !== true) return reconstructTranscript(raw, lang, [], true);
    }
    const response = await deps.fetch(`${url}/rest/v1/rpc/fitila_asr_reference_candidates`, { method: 'POST', headers, body: JSON.stringify({ p_queries: segments.slice(0, 24).map(segment => segment.text), p_language: lang }), signal: requestSignal });
    if (!response.ok) return reconstructTranscript(raw, lang, [], true);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > 576) return reconstructTranscript(raw, lang, [], true);
    const grouped: TranscriptReference[][] = Array.from({ length: Math.min(segments.length, 24) }, () => []);
    for (const row of rows) {
      if (!Number.isInteger(row.query_index) || row.query_index < 0 || row.query_index >= grouped.length || typeof row.text !== 'string' || row.text.length > 320) continue;
      if (!['dictionary','corpus','apprendre','apprendre-content'].includes(row.source)) continue;
      grouped[row.query_index].push({ text: row.text, source: row.source, source_id: String(row.source_id ?? '').slice(0, 160), validation: ['verified','catalogue','active','pending','rejected'].includes(row.validation) ? row.validation : 'catalogue', kind: String(row.kind ?? 'phrase').slice(0, 40) });
    }
    return reconstructTranscript(raw, lang, grouped);
  } catch { return reconstructTranscript(raw, lang, [], true); }
}
