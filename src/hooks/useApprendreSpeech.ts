import { useCallback, useEffect, useRef, useState } from 'react';
import { claimVoice, loadReplyAudio, replySpeechChunks, VOICE_FOCUS_EVENT } from '@/lib/voice/replySpeech';
type PublishedLoader = (signal: AbortSignal) => Promise<Blob>;
/** One user-controlled pronunciation at a time, shared with translator/IA audio focus. */
export function useApprendreSpeech(text: string, published?: PublishedLoader, sourceKey = '') {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [error, setError] = useState(''), [engine, setEngine] = useState('');
  const owner = useRef(crypto.randomUUID()), controller = useRef<AbortController | null>(null), player = useRef<HTMLAudioElement | null>(null);
  const stop = useCallback(() => { controller.current?.abort(); controller.current = null; player.current?.pause(); player.current = null; setPhase('idle'); }, []);
  useEffect(() => {
    const focus = (event: Event) => { if ((event as CustomEvent).detail !== owner.current) stop(); };
    window.addEventListener(VOICE_FOCUS_EVENT, focus);
    return () => { window.removeEventListener(VOICE_FOCUS_EVENT, focus); stop(); };
  }, [stop, text, sourceKey]);
  const start = async () => {
    stop(); claimVoice(owner.current); const abort = new AbortController(); controller.current = abort;
    const signal = abort.signal; setError(''); setPhase('loading');
    const play = async (blob: Blob) => {
      signal.throwIfAborted(); const url = URL.createObjectURL(blob), audio = new Audio(url); player.current = audio;
      try {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => { signal.removeEventListener('abort', cancel); audio.onended = null; audio.onerror = null; };
          const cancel = () => { audio.pause(); cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
          audio.onended = () => { cleanup(); resolve(); };
          audio.onerror = () => { cleanup(); reject(new Error('Lecture impossible. Réessayez.')); };
          signal.addEventListener('abort', cancel, { once: true });
          audio.play().then(() => { if (!signal.aborted) setPhase('playing'); }).catch(() => { cleanup(); reject(new Error('Appuyez à nouveau pour autoriser la lecture.')); });
        });
      } finally { audio.pause(); audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); if (player.current === audio) player.current = null; }
    };
    try {
      let humanPlayed = false;
      if (published) {
        try { const blob = await published(signal); signal.throwIfAborted(); setEngine('Voix humaine publiée'); await play(blob); humanPlayed = true; }
        catch (reason) { if (signal.aborted) throw reason; }
      }
      if (!humanPlayed) {
        for (const chunk of replySpeechChunks(text)) {
          signal.throwIfAborted(); setPhase('loading'); const clip = await loadReplyAudio(chunk, signal);
          signal.throwIfAborted(); setEngine(clip.engine === 'meta-mms-tts-bba' ? 'Voix synthétique · Meta MMS' : 'Voix FITILA de secours'); await play(clip.blob);
        }
      }
      signal.throwIfAborted(); setPhase('idle');
    } catch (reason) { if (!signal.aborted) { setError(reason instanceof Error ? reason.message : 'Audio indisponible. Réessayez.'); setPhase('error'); } }
  };
  return { phase, error, engine, stop, toggle: () => phase === 'loading' || phase === 'playing' ? stop() : void start() };
}
