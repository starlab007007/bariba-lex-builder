import { supabase, FITILA_API_URL, FITILA_API_PUBLIC_KEY } from '@/integrations/supabase/client';
import { inlineBaribaAudio } from './replyAudioPayload';
export { readableSpeech, replySpeechChunks } from './speechTextCore';

export type SpeechLanguage = 'bba' | 'fr';
export const VOICE_FOCUS_EVENT = 'fitila:voice-focus';
export function claimVoice(owner: string) { window.dispatchEvent(new CustomEvent(VOICE_FOCUS_EVENT, { detail: owner })); }

// Blobs, never permanent object URLs. Bound memory and avoid re-generating repeated replies.
const cache = new Map<string, { blob: Blob; engine: string }>();
let cacheBytes = 0;
export async function loadReplyAudio(text: string, signal: AbortSignal): Promise<{ blob: Blob; engine: string }> {
  const cached = cache.get(text);
  if (cached) { cache.delete(text); cache.set(text, cached); return cached; }
  signal.throwIfAborted();
  const { data: session } = await supabase.auth.getSession();
  signal.throwIfAborted();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 45000);
  let result: { blob: Blob; engine: string };
  try {
    const token = session.session?.access_token;
    const response = await fetch(`${FITILA_API_URL}/functions/v1/bariba-tts`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', apikey: FITILA_API_PUBLIC_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text, skipRefine: true }),
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'Le service vocal est très sollicité. Réessayez dans un instant.' : 'Voix Baatɔnum momentanément indisponible. Réessayez.');
    const payload = await response.json();
    let blob = inlineBaribaAudio(payload);
    if (!blob) {
      // Compatibility with an older backend; new responses contain their WAV directly.
      const url = new URL(String(payload.audio_url ?? payload.audioUrl ?? ''));
      if (url.protocol !== 'https:') throw new Error('Audio indisponible.');
      const audio = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!audio.ok || !(audio.headers.get('content-type') || '').toLowerCase().startsWith('audio/')) {
        throw new Error('Audio indisponible. Réessayez.');
      }
      blob = await audio.blob();
    }
    result = { blob, engine: payload.engine || 'bariba-tts' };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
  signal.throwIfAborted();
  if (!result.blob.size || result.blob.size > 8_000_000) throw new Error('Audio indisponible.');
  cache.set(text, result); cacheBytes += result.blob.size;
  while (cache.size > 24 || cacheBytes > 16_000_000) {
    const first = cache.keys().next().value!; cacheBytes -= cache.get(first)!.blob.size; cache.delete(first);
  }
  return result;
}
