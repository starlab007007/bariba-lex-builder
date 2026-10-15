/**
 * Client for the optional Meta voice engines through the secured gateway
 * `meta-voice-gateway` on the canonical FITILA backend. Off by default (feature flags);
 * every caller keeps its existing engine as fallback.
 */
import { supabase } from '@/integrations/supabase/client';
import { blobToWav16kMono } from '@/lib/audioToWav';
import { META_FLAG_KEYS, MAX_ASR_BYTES, readableVoiceError, resolveFlags, validateTtsText, type MetaVoiceFlags } from './metaVoiceCore';

export * from './metaVoiceCore';

export class MetaVoiceError extends Error {}

export function getMetaVoiceFlags(): MetaVoiceFlags {
  let local: { tts: string | null; asr: string | null } = { tts: null, asr: null };
  try {
    local = { tts: localStorage.getItem(META_FLAG_KEYS.tts), asr: localStorage.getItem(META_FLAG_KEYS.asr) };
  } catch { /* storage unavailable */ }
  return resolveFlags({ tts: import.meta.env.VITE_FITILA_META_TTS, asr: import.meta.env.VITE_FITILA_META_ASR }, local);
}

export function setMetaVoiceFlag(kind: 'tts' | 'asr', enabled: boolean) {
  try { localStorage.setItem(META_FLAG_KEYS[kind], enabled ? '1' : '0'); } catch { /* ignore */ }
}

async function callGateway(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('meta-voice-gateway', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let code: string | undefined;
    try { code = ctx ? (await ctx.clone().json())?.code : undefined; } catch { /* ignore */ }
    throw new MetaVoiceError(readableVoiceError(ctx?.status ?? null, code));
  }
  return (data ?? {}) as Record<string, unknown>;
}

const ttsCache = new Map<string, string>();

/** Returns a playable object URL of Meta MMS-TTS audio. */
export async function metaTts(text: string): Promise<string> {
  const invalid = validateTtsText(text);
  if (invalid) throw new MetaVoiceError(invalid);
  const key = text.replace(/\s+/g, ' ').trim();
  const cached = ttsCache.get(key);
  if (cached) return cached;
  const data = await callGateway({ engine: 'meta-mms-tts-bba', text: key });
  const b64 = typeof data.audio_base64 === 'string' ? data.audio_base64 : '';
  if (!b64) throw new MetaVoiceError('Aucun audio reçu.');
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  ttsCache.set(key, url);
  return url;
}

/** Transcribes a recording with Omnilingual ASR 300M (audio sent privately, not stored). */
export async function metaAsr(audio: Blob): Promise<string> {
  const { blob } = await blobToWav16kMono(audio);
  if (blob.size > MAX_ASR_BYTES) throw new MetaVoiceError(readableVoiceError(413));
  const b64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',').pop() || '');
    r.onerror = () => reject(new MetaVoiceError('Lecture audio impossible.'));
    r.readAsDataURL(blob);
  });
  const data = await callGateway({ engine: 'meta-asr-300m', audio_base64: b64 });
  return String(data.transcript ?? '').trim();
}
