import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Captions, CaptionsOff, Copy, Keyboard, Menu, Mic, MoreHorizontal, Paperclip, Pause, Play, RotateCcw, Send, Settings2, Square, Volume2, X } from 'lucide-react';
import { runServerVoice, voiceMessage, type VoiceEvent } from '@/lib/dunya/serverVoice';
import TranscriptionReview from '@/components/voice/TranscriptionReview';
import { replaceTranscriptDraft, type TranscriptRepair } from '@/lib/voice/transcriptionReview';
import { hasFrenchRecognition, loadHistory, loadPreference, MODE_LABEL, recognizeFrench,
  recordUtterance, saveHistory, savePreference, speakFrench, stopSpeaking, playUrl, pauseSpeaking, resumeSpeaking,
  wordIndexAtChar, wordSpans, type DunyaWebMode, type DunyaWebTurn } from '@/lib/dunya/voiceWeb';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
import { loadTranslationMemory, memoryTranslate } from '@/lib/translation/translationMemory';

type Props = { onOpenMenu?: () => void; offlineAnswer?: (question: string) => string };

/**
 * Offline text turn without any language mixing. French mode keeps the sourced French excerpt.
 * Baatɔnum translate ONLY through the attested memory (7,762 sentences, precached):
 * the answer is in the other language, or there is no answer at all, never a French excerpt.
 */
async function offlineTurn(text: string, lang: 'fr' | 'bba', mode: DunyaWebMode, excerpt?: (q: string) => string):
  Promise<{ text: string | null; lang: 'fr' | 'bba'; notice: string }> {
  if (mode === 'fr') {
    return { text: excerpt?.(text) ?? 'Aucune ressource locale disponible.', lang: 'fr', notice: 'Hors ligne · ressources locales' };
  }
  const hit = await memoryTranslate(text, lang === 'fr' ? 'fr-ba' : 'ba-fr').catch(() => null);
  if (hit?.translation) return { text: hit.translation, lang: lang === 'fr' ? 'bba' : 'fr', notice: 'Hors ligne · traduction de la mémoire attestée' };
  return { text: null, lang, notice: 'Hors ligne · cette phrase n’est pas dans la mémoire attestée. Reconnectez-vous pour la traduire.' };
}
const MODE_SHORT: Record<DunyaWebMode, string> = { fr: 'Français', bba: 'Baatɔnum' };
const MODE_TINY: Record<DunyaWebMode, string> = { fr: 'FR', bba: 'Baatɔnum' };
const SUGGESTIONS: Record<DunyaWebMode, string[]> = {
  fr: ['Rotation des cultures ?', 'Dire merci en baatɔnum'], bba: ['A kua', 'Bɛɛ ka weru'],
};
const uid = () => crypto.randomUUID();
const savedMode = (): DunyaWebMode => loadPreference<string>('mode', 'fr') === 'bba' ? 'bba' : 'fr';

