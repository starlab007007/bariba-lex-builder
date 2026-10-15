import { supabase, FITILA_API_URL, FITILA_API_PUBLIC_KEY } from '@/integrations/supabase/client';
import { blobToWav16kMono } from '@/lib/audioToWav';
import { bytesToBase64, MAX_VOICE_SECONDS, type VoiceEvent } from '../../../supabase/functions/_shared/dunya-voice-core';
export type { VoiceEvent };

import { consumeVoiceStream, voiceMessage } from './voiceProtocol';
export { consumeVoiceStream, voiceMessage } from './voiceProtocol';

export async function runServerVoice(opts: {
  text?: string; audio?: Blob; lang: 'fr' | 'bba'; replyLang?: 'fr' | 'bba';
  history?: { role: 'user' | 'assistant'; content: string }[];
  transcribeOnly?: boolean; speechOnly?: boolean; signal: AbortSignal;
  onEvent: (event: VoiceEvent) => void;
}) {
  opts.signal.throwIfAborted();
  let audioBase64: string | undefined;
  if (opts.audio) {
    if (opts.audio.size > 20_000_000) throw new Error('Vocal trop volumineux (20 Mo maximum).');
    const wav = await blobToWav16kMono(opts.audio, MAX_VOICE_SECONDS);
    if (wav.rmsDb < -55) throw new Error('Je n’ai pas entendu de voix. Rapprochez-vous du micro.');
    opts.signal.throwIfAborted();
    audioBase64 = bytesToBase64(new Uint8Array(await wav.blob.arrayBuffer()));
  }
  const { data } = await supabase.auth.getSession();
  opts.signal.throwIfAborted();
  const token = data.session?.access_token;
  const response = await fetch(`${FITILA_API_URL}/functions/v1/dunya-voice-turn`, {
    method: 'POST', signal: opts.signal,
    headers: { 'Content-Type': 'application/json', apikey: FITILA_API_PUBLIC_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ text: opts.text, audio_base64: audioBase64, lang: opts.lang, reply_lang: opts.replyLang,
      history: opts.history?.slice(-8), transcribe_only: opts.transcribeOnly, speech_only: opts.speechOnly }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(voiceMessage(error.code));
  }
  if (!response.body) throw new Error('Aucune réponse vocale reçue.');
  await consumeVoiceStream(response.body, opts.onEvent, opts.signal);
}
