import { runServerVoice } from '@/lib/dunya/serverVoice';
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
  let result: { blob: Blob; engine: string } | undefined;
  await runServerVoice({ text, lang: 'bba', replyLang: 'bba', speechOnly: true, signal,
    onEvent(event) {
      if (event.type === 'audio' && event.audio_base64) {
        const bytes = Uint8Array.from(atob(event.audio_base64), c => c.charCodeAt(0));
        result = { blob: new Blob([bytes], { type: 'audio/wav' }), engine: event.engine || 'meta-mms-tts-bba' };
      } else if (event.type === 'audio' && event.audio_url) {
        // Legacy fallback URLs are handled explicitly below, with no credentials.
        result = { blob: new Blob([event.audio_url], { type: 'text/uri-list' }), engine: event.engine || 'bariba-tts' };
      }
    },
  });
  signal.throwIfAborted();
  if (!result) throw new Error('Aucun audio reçu. Réessayez.');
  if (result.blob.type === 'text/uri-list') {
    const url = new URL(await result.blob.text());
    if (url.protocol !== 'https:') throw new Error('Audio indisponible.');
    const response = await fetch(url, { signal, credentials: 'omit' });
    if (!response.ok) throw new Error('Audio indisponible. Réessayez.');
    result.blob = await response.blob();
  }
  if (!result.blob.size || result.blob.size > 8_000_000) throw new Error('Audio indisponible.');
  cache.set(text, result); cacheBytes += result.blob.size;
  while (cache.size > 24 || cacheBytes > 16_000_000) {
    const first = cache.keys().next().value!; cacheBytes -= cache.get(first)!.blob.size; cache.delete(first);
  }
  return result;
}