export default function DunyaVoiceWeb({ onOpenMenu, offlineAnswer }: Props) {
  const [mode, setMode] = useState<DunyaWebMode>(savedMode);
  // Warm the attested memory while online so the offline Baatɔnum mode can answer.
  useEffect(() => { void loadTranslationMemory(); }, []);
  const [turns, setTurns] = useState<DunyaWebTurn[]>(() => loadHistory(savedMode()));
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0), [caption, setCaption] = useState('');
  const [activeWord, setActiveWord] = useState(-1);
  const [subCaption, setSubCaption] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [textView, setTextView] = useState(false), [draft, setDraft] = useState('');
  const [transcriptionReview, setTranscriptionReview] = useState<TranscriptRepair | null>(null), [selectedTranscript, setSelectedTranscript] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [handsFree, setHandsFree] = useState(() => loadPreference('handsFree', true));
  const [subtitles, setSubtitles] = useState(() => loadPreference('subtitles', true));
  const [frSubtitles, setFrSubtitles] = useState(() => loadPreference('frSubtitles', false));
  const [speechRate, setSpeechRate] = useState(() => loadPreference('speechRate', 1));
  const [reviewStt, setReviewStt] = useState(() => loadPreference('reviewStt', false));
  const [paused, setPaused] = useState(false), [moreOpen, setMoreOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connected, setConnected] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);
  const [diagnostic, setDiagnostic] = useState<{ request?: string; asr?: string; tts?: string; elapsed?: number }>({});
  const session = useRef(false), turnCounter = useRef(0), emptyListens = useRef(0);
  const abort = useRef<AbortController | null>(null), recordStop = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null), fileInput = useRef<HTMLInputElement | null>(null);
  const turnsRef = useRef(turns); turnsRef.current = turns;
  const audioCache = useRef(new Map<string, string[]>());
  const listenTurnRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { if (alive) setIsAdmin(false); return; }
      const { data: ok } = await supabase.rpc('has_role', { _user_id: data.session.user.id, _role: 'admin' });
      if (alive) setIsAdmin(ok === true);
    };
    void check().catch(() => undefined);
    const { data } = supabase.auth.onAuthStateChange(() => { setTimeout(() => void check().catch(() => undefined), 0); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => saveHistory(mode, turns), [mode, turns]);
  useEffect(() => {
    if (!moreOpen && !settingsOpen) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMoreOpen(false); setSettingsOpen(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [moreOpen, settingsOpen]);
  useEffect(() => {
    const sync = () => setConnected(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [turns, textView]);
  useEffect(() => () => {
    session.current = false; turnCounter.current++; abort.current?.abort(); stopSpeaking();
    audioCache.current.forEach(urls => urls.forEach(URL.revokeObjectURL));
  }, []);
  const interrupt = useCallback(() => {
    turnCounter.current++; abort.current?.abort(); abort.current = null; stopSpeaking(); setPaused(false);
  }, []);
  const endSession = useCallback(() => { session.current = false; interrupt(); setPhase('idle'); setStatus(null); }, [interrupt]);

  const performTurn = useCallback(async (input: { text?: string; audio?: Blob; lang: 'fr' | 'bba'; spoken: boolean; replayId?: string }) => {
    interrupt();
    const controller = new AbortController(); abort.current = controller;
    const turnId = turnCounter.current, assistantId = input.replayId ?? uid();
    const active = () => !controller.signal.aborted && turnId === turnCounter.current;
    let answer: DunyaWebTurn | undefined, playback = Promise.resolve(), playbackError = '', audioReceived = false;
    const cached: string[] = [];
    const rememberAudio = () => {
      if (!cached.length || !active() || audioCache.current.get(assistantId) === cached) return;
      audioCache.current.get(assistantId)?.forEach(URL.revokeObjectURL);
      audioCache.current.set(assistantId, cached);
      if (audioCache.current.size > 6) {
        const oldest = audioCache.current.keys().next().value!;
        audioCache.current.get(oldest)?.forEach(URL.revokeObjectURL); audioCache.current.delete(oldest);
      }
    };
    setPhase('thinking'); setCaption(''); setActiveWord(-1); setSubCaption(null); setNotice(null); setStatus(input.audio ? 'Je comprends…' : 'Je réfléchis…');
    setDiagnostic({});
    try {
      if (!navigator.onLine) {
        if (input.audio) throw new Error('Internet est nécessaire pour comprendre ce vocal.');
        const off = await offlineTurn(input.text ?? '', input.lang, mode, offlineAnswer);
        setTurns(t => [...t, { id: uid(), role: 'user', text: input.text ?? '', lang: input.lang, createdAt: Date.now() },
          ...(off.text ? [{ id: assistantId, role: 'assistant' as const, text: off.text, lang: off.lang, createdAt: Date.now() }] : [])]);
        setNotice(off.notice);
        if (off.text) {
          setCaption(off.text); setActiveWord(-1);
          if (off.lang === 'fr') {
            setPhase('speaking');
            const spans = wordSpans(off.text);
            await speakFrench(off.text, speechRate, (charIndex) => setActiveWord(wordIndexAtChar(spans, charIndex)));
          }
        }
        return;
      }
      await runServerVoice({
        text: input.text, audio: input.audio, lang: input.lang, replyLang: input.replayId ? input.lang : mode,
        history: turnsRef.current.map(t => ({ role: t.role, content: t.subtitle ?? t.text })),
        transcribeOnly: !!input.audio && reviewStt && !input.replayId, speechOnly: !!input.replayId,
        signal: controller.signal,
        onEvent(event: VoiceEvent) {
          if (!active()) return;
          setDiagnostic(d => ({ ...d, request: event.request_id, elapsed: event.elapsed_ms }));
          if (event.type === 'stage' && !audioReceived) {
            const labels: Record<string, string> = { waiting: 'Un instant…', transcribing: 'Je comprends…', analyzing_transcript: 'Je vérifie…', thinking: 'Je réfléchis…', synthesizing: 'Je prépare la voix…' };
            setStatus(labels[event.stage ?? ''] ?? null);
          }
          if (event.type === 'notice') setNotice(voiceMessage(event.code));
          if (event.type === 'transcript') {
            setDiagnostic(d => ({ ...d, asr: event.engine }));
            if (input.replayId) return;
            if (input.audio && reviewStt) {
              session.current = false; setDraft(event.text ?? ''); setTextView(true); setNotice('Vérifiez puis envoyez.');
              setSelectedTranscript(event.text ?? ''); setTranscriptionReview(event.repair ?? null);
            } else setTurns(t => [...t, { id: uid(), role: 'user', text: event.text ?? '', lang: event.lang ?? input.lang, createdAt: Date.now() }]);
          }
          if (event.type === 'answer') {
            answer = { id: assistantId, role: 'assistant', text: event.text ?? '', subtitle: event.subtitle, lang: event.lang ?? 'fr', createdAt: Date.now() };
            if (!input.replayId) setTurns(t => [...t, answer!]);
          }
          if (event.type === 'audio') {
            audioReceived = true;
            const audioUrl = event.audio_base64
              ? URL.createObjectURL(new Blob([Uint8Array.from(atob(event.audio_base64), c => c.charCodeAt(0))], { type: 'audio/wav' }))
              : event.audio_url;
            if (!audioUrl) return;
            cached.push(audioUrl);
            playback = playback.then(async () => {
              if (!active() || playbackError) return;
              const chunkText = event.text ?? '';
              const spans = wordSpans(chunkText);
              setPhase('speaking'); setStatus(null); setCaption(chunkText); setActiveWord(-1);
              setSubCaption(frSubtitles ? answer?.subtitle ?? null : null);
              setDiagnostic(d => ({ ...d, tts: event.engine }));
              await playUrl(audioUrl, controller.signal, (fraction) => setActiveWord(wordIndexAtChar(spans, Math.round(fraction * chunkText.length))), speechRate);
            }).catch(error => { if (active()) playbackError = error instanceof Error ? error.message : 'Touchez Réécouter.'; });
          }
        },
      });
      // The server may finish while playback is paused. Preserve the completed audio
      // before waiting for the speaker so Stop -> Replay never regenerates it.
      rememberAudio();
      await playback;
      if (!active()) return;
      if (answer?.lang === 'fr' && !audioReceived) {
        const spans = wordSpans(answer.text);
        setPhase('speaking'); setStatus(null); setCaption(answer.text); setActiveWord(-1); setDiagnostic(d => ({ ...d, tts: 'navigateur-fr' }));
        await speakFrench(answer.text, speechRate, (charIndex) => setActiveWord(wordIndexAtChar(spans, charIndex)));
      }
      if (playbackError) { session.current = false; setNotice(playbackError); }
    } catch (error) {
      await playback;
      if (!active()) return;
      session.current = false;
      // A transient network failure must not strand a text user on a blank
      // screen. This is a sourced dictionary excerpt, NOT a local LLM answer.
      if (!input.audio && !input.replayId && !answer && offlineAnswer && input.text?.trim() &&
          (!navigator.onLine || error instanceof TypeError)) {
        const off = await offlineTurn(input.text, input.lang, mode, offlineAnswer);
        setTurns(t => [...t, { id: uid(), role: 'user', text: input.text!, lang: input.lang, createdAt: Date.now() },
          ...(off.text ? [{ id: assistantId, role: 'assistant' as const, text: off.text, lang: off.lang, createdAt: Date.now() }] : [])]);
        if (off.text) setCaption(off.text);
        setNotice(mode === 'fr' ? 'Service injoignable · extrait du dictionnaire' : off.notice.replace('Hors ligne', 'Service injoignable'));
      } else {
        setNotice(error instanceof Error ? error.message : 'Service vocal indisponible.');
      }
    } finally {
      rememberAudio();
      if (cached.length && audioCache.current.get(assistantId) !== cached) cached.forEach(URL.revokeObjectURL);
      if (active()) {
        setStatus(null); setPhase('idle');
        if (session.current && handsFree && input.spoken) void listenTurnRef.current();
      }
    }
  }, [frSubtitles, handsFree, interrupt, mode, offlineAnswer, reviewStt, speechRate]);
  const runTurn = (text: string, lang: 'fr' | 'bba', spoken: boolean) => performTurn({ text, lang, spoken });

  const replay = async (turn: DunyaWebTurn) => {
    session.current = false; interrupt();
    const urls = audioCache.current.get(turn.id);
    if (!urls?.length) { await performTurn({ text: turn.text, lang: turn.lang, spoken: false, replayId: turn.id }); return; }
    const controller = new AbortController(); abort.current = controller;
    setPhase('speaking'); setCaption(turn.text); setNotice(null);
    try { for (const url of urls) { controller.signal.throwIfAborted(); await playUrl(url, controller.signal, undefined, speechRate); } }
    catch (error) { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Lecture indisponible.'); }
    finally { if (!controller.signal.aborted) setPhase('idle'); }
  };
  const listenTurn = useCallback(async () => {
    if (!session.current) return;
    const controller = new AbortController(); abort.current = controller;
    const finish = new AbortController(); recordStop.current = finish;
    setPhase('listening'); setCaption(''); setActiveWord(-1); setSubCaption(null); setLevel(0); setNotice(null);
    try {
      let text = '', audio: Blob | null = null, lang: 'fr' | 'bba' = mode === 'fr' ? 'fr' : 'bba';
      if (mode === 'fr' && hasFrenchRecognition()) {
        const result = await recognizeFrench({ onInterim: setCaption, signal: controller.signal, finishSignal: finish.signal }); text = result.text;
      } else audio = await recordUtterance({ onLevel: setLevel, signal: controller.signal, finishSignal: finish.signal });
      if (controller.signal.aborted || !session.current) return;
      if (!audio && !text.trim()) {
        if (++emptyListens.current < 2 && handsFree) void listenTurnRef.current();
        else { session.current = false; setPhase('idle'); setNotice('Je n’ai rien entendu. Réessayez.'); }
        return;
      }
      emptyListens.current = 0;
      await performTurn({ text: audio ? undefined : text, audio: audio ?? undefined, lang, spoken: true });
    } catch (error) {
      if (controller.signal.aborted) return;
      session.current = false; setPhase('idle'); setNotice(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Autorisez le micro dans le navigateur.' : error instanceof Error ? error.message : 'Microphone indisponible.');
    }
  }, [handsFree, mode, performTurn]);
  listenTurnRef.current = listenTurn;
  const onOrb = async () => {
    if (phase === 'listening') { recordStop.current?.abort(); return; }
    if (phase === 'thinking') { endSession(); return; }
    if (phase === 'speaking') { interrupt(); session.current = true; void listenTurn(); return; }
    session.current = true; emptyListens.current = 0; void listenTurn();
  };
  const sendText = async () => {
    const text = draft.trim(); if (!text) return;
    setDraft(''); setTranscriptionReview(null); session.current = false;
    await runTurn(text, mode, false);
  };
  const changeMode = (next: DunyaWebMode) => { endSession(); setMode(next); savePreference('mode', next); setTurns(loadHistory(next)); };
  const setPref = <T,>(key: string, value: T, setter: (v: T) => void) => { setter(value); savePreference(key, value); };
  const uploadVoice = async (file?: File) => {
    if (!file) return;
    session.current = false;
    await performTurn({ audio: file, lang: mode === 'fr' ? 'fr' : 'bba', spoken: false });
  };

  const label =
    phase === 'listening' ? 'Je vous écoute'
      : phase === 'thinking' ? status ?? 'Je réfléchis…'
        : phase === 'speaking' ? 'Appuyez pour interrompre'
          : 'Appuyez pour parler';

  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant');
  const lastUser = [...turns].reverse().find((t) => t.role === 'user')?.text ?? '';
  const busy = phase !== 'idle';

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
      style={{ background: 'radial-gradient(120% 70% at 50% 38%, #2A2135 0%, #15111C 55%, #0E0B13 100%)' }}>
      <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3 md:px-6 md:pt-5">
        {onOpenMenu && (
          <IconButton label="Menu" onClick={onOpenMenu} className="md:hidden"><Menu className="h-5 w-5" /></IconButton>
        )}
        <div role="radiogroup" aria-label="Langue de DUNYA" className="flex min-w-0 rounded-full bg-white/[0.10] p-1 ring-1 ring-white/25">
          {(Object.keys(MODE_SHORT) as DunyaWebMode[]).map((m) => (
            <button key={m} role="radio" aria-checked={m === mode} onClick={() => m !== mode && changeMode(m)}
              aria-label={MODE_SHORT[m]}
              className={`min-h-11 whitespace-nowrap rounded-full px-3 text-[15px] font-extrabold transition-colors sm:px-5 sm:text-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55] ${m === mode ? 'bg-[#F0BC55] text-[#16121C] shadow-[0_2px_10px_rgba(240,188,85,0.35)]' : 'text-white/90 hover:bg-white/10'}`}>
              <span className="sm:hidden">{MODE_TINY[m]}</span><span className="hidden sm:inline">{MODE_SHORT[m]}</span>
            </button>
          ))}
        </div>
        {!connected && <span className="rounded-full bg-[#F0BC55]/20 px-3 py-1.5 text-[13px] font-extrabold text-[#FFD98A] ring-1 ring-[#F0BC55]/40">Hors ligne</span>}
        <div className="flex-1" />
        <input ref={fileInput} type="file" accept="audio/*,.webm,.wav,.m4a,.mp3,.ogg" className="hidden" aria-label="Choisir un vocal" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void uploadVoice(file); }} />
        <button onClick={() => setTextView((v) => !v)} aria-label={textView ? 'Voix' : 'Écrire'} title={textView ? 'Voix' : 'Écrire'}
          className={`hidden h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[16px] font-extrabold ring-1 ring-white/25 transition-colors sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55] ${textView ? 'bg-white text-[#16121C]' : 'bg-white/[0.12] text-white hover:bg-white/[0.18]'}`}>
          {textView ? <Mic className="h-[18px] w-[18px]" /> : <Keyboard className="h-[18px] w-[18px]" />}
          <span>{textView ? 'Voix' : 'Écrire'}</span>
        </button>
        <div className="relative">
          <IconButton label="Plus d’options" onClick={() => setMoreOpen((v) => !v)}><MoreHorizontal className="h-5 w-5" /></IconButton>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-[120]" onClick={() => setMoreOpen(false)} />
              <div role="menu" className="absolute right-0 top-12 z-[130] w-60 overflow-hidden rounded-2xl bg-[#221C2B] p-1.5 shadow-2xl ring-1 ring-white/10">
                <MenuItem icon={<Paperclip className="h-4 w-4" />} label="Envoyer un vocal" onClick={() => { setMoreOpen(false); fileInput.current?.click(); }} />
                <MenuItem icon={<RotateCcw className="h-4 w-4" />} label="Nouvelle conversation" onClick={() => { setMoreOpen(false); endSession(); setTurns([]); saveHistory(mode, []); }} />
                <MenuItem icon={<Settings2 className="h-4 w-4" />} label="Réglages" onClick={() => { setMoreOpen(false); setSettingsOpen(true); }} />
              </div>
            </>
          )}
        </div>
      </header>

      {textView ? (
        <div ref={scroller} className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-2">
          {turns.length === 0 && <div className="mt-16 text-center"><p className="text-2xl font-extrabold text-white">Écrivez votre message</p><p className="mx-auto mt-2 max-w-xs text-[17px] leading-7 text-white/80">{mode === 'bba' ? 'DUNYA répond en baatɔnum.' : 'DUNYA répond en français.'}</p></div>}
          {turns.map((t) => t.role === 'user' ? (
            <article key={t.id} className="ml-auto max-w-[85%] rounded-[24px] rounded-br-md bg-[#F0BC55] px-5 py-3 text-[#16121C] shadow-[0_6px_18px_-8px_rgba(240,188,85,0.6)]">
              <p className="whitespace-pre-wrap text-[17px] font-semibold leading-7">{t.text}</p>
            </article>
          ) : (
            <article key={t.id} className="mr-auto max-w-[90%]">
              <div className="rounded-[24px] rounded-bl-md bg-white/[0.12] px-5 py-3.5 ring-1 ring-white/25">
                <p className="whitespace-pre-wrap text-[18px] leading-[1.65] text-white">{t.text}</p>
                {t.subtitle && frSubtitles && <p className="mt-2.5 border-t border-white/20 pt-2.5 text-[16px] leading-6 text-white/80">{t.subtitle}</p>}
              </div>
              <div className="mt-1.5 flex gap-2 pl-1">
                <SmallAction label="Écouter" onClick={() => void replay(t)}><Volume2 className="h-4 w-4" /></SmallAction>
                <SmallAction label="Copier" onClick={() => void navigator.clipboard?.writeText(t.text)}><Copy className="h-4 w-4" /></SmallAction>
              </div>
            </article>
          ))}
          {transcriptionReview && <TranscriptionReview report={transcriptionReview} selected={selectedTranscript} onChoose={text => { const result = replaceTranscriptDraft(draft, selectedTranscript, text); if (result.replaced) { setDraft(result.text); setSelectedTranscript(text); } return result.replaced; }} />}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center px-5">
          <div className="flex-1" />
          <button onClick={() => void onOrb()} aria-label={label} className="relative grid place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#E3B04B]/50">
            <Orb phase={phase} level={level} />
          </button>
          <div className="mt-6 flex items-center gap-2">
            <p className="text-center text-[26px] font-extrabold leading-tight tracking-tight text-white" role="status" aria-live="polite">{label}</p>
            {phase === 'listening' && <LiveBadge />}
          </div>
          {phase === 'listening' && <Waveform />}
          {phase === 'idle' && <p className="mt-1.5 max-w-xs text-center text-[17px] leading-7 text-white/80">{mode === 'bba' ? 'Parlez en baatɔnum.' : 'Parlez en français.'}</p>}
          {lastAssistant && phase !== 'listening' && (
            <div className="mt-4 flex gap-2">
              <Pill onClick={() => void replay(lastAssistant)}><Volume2 className="h-4 w-4" />Réécouter</Pill>
              {phase === 'speaking' && (
                <Pill onClick={() => { if (paused) resumeSpeaking(); else pauseSpeaking(); setPaused(!paused); }}>
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? 'Reprendre' : 'Pause'}
                </Pill>
              )}
            </div>
          )}
          <div className="flex-1" />
          {subtitles && (caption || (phase === 'thinking' && lastUser)) && (
            <div key={phase} className="mx-auto mb-4 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-1 text-center duration-300">
              {phase === 'thinking' && lastUser && <p className="line-clamp-2 text-[17px] leading-7 text-white/80">« {lastUser} »</p>}
              {caption && (
                <KaraokeText text={caption} activeWord={activeWord}
                  mode={phase === 'speaking' ? 'karaoke' : phase === 'listening' && mode !== 'bba' ? 'live' : 'plain'} />
              )}
              {subCaption && <p className="mt-3 line-clamp-4 text-[18px] leading-7 text-white/80">{subCaption}</p>}
            </div>
          )}
          {turns.length === 0 && phase === 'idle' && (
            <div className="mb-4 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS[mode].map((s) => (
                <button key={s}
                  onClick={() => void runTurn(s, mode, false)}
                  className="min-h-12 rounded-full bg-white/[0.10] px-5 py-3 text-[16px] font-bold text-white ring-1 ring-white/25 hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55]">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {notice && <p role="status" aria-live="polite" className="mx-4 mb-2 rounded-2xl bg-[#F0BC55]/15 px-4 py-2.5 text-center text-[15px] font-bold leading-6 text-[#FFD98A] ring-1 ring-[#F0BC55]/35 sm:mx-auto sm:max-w-xl">{notice}</p>}
      {textView ? (
        <footer className="mx-auto flex w-full max-w-3xl items-end gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-1.5">
          <button onClick={() => setTextView(false)} aria-label="Voix" title="Voix" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[#16121C] ring-1 ring-white/25 sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55]"><Mic className="h-6 w-6" /></button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendText(); } }}
            rows={1}
            placeholder={mode === 'bba' ? 'Écrire en baatɔnum…' : 'Écrire à DUNYA…'}
            className="max-h-36 min-h-[56px] flex-1 resize-none rounded-[28px] bg-white/[0.12] px-5 py-4 text-[17px] leading-6 text-white outline-none ring-1 ring-white/25 placeholder:text-white/60 focus:ring-2 focus:ring-[#F0BC55]"
          />
          <button
            onClick={() => { if (phase === 'thinking') { turnCounter.current += 1; interrupt(); setPhase('idle'); } else void sendText(); }}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#F0BC55] text-[#16121C] shadow-[0_6px_18px_-6px_rgba(240,188,85,0.7)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55]"
            disabled={phase !== 'thinking' && !draft.trim()}
            aria-label={phase === 'thinking' ? 'Arrêter' : 'Envoyer'}
          >
            {phase === 'thinking' ? <Square className="h-6 w-6" /> : <Send className="h-6 w-6" />}
          </button>
        </footer>
      ) : (
        <footer className="mx-auto flex w-full max-w-md flex-wrap items-center justify-center gap-3 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-1">
          <button onClick={() => setTextView(true)} aria-label="Écrire" className="flex min-h-12 items-center gap-2 rounded-full bg-[#F0BC55] px-6 text-[16px] font-extrabold text-[#16121C] shadow-[0_6px_18px_-6px_rgba(240,188,85,0.7)] sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55]"><Keyboard className="h-5 w-5" />Écrire</button>
          <Pill onClick={() => setPref('subtitles', !subtitles, setSubtitles)} active={subtitles} aria-pressed={subtitles}>
            {subtitles ? <Captions className="h-4 w-4" /> : <CaptionsOff className="h-4 w-4" />}Sous-titres
          </Pill>
          {busy && <Pill onClick={endSession} danger><X className="h-4 w-4" />Arrêter</Pill>}
        </footer>
      )}

      {settingsOpen && (
        <Sheet onClose={() => setSettingsOpen(false)}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#16121C]">Réglages</h2>
            <button onClick={() => setSettingsOpen(false)} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5"><X className="h-5 w-5 text-[#16121C]" /></button>
          </div>
          <div className="mt-2 divide-y divide-[#E8E1CF] text-[#16121C]">
            <Toggle label="Mains libres" value={handsFree} onChange={(v) => setPref('handsFree', v, setHandsFree)} />
            <Toggle label="Sous-titres" value={subtitles} onChange={(v) => setPref('subtitles', v, setSubtitles)} />
            <Toggle label="Traduction en français" value={frSubtitles} onChange={(v) => setPref('frSubtitles', v, setFrSubtitles)} />
            <Toggle label="Relire avant envoi" value={reviewStt} onChange={(v) => setPref('reviewStt', v, setReviewStt)} />
            <div className="flex min-h-14 items-center justify-between gap-2 py-2">
              <span className="shrink-0 text-[16px] font-semibold">Vitesse</span>
              <div className="flex min-w-0 items-center gap-2">
                <input type="range" min={0.7} max={1.3} step={0.1} value={speechRate} aria-label="Vitesse de la voix"
                  onChange={(e) => setPref('speechRate', Number(e.target.value), setSpeechRate)}
                  className="h-2 w-20 min-w-0 accent-[#E3B04B]" />
                <span className="w-10 shrink-0 text-right text-[14px] font-bold tabular-nums">{Math.round(speechRate * 100)}%</span>
              </div>
            </div>
          </div>
          {isAdmin && <div className="mt-4 rounded-2xl bg-[#EFE8D6] p-3 text-[12px] leading-5 text-[#4A4356]" aria-label="Diagnostic vocal réel">
            <p><b>Échange :</b> {diagnostic.request ?? '—'}</p>
            <p><b>Reconnaissance :</b> {diagnostic.asr ?? '—'} · <b>Voix :</b> {diagnostic.tts ?? '—'}</p>
            <p><b>Serveur :</b> {diagnostic.elapsed == null ? '—' : `${(diagnostic.elapsed / 1000).toFixed(2)} s`} · MMS-TTS CC BY-NC 4.0</p>
          </div>}
        </Sheet>
      )}
    </div>
  );
}

function Orb({ phase, level }: { phase: Phase; level: number }) {
  const palette: Record<Phase, [string, string, string]> = {
    idle: ['#FFE3A3', '#E3B04B', '#7A4A12'],
    listening: ['#FFE9B8', '#F2A94A', '#9A4A14'],
    thinking: ['#D9D2FF', '#8E7CFF', '#3A2A9C'],
    speaking: ['#C9F5DF', '#4FC892', '#155E4A'],
  };
  const [light, mid, deep] = palette[phase];
  const scale = phase === 'listening' ? 1 + Math.min(level, 1) * 0.28 : 1;
  return (
    <div className="relative grid h-[230px] w-[230px] place-items-center md:h-[270px] md:w-[270px]">
      <div className="absolute inset-0 rounded-full blur-3xl transition-all duration-300"
        style={{ background: mid, opacity: phase === 'idle' ? 0.18 : 0.32, transform: `scale(${0.8 + (scale - 1) * 1.6})` }} />
      {(phase === 'listening' || phase === 'speaking') && (
        <>
          <span className="absolute h-44 w-44 animate-ping motion-reduce:animate-none rounded-full md:h-52 md:w-52" style={{ border: `2px solid ${mid}`, opacity: 0.35, animationDuration: '2.2s' }} />
          <span className="absolute h-44 w-44 animate-ping motion-reduce:animate-none rounded-full md:h-52 md:w-52" style={{ border: `1px solid ${mid}`, opacity: 0.25, animationDuration: '2.2s', animationDelay: '1.1s' }} />
        </>
      )}
      {phase === 'thinking' && (
        <span className="absolute h-[196px] w-[196px] animate-spin motion-reduce:animate-none rounded-full md:h-[226px] md:w-[226px]"
          style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${mid} 90deg, transparent 180deg)`, animationDuration: '1.6s',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))' }} />
      )}
      <div className="relative h-40 w-40 rounded-full transition-[transform,background] duration-200 md:h-48 md:w-48"
        style={{
          transform: `scale(${scale})`,
          background: `radial-gradient(circle at 32% 28%, ${light} 0%, ${mid} 38%, ${deep} 100%)`,
          boxShadow: `0 24px 60px -12px ${mid}88, inset 0 -14px 30px ${deep}AA, inset 0 6px 18px #FFFFFF40`,
        }}>
        <div className="absolute left-[22%] top-[14%] h-[26%] w-[36%] rounded-full bg-white/35 blur-md" />
        {phase === 'idle' && <Mic aria-hidden className="absolute inset-0 m-auto h-14 w-14 text-[#16121C]/75" strokeWidth={2.2} />}
      </div>
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5C78]/15 px-2.5 py-1 ring-1 ring-[#FF6E82]/40">
      <span className="h-1.5 w-1.5 rounded-full bg-[#FF5C78] motion-safe:animate-pulse" aria-hidden="true" />
      <span className="text-[11px] font-extrabold tracking-wide text-[#FFC2CF]">DIRECT</span>
    </span>
  );
}

/** Décoratif : donne une impression d'écoute vivante pendant la capture micro. */
function Waveform() {
  const heights = [10, 18, 24, 14, 22, 12, 19];
  return (
    <div className="mt-2 flex items-end gap-1" style={{ height: 26 }} aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} className="w-1 rounded-full bg-[#F2A94A] motion-safe:animate-bounce"
          style={{ height: h, animationDelay: `${i * 0.12}s`, animationDuration: '1s' }} />
      ))}
    </div>
  );
}

/**
 * Affiche un texte mot par mot : surlignage karaoké en synchronisation avec la lecture
 * (`karaoke`), derniers mots atténués pendant qu'ils se forment en reconnaissance vocale
 * live (`live`), ou texte simple (`plain`).
 */
function KaraokeText({ text, activeWord, mode }: { text: string; activeWord: number; mode: 'karaoke' | 'live' | 'plain' }) {
  if (mode === 'plain') {
    return <p className="line-clamp-6 text-[24px] font-bold leading-[1.35] text-white md:text-[30px]">{text}</p>;
  }
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <p className="line-clamp-6 text-[24px] font-bold leading-[1.35] md:text-[30px]">
      {words.map((word, i) => {
        const className =
          'transition-colors duration-300 ease-out ' + (
            mode === 'karaoke'
              ? i === activeWord ? 'rounded-md bg-[#4FC892] px-1.5 py-0.5 font-extrabold text-[#0E1813]'
                : i > activeWord ? 'text-white/45' : 'text-white'
              : i >= words.length - 2 ? 'text-white/45' : 'text-white');
        return (
          <span key={i}>
            <span className={className}>{word}</span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
      {mode === 'live' && <span className="ml-0.5 inline-block h-5 w-[2px] translate-y-[3px] bg-white/45 motion-safe:animate-pulse" aria-hidden="true" />}
    </p>
  );
}

function IconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.12] ring-1 ring-white/25 hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55] ${className}`}>
      {children}
    </button>
  );
}

function Pill({ children, onClick, active = true, danger, ...rest }: { children: ReactNode; onClick: () => void; active?: boolean; danger?: boolean; 'aria-pressed'?: boolean }) {
  return (
    <button onClick={onClick} {...rest}
      className={`flex min-h-12 items-center gap-2 rounded-full px-5 text-[16px] font-extrabold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55] ${danger ? 'bg-[#D4503F] text-white ring-[#D4503F]' : active ? 'bg-white/[0.14] text-white ring-white/30 hover:bg-white/[0.2]' : 'bg-transparent text-white/80 ring-white/25'}`}>
      {children}
    </button>
  );
}

function SmallAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex min-h-11 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-[15px] font-bold text-white/90 ring-1 ring-white/20 hover:bg-white/[0.16] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55]">
      {children}{label}
    </button>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[16px] font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0BC55]">
      <span className="text-[#E3B04B]">{icon}</span>{label}
    </button>
  );
}

function Sheet({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] grid place-items-end bg-black/50 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <section role="dialog" aria-modal="true"
        className="w-full max-w-md rounded-t-[28px] bg-[#F8F4EA] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}>
        {children}
      </section>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 text-[16px] font-semibold">
      <span>{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" role="switch" checked={value} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-7 w-12 rounded-full bg-[#D6CDB8] transition-colors peer-checked:bg-[#16121C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#E3B04B]" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
