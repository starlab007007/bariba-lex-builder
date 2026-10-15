// Shared, dependency-free protocol and bounded media handling. No inferred confidence scores.
export type VoiceEvent = {
  type: 'stage' | 'transcript' | 'answer' | 'audio' | 'notice' | 'done' | 'error';
  request_id: string;
  stage?: string;
  text?: string;
  subtitle?: string;
  lang?: 'fr' | 'bba';
  engine?: string;
  model?: string;
  audio_base64?: string;
  audio_url?: string;
  code?: string;
  elapsed_ms?: number;
};
export const MAX_VOICE_BYTES = 8_000_000;
export const MAX_VOICE_SECONDS = 120;
export const MAX_VOICE_TEXT = 1600;

export function frenchGreeting(text: string): string | null {
  const value = text.toLocaleLowerCase().trim();
  if (!/^(bonjour|bonsoir|salut|coucou|merci|au revoir)[\s.!?]*$/u.test(value)) return null;
  if (value.startsWith('merci')) return 'Je vous en prie.';
  if (value.startsWith('au revoir')) return 'Au revoir !';
  return 'Bonjour ! Comment puis-je vous aider ?';
}

export function speechChunks(value: string, limit = 380): string[] {
  if (limit < 2) throw new Error('Invalid speech limit');
  const text = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > limit) {
    const prefix = remaining.slice(0, limit + 1);
    const sentence = [...prefix.matchAll(/[.!?…]\s/g)].pop();
    let cut = sentence && sentence.index! > limit / 3 ? sentence.index! + 1 : prefix.lastIndexOf(' ');
    if (cut < limit / 3) cut = limit;
    // Never cut a UTF-16 surrogate pair.
    if (/[\uD800-\uDBFF]/.test(remaining[cut - 1])) cut--;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function needsClarification(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || !/[\p{L}\p{N}]/u.test(text)) return true;
  if (words.length < 6) return false;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w.toLocaleLowerCase(), (counts.get(w.toLocaleLowerCase()) ?? 0) + 1);
  return Math.max(...counts.values()) / words.length > 0.7;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

/** Accept only the canonical browser format, and split near quiet frames below 25 seconds. */
export function segmentVoiceWav(encoded: string): Uint8Array[] {
  if (encoded.length > Math.ceil(MAX_VOICE_BYTES * 4 / 3) + 4) throw new Error('audio_too_large');
  let binary: string;
  try { binary = atob(encoded); } catch { throw new Error('invalid_audio'); }
  const raw = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (raw.length < 46 || raw.length > MAX_VOICE_BYTES) throw new Error('invalid_audio');
  const view = new DataView(raw.buffer);
  const tag = (n: number) => String.fromCharCode(...raw.subarray(n, n + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE' || tag(12) !== 'fmt ' || view.getUint32(16, true) !== 16
    || view.getUint16(20, true) !== 1 || view.getUint16(22, true) !== 1
    || view.getUint32(24, true) !== 16000 || view.getUint16(34, true) !== 16 || tag(36) !== 'data') throw new Error('invalid_audio');
  const size = view.getUint32(40, true);
  if (size !== raw.length - 44 || size % 2 || size / 32000 > MAX_VOICE_SECONDS || size < 3200) throw new Error('audio_duration');
  const segments: Uint8Array[] = [];
  let start = 44;
  while (start < raw.length) {
    let end = Math.min(start + 25 * 32000, raw.length);
    if (end < raw.length) {
      let quiet = end;
      let best = Infinity;
      for (let frame = start + 20 * 32000; frame + 640 <= end; frame += 640) {
        let energy = 0;
        for (let j = frame; j < frame + 640; j += 2) energy += Math.abs(view.getInt16(j, true));
        if (energy <= best) { best = energy; quiet = frame + 640; }
      }
      end = quiet;
    }
    const part = new Uint8Array(44 + end - start);
    part.set(raw.subarray(0, 44)); part.set(raw.subarray(start, end), 44);
    const header = new DataView(part.buffer);
    header.setUint32(4, part.length - 8, true); header.setUint32(40, part.length - 44, true);
    segments.push(part); start = end;
  }
  return segments;
}
