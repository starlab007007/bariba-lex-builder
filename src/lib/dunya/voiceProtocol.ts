import type { VoiceEvent } from '../../../supabase/functions/_shared/dunya-voice-core.ts';
const messages: Record<string, string> = {
  rate_limited: 'Service très sollicité. Réessayez dans une minute.',
  busy: 'Service occupé. Réessayez.',
  not_configured: 'Service vocal indisponible.',
  quota_unavailable: 'Service vocal indisponible.',
  auth_required: 'Session expirée. Reconnectez-vous.',
  invalid_audio: 'Vocal illisible. Réenregistrez.',
  transcription_unavailable: 'Reconnaissance indisponible. Réessayez ou écrivez.',
  clarification_required: 'Je n’ai pas bien compris. Pouvez-vous répéter ?',
  translation_unavailable: 'Traduction impossible. Reformulez.',
  translation_fallback: 'Réponse en français (traduction indisponible).',
  asr_fallback: 'Reconnaissance de secours.',
  tts_fallback: 'Voix de secours.',
  brain_rate_limited: 'IA limitée. Réessayez dans un moment.',
  brain_unavailable: 'Vocal compris, réponse indisponible. Réessayez.',
};
export const voiceMessage = (code?: string): string => messages[code ?? ''] ?? 'Service vocal indisponible. Réessayez.';

/** Incremental NDJSON parser: handles UTF-8/network boundaries and rejects truncated responses. */
export async function consumeVoiceStream(
  stream: ReadableStream<Uint8Array>, onEvent: (event: VoiceEvent) => void, signal?: AbortSignal,
) {
  const reader = stream.getReader(), decoder = new TextDecoder();
  let buffer = '', complete = false;
  const parse = (line: string) => {
    if (!line.trim()) return;
    const event: VoiceEvent = JSON.parse(line);
    if (event.type === 'error') throw new Error(voiceMessage(event.code));
    if (event.type === 'done') complete = true;
    onEvent(event);
  };
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 12_000_000) throw new Error('Réponse audio trop volumineuse.');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); parse(line);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) parse(buffer);
    if (!complete) throw new Error('La réponse a été interrompue. Réessayez.');
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

