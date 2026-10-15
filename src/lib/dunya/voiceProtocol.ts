import type { VoiceEvent } from '../../../supabase/functions/_shared/dunya-voice-core.ts';
const messages: Record<string, string> = {
  rate_limited: 'DUNYA est très sollicitée. Réessayez dans une minute.',
  busy: 'Le service vocal est occupé. Réessayez dans un instant.',
  not_configured: 'Le service vocal est momentanément indisponible.',
  quota_unavailable: 'Le service vocal est momentanément indisponible.',
  auth_required: 'Votre session a expiré. Reconnectez-vous ou continuez comme visiteur.',
  invalid_audio: 'Ce vocal ne peut pas être lu. Réenregistrez-le.',
  clarification_required: 'Je n’ai pas bien compris. Pouvez-vous répéter ?',
  translation_unavailable: 'Je n’arrive pas à traduire votre demande. Reformulez ou essayez en français.',
  translation_fallback: 'La traduction est indisponible : réponse en français.',
  asr_fallback: 'Reconnaissance vocale de secours utilisée.',
  tts_fallback: 'Voix de secours utilisée pour cette réponse.',
};
export const voiceMessage = (code?: string): string => messages[code ?? ''] ?? 'Service vocal momentanément indisponible. Réessayez.';

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

