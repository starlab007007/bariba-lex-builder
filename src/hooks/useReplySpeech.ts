import { useCallback, useEffect, useRef, useState } from 'react';
import { claimVoice, loadReplyAudio, replySpeechChunks, VOICE_FOCUS_EVENT, type SpeechLanguage } from '@/lib/voice/replySpeech';

type Phase = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export function useReplySpeech(text: string, lang: SpeechLanguage) {
  const [phase, setPhase] = useState<Phase>('idle'), [part, setPart] = useState(0), [error, setError] = useState('');
  const [rate, setRate] = useState(1), [engine, setEngine] = useState('');
  const owner = useRef(crypto.randomUUID()), abort = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null), paused = useRef(false), rateRef = useRef(1);
  const chunks = replySpeechChunks(text);
  const stop = useCallback(() => {
    abort.current?.abort(); abort.current = null;
    if (audio.current) { audio.current.pause(); audio.current.removeAttribute('src'); audio.current.load(); audio.current = null; }
    paused.current = false; setPhase('idle'); setPart(0);
  }, []);
  useEffect(() => {
    const focus = (event: Event) => { if ((event as CustomEvent).detail !== owner.current) stop(); };
    window.addEventListener(VOICE_FOCUS_EVENT, focus);
    return () => { window.removeEventListener(VOICE_FOCUS_EVENT, focus); stop(); };
  }, [stop, text, lang]);

  const start = async () => {
    stop(); claimVoice(owner.current); setError('');
    const controller = new AbortController(); abort.current = controller;
    const signal = controller.signal;
    try {
      for (let index = 0; index < chunks.length; index++) {
        signal.throwIfAborted(); setPart(index + 1); setPhase('loading');
        if (lang === 'fr') {
          if (!('speechSynthesis' in window)) throw new Error('La voix française n’est pas disponible sur cet appareil.');
          setEngine('Voix française de l’appareil');
          await new Promise<void>((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(chunks[index]);
            utterance.lang = 'fr-FR'; utterance.rate = rateRef.current;
            const voices = speechSynthesis.getVoices();
            utterance.voice = voices.find(v => v.lang.startsWith('fr') && v.localService) || voices.find(v => v.lang.startsWith('fr')) || null;
            const cancel = () => { speechSynthesis.cancel(); reject(new DOMException('Aborted', 'AbortError')); };
            const cleanup = () => signal.removeEventListener('abort', cancel);
            utterance.onend = () => { cleanup(); resolve(); };
            utterance.onerror = () => { cleanup(); reject(new Error('Lecture interrompue. Appuyez sur Réessayer.')); };
            utterance.onstart = () => { if (!signal.aborted) setPhase('playing'); };
            signal.addEventListener('abort', cancel, { once: true });
            speechSynthesis.speak(utterance);
          });
        } else {
          const result = await loadReplyAudio(chunks[index], signal);
          signal.throwIfAborted(); setEngine(result.engine === 'meta-mms-tts-bba' ? 'Meta MMS · Baatɔnum' : 'Voix FITILA de secours');
          const url = URL.createObjectURL(result.blob), player = new Audio(url); audio.current = player;
          player.playbackRate = rateRef.current;
          try {
            await new Promise<void>((resolve, reject) => {
              const cleanup = () => { signal.removeEventListener('abort', cancel); player.onended = null; player.onerror = null; };
              const cancel = () => { player.pause(); cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
              player.onended = () => { cleanup(); resolve(); };
              player.onerror = () => { cleanup(); reject(new Error('Cet audio ne peut pas être lu. Réessayez.')); };
              signal.addEventListener('abort', cancel, { once: true });
              player.play().then(() => { if (!signal.aborted) setPhase('playing'); }).catch(() => { cleanup(); reject(new Error('Appuyez sur Réessayer pour autoriser la lecture audio.')); });
            });
          } finally { player.pause(); player.removeAttribute('src'); player.load(); URL.revokeObjectURL(url); if (audio.current === player) audio.current = null; }
        }
      }
      signal.throwIfAborted(); setPhase('ended');
    } catch (reason) {
      if (!signal.aborted) { setError(reason instanceof Error ? reason.message : 'Lecture impossible. Réessayez.'); setPhase('error'); }
    }
  };
  const toggle = () => {
    if (phase === 'playing') {
      paused.current = true; audio.current?.pause(); if (lang === 'fr') speechSynthesis.pause(); setPhase('paused');
    } else if (phase === 'paused') {
      paused.current = false;
      if (lang === 'fr') speechSynthesis.resume();
      else audio.current?.play().catch(() => { setError('Lecture impossible. Réessayez.'); setPhase('error'); });
      setPhase('playing');
    } else if (phase !== 'loading') void start();
  };
  const changeRate = (value: number) => { rateRef.current = value; setRate(value); if (audio.current) audio.current.playbackRate = value; };
  return { phase, part, total: chunks.length, error, engine, rate, changeRate, toggle, stop };
}
