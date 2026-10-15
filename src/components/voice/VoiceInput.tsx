import { useEffect, useRef, useState } from 'react';
import { FileAudio, Loader2, Mic, RotateCcw, Square, X } from 'lucide-react';
import { runServerVoice } from '@/lib/dunya/serverVoice';
import { claimVoice, VOICE_FOCUS_EVENT, type SpeechLanguage } from '@/lib/voice/replySpeech';

type Phase = 'idle' | 'permission' | 'recording' | 'transcribing';
export default function VoiceInput({ lang, onTranscript, disabled = false, onBusyChange }: {
  lang: SpeechLanguage; onTranscript: (text: string) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle'), [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null), [preview, setPreview] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null);
  const abort = useRef<AbortController | null>(null), generation = useRef(0), mounted = useRef(true);
  const owner = useRef(crypto.randomUUID());
  const previewAudio = useRef<HTMLAudioElement | null>(null), file = useRef<HTMLInputElement | null>(null);
  const cleanupMic = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  const cancel = () => {
    generation.current++; abort.current?.abort(); abort.current = null;
    if (recorder.current?.state === 'recording') recorder.current.stop();
    recorder.current = null; cleanupMic(); setPhase('idle');
  };
  useEffect(() => {
    mounted.current = true;
    const focus = (event: Event) => { if ((event as CustomEvent).detail !== owner.current) previewAudio.current?.pause(); };
    window.addEventListener(VOICE_FOCUS_EVENT, focus);
    return () => { mounted.current = false; generation.current++; abort.current?.abort(); if (recorder.current?.state === 'recording') recorder.current.stop(); cleanupMic(); window.removeEventListener(VOICE_FOCUS_EVENT, focus); };
  }, []);
  useEffect(() => { onBusyChange?.(phase !== 'idle'); return () => onBusyChange?.(false); }, [phase, onBusyChange]);
  useEffect(() => {
    if (!blob) { setPreview(''); return; }
    const url = URL.createObjectURL(blob); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [blob]);
  useEffect(() => {
    if (phase !== 'recording') return;
    const start = Date.now();
    const timer = window.setInterval(() => { const elapsed = Math.floor((Date.now() - start) / 1000); setSeconds(elapsed); if (elapsed >= 120) recorder.current?.stop(); }, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  const transcribe = async (audio: Blob, ticket = ++generation.current) => {
    if (audio.size > 20_000_000) { setError('Ce fichier dépasse 20 Mo. Choisissez un vocal de deux minutes maximum.'); setPhase('idle'); return; }
    setError(''); setNotice(''); setPhase('transcribing');
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    let transcript = '', engine = '';
    try {
      await runServerVoice({ audio, lang, transcribeOnly: true, signal: controller.signal, onEvent(event) {
        if (event.type === 'transcript') { transcript = event.text?.trim() || ''; engine = event.engine || ''; }
        if (event.type === 'stage' && event.stage === 'waiting' && ticket === generation.current) setNotice('Le service termine un autre vocal…');
      } });
      if (ticket !== generation.current || !mounted.current) return;
      if (!transcript) throw new Error('Aucune parole reconnue. Réessayez en parlant plus près du micro.');
      onTranscript(transcript);
      setNotice(`${engine === 'meta-asr-300m' ? 'Omnilingual' : 'Reconnaissance FITILA de secours'} · texte ajouté. Relisez puis envoyez.`);
    } catch (reason) {
      if (!controller.signal.aborted && ticket === generation.current && mounted.current) setError(reason instanceof Error ? reason.message : 'Transcription impossible. Réessayez.');
    } finally { if (ticket === generation.current && mounted.current) setPhase('idle'); }
  };
  const start = async () => {
    setError(''); setNotice(''); setSeconds(0); setPhase('permission'); previewAudio.current?.pause(); claimVoice(owner.current);
    const ticket = ++generation.current;
    try {
      if (!navigator.onLine) throw new Error('La dictée nécessite une connexion. Vous pouvez toujours écrire.');
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Le micro n’est pas disponible ici. Importez un fichier vocal.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (ticket !== generation.current || !mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(value => MediaRecorder.isTypeSupported(value));
      const current = new MediaRecorder(media, mime ? { mimeType: mime } : undefined); recorder.current = current;
      const chunks: Blob[] = []; let bytes = 0;
      current.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); bytes += event.data.size; if (bytes > 20_000_000 && current.state === 'recording') current.stop(); } };
      current.onstop = () => {
        cleanupMic(); recorder.current = null;
        if (ticket !== generation.current || !mounted.current) return;
        const audio = new Blob(chunks, { type: current.mimeType || 'audio/webm' }); setBlob(audio);
        if (!audio.size) { setError('Aucun son enregistré. Réessayez.'); setPhase('idle'); return; }
        void transcribe(audio, ticket);
      };
      current.onerror = () => { if (ticket === generation.current) { cancel(); setError('L’enregistrement a été interrompu. Réessayez.'); } };
      current.start(500); setPhase('recording');
    } catch (reason) {
      cleanupMic(); if (ticket !== generation.current || !mounted.current) return;
      const name = reason instanceof Error ? reason.name : '';
      setError(name === 'NotAllowedError' ? 'Autorisez le microphone dans votre navigateur, ou importez un vocal.' : name === 'NotFoundError' ? 'Aucun microphone trouvé. Importez un vocal.' : reason instanceof Error ? reason.message : 'Microphone indisponible.'); setPhase('idle');
    }
  };
  const busy = phase !== 'idle';
  return <section aria-label="Saisie vocale" className="min-w-0 rounded-2xl border border-[#E4DFCC] bg-white p-2.5">
    <div className="flex flex-wrap items-center gap-2">
      {phase === 'recording' ? <button type="button" onClick={() => recorder.current?.stop()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#A44335] px-3 text-xs font-bold text-white"><Square className="h-4 w-4" />Terminer · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</button>
        : <button type="button" onClick={() => void start()} disabled={disabled || busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F3E3B9] px-3 text-xs font-bold text-[#694A16] disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}{phase === 'transcribing' ? 'Transcription…' : phase === 'permission' ? 'Accès au micro…' : 'Dicter'}</button>}
      {busy ? <button type="button" onClick={cancel} aria-label="Annuler le vocal" className="grid h-11 w-11 place-items-center rounded-xl border border-[#E4DFCC]"><X className="h-4 w-4" /></button>
        : <button type="button" onClick={() => file.current?.click()} disabled={disabled} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs text-[#716B5F] disabled:opacity-60"><FileAudio className="h-4 w-4" />Importer un vocal</button>}
      <span className="ml-auto text-[10px] text-[#716B5F]">{lang === 'bba' ? 'Baatɔnum' : 'Français'} · 2 min max</span>
      <input ref={file} aria-label="Fichier vocal" type="file" accept="audio/*,.webm,.m4a,.wav,.mp3,.ogg" className="hidden" onChange={event => { const audio = event.target.files?.[0]; event.target.value = ''; if (audio) { previewAudio.current?.pause(); claimVoice(owner.current); setBlob(audio); void transcribe(audio); } }} />
    </div>
    {preview && <div className="mt-2 flex min-w-0 items-center gap-1.5"><audio ref={previewAudio} controls preload="metadata" src={preview} aria-label="Votre vocal" className="h-9 min-w-0 flex-1" onPlay={() => claimVoice(owner.current)} />{!busy && <button type="button" aria-label="Supprimer le vocal" onClick={() => { setBlob(null); setNotice(''); setError(''); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#716B5F]"><X className="h-4 w-4" /></button>}</div>}
    {notice && <p role="status" className="mt-2 text-[11px] text-[#3F6E52]">{notice}</p>}
    {error && <div role="alert" className="mt-2 text-xs text-[#9C3C30]"><p>{error}</p>{blob && !busy && <button type="button" onClick={() => void transcribe(blob)} className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#E5BCB5] px-2 font-bold"><RotateCcw className="h-3 w-3" />Réessayer la transcription</button>}</div>}
  </section>;
}
