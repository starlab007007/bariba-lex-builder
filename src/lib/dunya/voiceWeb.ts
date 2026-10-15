/**
 * DUNYA Voix (web): the same three language modes as the mobile app, online.
 *
 * - Français : browser speech recognition (live subtitles) + FITILA chat + browser voice.
 * - Baatɔnum : recorder with silence detection -> bariba-stt -> ByT5 (ba->fr)
 *              -> fitila-ia-chat (answer + ByT5 fr->ba) -> bariba-tts.
 * - Les deux  : both recognisers in parallel, the clearer one wins.
 */
import { supabase } from '@/integrations/supabase/client';
import { isOffline, memoryTranslate } from '@/lib/translation/translationMemory';
import { getMetaVoiceFlags, metaAsr, metaTts } from '@/lib/voice/metaVoice';

// DUNYA pilot override (set by the screen from the signed-in user's role + choice).
let dunyaVoiceOverride: { tts: boolean; asr: boolean } | null = null;
export let lastVoiceEngine: { asr?: 'meta' | 'fitila'; tts?: 'meta' | 'fitila' } = {};
export function setDunyaMetaVoice(v: { tts: boolean; asr: boolean } | null) { dunyaVoiceOverride = v; }
const metaFlags = () => dunyaVoiceOverride ?? getMetaVoiceFlags();

export type DunyaWebMode = 'fr' | 'bba' | 'both';

export type DunyaWebTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  lang: 'fr' | 'bba';
  subtitle?: string;
  createdAt: number;
};

export const MODE_LABEL: Record<DunyaWebMode, string> = {
  fr: 'Français',
  bba: 'Baatɔnum',
  both: 'Les deux',
};

// ---------------------------------------------------------------------------
// History, one per mode (languages never mix)
// ---------------------------------------------------------------------------

const historyKey = (mode: DunyaWebMode) => `dunya-web-history-${mode}`;

