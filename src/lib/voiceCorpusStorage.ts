import { supabase } from '@/integrations/supabase/client';

export const VOICE_CORPUS_BUCKET = 'bariba-voice-corpus';

/** Physical byte status of a storage object — distinct from database metadata. */
export type ObjectByteStatus = 'present' | 'missing' | 'unknown';

/** Classify a read-back probe response. 404/400 (Supabase NoSuchKey) => missing. */
export function classifyProbe(status: number | null, bodyText = ''): ObjectByteStatus {
  if (status === null) return 'unknown';
  if (status === 200 || status === 206) return 'present';
  if (status === 404 || /NoSuchKey|not.?found/i.test(bodyText)) return 'missing';
  if (status === 400 && bodyText === '') return 'missing';
  return 'unknown';
}

/**
 * Read-only verification that bytes really exist: a signed URL can be issued
 * even when the object is gone, so we GET the first byte.
 */
export async function probeVoiceObject(
  path: string,
): Promise<{ status: ObjectByteStatus; signedUrl: string | null; detail?: string }> {
  const { data, error } = await supabase.storage.from(VOICE_CORPUS_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    const msg = error?.message ?? '';
    return { status: /not.?found|NoSuchKey/i.test(msg) ? 'missing' : 'unknown', signedUrl: null, detail: msg };
  }
  try {
    const res = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-0' } });
    const body = res.ok ? '' : await res.text().catch(() => '');
    const status = classifyProbe(res.status, body);
    return { status, signedUrl: status === 'present' ? data.signedUrl : null, detail: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { status: 'unknown', signedUrl: null, detail: (e as Error).message };
  }
}