export function loadHistory(mode: DunyaWebMode): DunyaWebTurn[] {
  try {
    const raw = localStorage.getItem(historyKey(mode));
    const parsed = raw ? (JSON.parse(raw) as DunyaWebTurn[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-60) : [];
  } catch {
    return [];
  }
}

export function saveHistory(mode: DunyaWebMode, turns: DunyaWebTurn[]) {
  try {
    localStorage.setItem(historyKey(mode), JSON.stringify(turns.slice(-60)));
  } catch {
    // Storage may be unavailable (private mode): history stays in memory.
  }
}

export function loadPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`dunya-web-${key}`);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function savePreference(key: string, value: unknown) {
  try {
    localStorage.setItem(`dunya-web-${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// FITILA cloud services
// ---------------------------------------------------------------------------

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message || `${fn} indisponible`);
  return data as T;
}

export async function transcribeBariba(audio: Blob): Promise<string> {
  // Optional Meta Omnilingual ASR (flag); falls back to the existing bariba-stt.
  if (metaFlags().asr) {
    try {
      const t = await metaAsr(audio);
      if (t) { lastVoiceEngine = { ...lastVoiceEngine, asr: 'meta' }; return t; }
    } catch (e) {
      console.warn('[dunya] Meta ASR indisponible, repli bariba-stt:', e instanceof Error ? e.message : e);
    }
  }
  const dataUrl = await blobToDataUrl(audio);
  const data = await invoke<{ transcription?: string; text?: string; error?: string }>('bariba-stt', {
    audio: dataUrl,
    robustMode: true,
  });
  lastVoiceEngine = { ...lastVoiceEngine, asr: 'fitila' };
  return (data.transcription ?? data.text ?? '').trim();
}

export async function translate(text: string, from: 'fr' | 'bba', to: 'fr' | 'bba'): Promise<string | null> {
  if (!text.trim() || from === to) return text;
  const direction = from === 'fr' ? 'fr-ba' : 'ba-fr';
  // 1. Attested sentence: exact, instant, no network.
  const attested = await memoryTranslate(text, direction);
  if (attested) return attested.translation;
  // 2. Offline: word-by-word from the lexicon, only when most words are known.
  if (isOffline()) return (await memoryTranslate(text, direction, { allowWordByWord: true }))?.translation ?? null;
  try {
    const data = await invoke<{ translation?: string }>('byt5-bariba-translate', {
      text,
      sourceLang: from === 'fr' ? 'french' : 'bariba',
      targetLang: to === 'fr' ? 'french' : 'bariba',
    });
    const out = data.translation?.trim();
    if (out) return out;
  } catch {
    // network or server failure: fall through to the offline lexicon
  }
  return (await memoryTranslate(text, direction, { allowWordByWord: true }))?.translation ?? null;
}

const VOICE_SYSTEM_PROMPT = [
  'Tu es DUNYA, l’assistant vocal de FITILA pour les personnes du Nord-Bénin.',
  'Réponds comme à l’oral : une à quatre phrases courtes et naturelles.',
  'Pas de liste, pas de markdown, pas d’émojis.',
  'Si tu ne sais pas, dis-le simplement. Pour la santé, conseille de voir un agent de santé.',
].join(' ');

export async function askDunya(
  message: string,
  history: DunyaWebTurn[],
  wantBariba: boolean,
): Promise<{ fr: string; ba: string | null }> {
  const data = await invoke<{ response_fr?: string; response_ba?: string | null; error?: string; message?: string }>(
    'fitila-ia-chat',
    {
      message,
      history: history.slice(-8).map((t) => ({ role: t.role, content: t.subtitle && t.lang === 'bba' ? t.subtitle : t.text })),
      systemPrompt: wantBariba
        ? `${VOICE_SYSTEM_PROMPT} Ta réponse sera traduite en baatɔnum : phrases très courtes et simples.`
        : VOICE_SYSTEM_PROMPT,
      temperature: 0.4,
      max_tokens: 200,
    },
  );
  if (data.error) throw new Error(data.message || data.error);
  return { fr: (data.response_fr ?? '').trim(), ba: data.response_ba?.trim() || null };
}

// ---------------------------------------------------------------------------
// Speaking
// ---------------------------------------------------------------------------

let currentAudio: HTMLAudioElement | null = null;
let finishCurrentSpeech: (() => void) | null = null;

export function stopSpeaking() {
  finishCurrentSpeech?.();
  finishCurrentSpeech = null;
  try {
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.resume(); // reset a paused French queue before the next turn
  } catch {
    // ignore
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export function pauseSpeaking() { currentAudio?.pause(); window.speechSynthesis?.pause(); }
export function resumeSpeaking() { if (currentAudio) void currentAudio.play().catch(() => undefined); window.speechSynthesis?.resume(); }

function pickFrenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  return voices.find((v) => v.lang?.toLowerCase().startsWith('fr') && /google|natural|premium/i.test(v.name))
    ?? voices.find((v) => v.lang?.toLowerCase().startsWith('fr'));
}

export function speakFrench(text: string, rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text.trim()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = rate;
    const voice = pickFrenchVoice();
    if (voice) u.voice = voice;
    const finish = () => { if (finishCurrentSpeech === finish) finishCurrentSpeech = null; resolve(); };
    finishCurrentSpeech = finish;
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
  });
}

export async function speakBariba(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  // Optional Meta MMS-TTS (flag); falls back to the existing bariba-tts.
  if (metaFlags().tts) {
    try {
      const url = await metaTts(text);
      lastVoiceEngine = { ...lastVoiceEngine, tts: 'meta' };
      await playUrl(url);
      return true;
    } catch (e) {
      console.warn('[dunya] Meta TTS indisponible, repli bariba-tts:', e instanceof Error ? e.message : e);
    }
  }
  const data = await invoke<{ success?: boolean; audio_url?: string }>('bariba-tts', { text, skipRefine: true });
  if (!data.audio_url) return false;
  lastVoiceEngine = { ...lastVoiceEngine, tts: 'fitila' };
  await playUrl(data.audio_url);
  return true;
}

export function playUrl(url: string, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    stopSpeaking();
    const audio = new Audio(url);
    currentAudio = audio;
    const finish = (error?: unknown) => {
      signal?.removeEventListener('abort', onAbort);
      audio.onended = null; audio.onerror = null;
      if (currentAudio === audio) currentAudio = null;
      if (finishCurrentSpeech === stop) finishCurrentSpeech = null;
      audio.pause();
      if (error) reject(error); else resolve();
    };
    const stop = () => finish();
    const onAbort = () => finish(new DOMException('Lecture annulée', 'AbortError'));
    finishCurrentSpeech = stop;
    signal?.addEventListener('abort', onAbort, { once: true });
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error('Lecture impossible. Touchez Réécouter.'));
    audio.play().catch(() => finish(new Error('Touchez Réécouter pour lancer la lecture.')));
  });
}

// ---------------------------------------------------------------------------
// Listening
// ---------------------------------------------------------------------------

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function hasFrenchRecognition(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Browser speech recognition (Chrome, Edge, Safari). Resolves with the final text. */
export function recognizeFrench(opts: {
  onInterim?: (text: string) => void;
  signal?: AbortSignal;
  finishSignal?: AbortSignal;
}): Promise<{ text: string; confidence: number }> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, new () => RecognitionLike>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return reject(new Error('Dictée vocale non disponible dans ce navigateur.'));
    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    let confidence = 0;
    const cancel = () => rec.abort();
    const stop = () => rec.stop();
    const cleanup = () => { opts.signal?.removeEventListener('abort', cancel); opts.finishSignal?.removeEventListener('abort', stop); };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
          confidence = Math.max(confidence, r[0].confidence || 0);
        } else {
          interim += r[0].transcript;
        }
      }
      opts.onInterim?.((finalText + ' ' + interim).trim());
    };
    rec.onerror = (e) => {
      cleanup();
      if (e.error === 'no-speech' || e.error === 'aborted') resolve({ text: '', confidence: 0 });
      else reject(new Error(e.error === 'not-allowed' ? 'Autorisez le micro pour parler à DUNYA.' : `Dictée : ${e.error}`));
    };
    rec.onend = () => { cleanup(); resolve({ text: finalText.trim(), confidence }); };
    opts.signal?.addEventListener('abort', cancel, { once: true });
    opts.finishSignal?.addEventListener('abort', stop, { once: true });
    if (opts.signal?.aborted) return resolve({ text: '', confidence: 0 });
    rec.start();
  });
}

/** Records one utterance; stops after a silence. Null when nothing was said. */
export async function recordUtterance(opts: {
  onLevel?: (level: number) => void;
  onSpeechStart?: () => void;
  minLevel?: number;
  silenceMs?: number;
  maxMs?: number;
  noSpeechMs?: number;
  signal?: AbortSignal;
  finishSignal?: AbortSignal;
}): Promise<Blob | null> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Ce navigateur ne permet pas l’enregistrement. Joignez un vocal ou écrivez.');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  if (opts.signal?.aborted || opts.finishSignal?.aborted) { stream.getTracks().forEach(t => t.stop()); return null; }
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const minLevel = opts.minLevel ?? 0.025;
  const silenceMs = opts.silenceMs ?? 1300;
  const maxMs = opts.maxMs ?? 25000;
  const noSpeechMs = opts.noSpeechMs ?? 8000;
  const buf = new Float32Array(analyser.fftSize);
  const started = performance.now();
  let lastVoice = 0;
  let voiceMs = 0;
  let heard = false;
  let previous = started;

  return new Promise<Blob | null>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (recorder.state !== 'inactive') recorder.stop();
    };
    recorder.onstop = () => {
      opts.signal?.removeEventListener('abort', cancel);
      opts.finishSignal?.removeEventListener('abort', finish);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => undefined);
      resolve(heard && chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null);
    };
    const cancel = () => {
      heard = false;
      finish();
    };
    opts.signal?.addEventListener('abort', cancel, { once: true });
    opts.finishSignal?.addEventListener('abort', finish, { once: true });
    recorder.start(250);
    const tick = () => {
      if (finished) return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      opts.onLevel?.(Math.min(1, rms * 8));
      if (rms > minLevel) {
        voiceMs += now - previous;
        lastVoice = now;
        if (!heard && voiceMs > 220) {
          heard = true;
          opts.onSpeechStart?.();
        }
      }
      previous = now;
      const elapsed = now - started;
      if (elapsed > maxMs) return finish();
      if (heard && now - lastVoice > silenceMs) return finish();
      if (!heard && elapsed > noSpeechMs) return finish();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FRENCH_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'est', 'je', 'tu', 'il', 'elle', 'nous', 'vous',
  'que', 'qui', 'quoi', 'comment', 'pour', 'dans', 'sur', 'avec', 'pas', 'mon', 'ma', 'mes', 'ce', 'ça',
  'bonjour', 'merci', 'pourquoi', 'quand', 'quel', 'quelle', 'combien', 'peux', 'veux', 'fait',
]);

/** True when a browser transcript really looks like French. */
export function looksFrench(text: string, confidence: number): boolean {
  const words = text.toLowerCase().split(/[^a-zàâçéèêëîïôûùüÿœ']+/).filter(Boolean);
  if (!words.length) return false;
  const hits = words.filter((w) => FRENCH_WORDS.has(w)).length;
  return hits >= 2 || (hits >= 1 && confidence >= 0.75) || (words.length >= 4 && confidence >= 0.85);
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

