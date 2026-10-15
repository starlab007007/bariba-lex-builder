import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Captions, CaptionsOff, Check, ChevronDown, Copy, Languages, Menu, MessageSquare, Mic, MicOff, Send, Settings2, Square, Volume2, X, Paperclip, Pause, Play } from 'lucide-react';
import { runServerVoice, voiceMessage, type VoiceEvent } from '@/lib/dunya/serverVoice';
import { hasFrenchRecognition, loadHistory, loadPreference, looksFrench, MODE_LABEL, recognizeFrench,
  recordUtterance, saveHistory, savePreference, speakFrench, stopSpeaking, playUrl, pauseSpeaking, resumeSpeaking,
  type DunyaWebMode, type DunyaWebTurn } from '@/lib/dunya/voiceWeb';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
type Props = { onOpenMenu?: () => void; offlineAnswer?: (question: string) => string };
const MODE_HINT: Record<DunyaWebMode, string> = {
  fr: 'DUNYA écoute et répond en français.', bba: 'DUNYA écoute et répond en baatɔnum.', both: 'DUNYA répond dans la langue de votre demande.',
};
const SUGGESTIONS: Record<DunyaWebMode, string[]> = {
  fr: ['Explique-moi la rotation des cultures', 'Comment dit-on merci en baatɔnum ?'], bba: ['A kua', 'Bɛɛ ka weru'], both: ['Comment dit-on merci en baatɔnum ?', 'A kua'],
};
const uid = () => crypto.randomUUID();

export default function DunyaVoiceWeb({ onOpenMenu, offlineAnswer }: Props) {
  const [mode, setMode] = useState<DunyaWebMode>(() => loadPreference('mode', 'fr'));
  const [turns, setTurns] = useState<DunyaWebTurn[]>(() => loadHistory(loadPreference('mode', 'fr')));
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0), [caption, setCaption] = useState('');
  const [subCaption, setSubCaption] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [textView, setTextView] = useState(false), [draft, setDraft] = useState('');
  const [modePicker, setModePicker] = useState(false), [settingsOpen, setSettingsOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(() => loadPreference('onboarded', false));
  const [handsFree, setHandsFree] = useState(() => loadPreference('handsFree', true));
  const [subtitles, setSubtitles] = useState(() => loadPreference('subtitles', true));
  const [frSubtitles, setFrSubtitles] = useState(() => loadPreference('frSubtitles', false));
  const [reviewStt, setReviewStt] = useState(() => loadPreference('reviewStt', false));
  const [muted, setMuted] = useState(false), [paused, setPaused] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
    setPhase('thinking'); setCaption(''); setSubCaption(null); setNotice(null); setStatus(input.audio ? 'Je vous comprends…' : 'Je prépare votre réponse…');
    setDiagnostic({});
    try {
      if (!navigator.onLine) {
        if (input.audio) throw new Error('Internet est nécessaire pour comprendre ce vocal.');
        const local = offlineAnswer?.(input.text ?? '') ?? 'Aucune ressource locale disponible.';
        setTurns(t => [...t, { id: uid(), role: 'user', text: input.text ?? '', lang: input.lang, createdAt: Date.now() },
          { id: assistantId, role: 'assistant', text: local, lang: 'fr', createdAt: Date.now() }]);
        setNotice('Hors ligne : extrait des ressources locales FITILA.'); setCaption(local); setPhase('speaking'); await speakFrench(local); return;
      }
      await runServerVoice({
        text: input.text, audio: input.audio, lang: input.lang, replyLang: input.replayId ? input.lang : mode === 'both' ? input.lang : mode,
        history: turnsRef.current.map(t => ({ role: t.role, content: t.subtitle ?? t.text })),
        transcribeOnly: !!input.audio && reviewStt && !input.replayId, speechOnly: !!input.replayId,
        signal: controller.signal,
        onEvent(event: VoiceEvent) {
          if (!active()) return;
          setDiagnostic(d => ({ ...d, request: event.request_id, elapsed: event.elapsed_ms }));
          if (event.type === 'stage' && !audioReceived) {
            const labels: Record<string, string> = { waiting: 'Un instant, je prépare la voix…', transcribing: 'Je vous comprends…', thinking: 'Je prépare votre réponse…', synthesizing: 'Je prépare la voix…' };
            setStatus(labels[event.stage ?? ''] ?? null);
          }
          if (event.type === 'notice') setNotice(voiceMessage(event.code));
          if (event.type === 'transcript') {
            setDiagnostic(d => ({ ...d, asr: event.engine }));
            if (input.replayId) return;
            if (input.audio && reviewStt) {
              session.current = false; setDraft(event.text ?? ''); setTextView(true); setNotice('Vérifiez la transcription puis envoyez.');
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
              setPhase('speaking'); setStatus(null); setCaption(event.text ?? ''); setSubCaption(frSubtitles ? answer?.subtitle ?? null : null);
              setDiagnostic(d => ({ ...d, tts: event.engine }));
              await playUrl(audioUrl, controller.signal);
            }).catch(error => { if (active()) playbackError = error instanceof Error ? error.message : 'Touchez Réécouter.'; });
          }
        },
      });
      await playback;
      if (!active()) return;
      if (answer?.lang === 'fr' && !audioReceived) {
        setPhase('speaking'); setStatus(null); setCaption(answer.text); setDiagnostic(d => ({ ...d, tts: 'navigateur-fr' })); await speakFrench(answer.text);
      }
      if (playbackError) { session.current = false; setNotice(playbackError); }
    } catch (error) {
      await playback;
      if (!active()) return;
      session.current = false; setNotice(error instanceof Error ? error.message : 'Service vocal indisponible.');
    } finally {
      if (cached.length && active()) {
        audioCache.current.get(assistantId)?.forEach(URL.revokeObjectURL);
        audioCache.current.set(assistantId, cached);
        if (audioCache.current.size > 6) { const oldest = audioCache.current.keys().next().value!; audioCache.current.get(oldest)?.forEach(URL.revokeObjectURL); audioCache.current.delete(oldest); }
      } else if (cached.length) cached.forEach(URL.revokeObjectURL);
      if (active()) {
        setStatus(null); setPhase('idle');
        if (session.current && handsFree && input.spoken) void listenTurnRef.current();
      }
    }
  }, [frSubtitles, handsFree, interrupt, mode, offlineAnswer, reviewStt]);
  const runTurn = (text: string, lang: 'fr' | 'bba', spoken: boolean) => performTurn({ text, lang, spoken });

  const replay = async (turn: DunyaWebTurn) => {
    session.current = false; interrupt();
    const urls = audioCache.current.get(turn.id);
    if (!urls?.length) { await performTurn({ text: turn.text, lang: turn.lang, spoken: false, replayId: turn.id }); return; }
    const controller = new AbortController(); abort.current = controller;
    setPhase('speaking'); setCaption(turn.text); setNotice(null);
    try { for (const url of urls) { controller.signal.throwIfAborted(); await playUrl(url, controller.signal); } }
    catch (error) { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Lecture indisponible.'); }
    finally { if (!controller.signal.aborted) setPhase('idle'); }
  };
  const listenTurn = useCallback(async () => {
    if (!session.current || muted) return;
    const controller = new AbortController(); abort.current = controller;
    const finish = new AbortController(); recordStop.current = finish;
    setPhase('listening'); setCaption(''); setSubCaption(null); setLevel(0); setNotice(null);
    try {
      let text = '', audio: Blob | null = null, lang: 'fr' | 'bba' = mode === 'fr' ? 'fr' : 'bba';
      if (mode === 'fr' && hasFrenchRecognition()) {
        const result = await recognizeFrench({ onInterim: setCaption, signal: controller.signal, finishSignal: finish.signal }); text = result.text;
      } else if (mode === 'both' && hasFrenchRecognition()) {
        const [fr, blob] = await Promise.all([
          recognizeFrench({ onInterim: setCaption, signal: controller.signal, finishSignal: finish.signal }).catch(() => ({ text: '', confidence: 0 })),
          recordUtterance({ onLevel: setLevel, signal: controller.signal, finishSignal: finish.signal }),
        ]);
        if (fr.text && looksFrench(fr.text, fr.confidence)) { text = fr.text; lang = 'fr'; } else audio = blob;
      } else audio = await recordUtterance({ onLevel: setLevel, signal: controller.signal, finishSignal: finish.signal });
      if (controller.signal.aborted || !session.current) return;
      if (!audio && !text.trim()) {
        if (++emptyListens.current < 2 && handsFree) void listenTurnRef.current();
        else { session.current = false; setPhase('idle'); setNotice('Je n’ai pas entendu de voix. Touchez la sphère pour réessayer.'); }
        return;
      }
      emptyListens.current = 0;
      await performTurn({ text: audio ? undefined : text, audio: audio ?? undefined, lang, spoken: true });
    } catch (error) {
      if (controller.signal.aborted) return;
      session.current = false; setPhase('idle'); setNotice(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Autorisez le microphone dans votre navigateur pour parler à DUNYA.' : error instanceof Error ? error.message : 'Microphone indisponible.');
    }
  }, [handsFree, mode, muted, performTurn]);
  listenTurnRef.current = listenTurn;
  const onOrb = async () => {
    if (phase === 'listening') { recordStop.current?.abort(); return; }
    if (phase === 'thinking') { endSession(); return; }
    if (phase === 'speaking') { interrupt(); session.current = true; void listenTurn(); return; }
    if (muted) { setNotice('Réactivez le microphone pour parler.'); return; }
    session.current = true; emptyListens.current = 0; void listenTurn();
  };
  const sendText = async () => {
    const text = draft.trim(); if (!text) return;
    setDraft(''); session.current = false;
    await runTurn(text, mode === 'both' ? looksFrench(text, 0.9) ? 'fr' : 'bba' : mode, false);
  };
  const changeMode = (next: DunyaWebMode) => { endSession(); setMode(next); savePreference('mode', next); setTurns(loadHistory(next)); setModePicker(false); };
  const setPref = <T,>(key: string, value: T, setter: (v: T) => void) => { setter(value); savePreference(key, value); };
  const uploadVoice = async (file?: File) => {
    if (!file) return;
    session.current = false;
    await performTurn({ audio: file, lang: mode === 'fr' ? 'fr' : 'bba', spoken: false });
  };

  const label =
    phase === 'listening' ? 'Je vous écoute…'
      : phase === 'thinking' ? status ?? 'Je réfléchis…'
        : phase === 'speaking' ? 'Touchez pour m’interrompre'
          : muted ? 'Micro coupé' : 'Touchez la sphère pour parler';

  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant');
  const lastUser = [...turns].reverse().find((t) => t.role === 'user')?.text ?? '';

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white" style={{ background: '#17131F' }}>
      <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-3 sm:gap-2 md:px-5">
        {onOpenMenu && (
          <button onClick={onOpenMenu} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 md:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => setModePicker(true)} className="flex min-h-11 min-w-0 max-w-[104px] items-center gap-1 rounded-full bg-[#2A2433] px-2 py-2 text-sm font-extrabold sm:max-w-none sm:gap-2 sm:px-4">
          <Languages className="hidden h-4 w-4 shrink-0 text-[#D4A23A] sm:block" />
          <span className="truncate">{MODE_LABEL[mode]}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
        <span className="hidden rounded-full bg-[#52A47A]/15 px-3 py-1.5 text-[11px] font-extrabold text-[#8FD3A8] sm:inline">DUNYA IA · en ligne</span>
        <div className="flex-1" />
        <input ref={fileInput} type="file" accept="audio/*,.webm,.wav,.m4a,.mp3,.ogg" className="hidden" aria-label="Choisir un vocal" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void uploadVoice(file); }} />
        <button onClick={() => fileInput.current?.click()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Joindre un vocal"><Paperclip className="h-5 w-5" /></button>
        <button onClick={() => setTextView((v) => !v)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Conversation écrite">
          <MessageSquare className="h-5 w-5" />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/10" aria-label="Réglages">
          <Settings2 className="h-5 w-5" />
        </button>
      </header>

      {textView ? (
        <div ref={scroller} className="mx-auto w-full max-w-3xl flex-1 space-y-2 overflow-y-auto px-3 pb-3">
          {turns.length === 0 && <p className="mt-16 text-center text-white/70">Écrivez ou parlez à DUNYA.</p>}
          {turns.map((t) => (
            <article key={t.id} className={`rounded-2xl p-3.5 ${t.role === 'user' ? 'ml-12 bg-[#3A3146]' : 'mr-10 bg-[#241E2D]'}`}>
              <p className="whitespace-pre-wrap text-[15.5px] leading-6">{t.text}</p>
              {t.role === 'assistant' && t.subtitle && frSubtitles && <p className="mt-1.5 text-[13px] text-white/55">{t.subtitle}</p>}
              {t.role === 'assistant' && (
                <div className="mt-1.5 flex gap-1">
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
                    aria-label="Réécouter"
                    onClick={() => void replay(t)}
                  >
                    <Volume2 className="h-4 w-4 text-[#D4A23A]" />
                  </button>
                  <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" aria-label="Copier" onClick={() => void navigator.clipboard?.writeText(t.text)}>
                    <Copy className="h-4 w-4 text-white/55" />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center px-4">
          <div className="flex-1" />
          <button onClick={() => void onOrb()} aria-label={label} className="relative grid place-items-center outline-none">
            <Orb phase={phase} level={level} />
          </button>
          <p className="mt-5 text-base font-bold" role="status" aria-live="polite">{label}</p>
          {lastAssistant && <div className="mt-3 flex gap-2">
            <button onClick={() => void replay(lastAssistant)} className="flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm"><Volume2 className="h-4 w-4" />Réécouter</button>
            {phase === 'speaking' && <button onClick={() => { if (paused) resumeSpeaking(); else pauseSpeaking(); setPaused(!paused); }} className="flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? 'Reprendre' : 'Pause'}</button>}
          </div>}
          <div className="flex-1" />
          {subtitles && (
            <div className="mx-auto mb-3 max-w-2xl text-center">
              {phase === 'thinking' && lastUser && <p className="line-clamp-3 italic text-white/60">« {lastUser} »</p>}
              {caption && <p className="line-clamp-5 text-[19px] font-semibold leading-snug">{caption}</p>}
              {subCaption && <p className="mt-1.5 line-clamp-3 text-sm text-white/55">{subCaption}</p>}
            </div>
          )}
          {notice && <p role="status" aria-live="polite" className="mb-2 max-w-xl text-center text-[12.5px] text-[#E9C46A]">{notice}</p>}
          {turns.length === 0 && phase === 'idle' && (
            <div className="mb-3 flex max-w-full gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS[mode].map((s) => (
                <button
                  key={s}
                  onClick={() => void runTurn(s, mode === 'bba' ? 'bba' : looksFrench(s, 0.9) ? 'fr' : 'bba', false)}
                  className="shrink-0 rounded-full bg-[#2A2433] px-4 py-2 text-[13px]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {textView && notice && <p role="status" aria-live="polite" className="px-4 text-center text-sm text-[#E9C46A]">{notice}</p>}
      {textView ? (
        <footer className="mx-auto flex w-full max-w-3xl items-end gap-2 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendText();
              }
            }}
            rows={1}
            placeholder={mode === 'bba' ? 'Baatɔnum…' : 'Écrire à DUNYA…'}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-3xl bg-[#241E2D] px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/40"
          />
          <button
            onClick={() => {
              if (phase === 'thinking') {
                turnCounter.current += 1;
                interrupt();
                setPhase('idle');
              } else {
                void sendText();
              }
            }}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#D4A23A] text-[#17131F]"
            aria-label="Envoyer"
          >
            {phase === 'thinking' ? <Square className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </button>
        </footer>
      ) : (
        <footer className="mx-auto flex w-full max-w-md items-start justify-between px-8 pb-[max(14px,env(safe-area-inset-bottom))] pt-1">
          <RoundButton
            label={muted ? 'Micro coupé' : 'Micro'}
            active={!muted}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (next) endSession();
            }}
            icon={muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          />
          <RoundButton
            label="Sous-titres"
            active={subtitles}
            onClick={() => setPref('subtitles', !subtitles, setSubtitles)}
            icon={subtitles ? <Captions className="h-6 w-6" /> : <CaptionsOff className="h-6 w-6" />}
          />
          <RoundButton label="Terminer" active={session.current} danger onClick={endSession} icon={<X className="h-6 w-6" />} />
        </footer>
      )}

      {(modePicker || !onboarded) && (
        <Sheet onClose={onboarded ? () => setModePicker(false) : undefined}>
          <h2 className="text-xl font-black text-[#17131F]">{onboarded ? 'Langue de la conversation' : 'Bienvenue dans DUNYA'}</h2>
          <p className="mt-1 text-sm text-[#7D7566]">Chaque langue garde sa propre conversation.</p>
          <div className="mt-3 space-y-2">
            {(Object.keys(MODE_LABEL) as DunyaWebMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  changeMode(m);
                  if (!onboarded) {
                    setOnboarded(true);
                    savePreference('onboarded', true);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left ${m === mode && onboarded ? 'bg-[#17131F] text-white' : 'bg-white text-[#17131F]'}`}
              >
                <div className="flex-1">
                  <div className="text-base font-black">{MODE_LABEL[m]}</div>
                  <div className={`text-[12.5px] ${m === mode && onboarded ? 'text-white/70' : 'text-[#7D7566]'}`}>{MODE_HINT[m]}</div>
                </div>
                {m === mode && onboarded && <Check className="h-5 w-5 text-[#D4A23A]" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {settingsOpen && (
        <Sheet onClose={() => setSettingsOpen(false)}>
          <h2 className="text-xl font-black text-[#17131F]">Réglages DUNYA</h2>
          <div className="mt-3 space-y-1 text-[#17131F]">
            <Toggle label="Mains libres (DUNYA réécoute après chaque réponse)" value={handsFree} onChange={(v) => setPref('handsFree', v, setHandsFree)} />
            <Toggle label="Sous-titres en direct" value={subtitles} onChange={(v) => setPref('subtitles', v, setSubtitles)} />
            <Toggle label="Sous-titres français en mode baatɔnum" value={frSubtitles} onChange={(v) => setPref('frSubtitles', v, setFrSubtitles)} />
            <Toggle label="Vérifier la transcription baatɔnum avant envoi" value={reviewStt} onChange={(v) => setPref('reviewStt', v, setReviewStt)} />
          </div>
          <p className="mt-3 text-sm text-[#7D7566]">Parlez ou joignez un vocal. Le traitement est automatique, pour tous les utilisateurs. Internet est nécessaire pour les services vocaux en ligne.</p>
          {isAdmin && <div className="mt-3 rounded-xl bg-[#F4EFE0] p-3 text-[12px] text-[#4A4356]" aria-label="Diagnostic vocal réel">
            <p><b>Dernier échange :</b> {diagnostic.request ?? 'aucun'}</p>
            <p><b>Reconnaissance utilisée :</b> {diagnostic.asr ?? 'non exécutée'}</p>
            <p><b>Synthèse utilisée :</b> {diagnostic.tts ?? 'non exécutée'}</p>
            <p><b>Traitement serveur :</b> {diagnostic.elapsed == null ? '—' : `${(diagnostic.elapsed / 1000).toFixed(2)} s`}</p>
            <p>MMS-TTS : licence CC BY-NC 4.0.</p>
          </div>}
          <button
            onClick={() => {
              endSession();
              setTurns([]);
              saveHistory(mode, []);
              setSettingsOpen(false);
            }}
            className="mt-3 rounded-full border border-[#E4DFCC] px-4 py-2 text-sm font-bold text-[#17131F]"
          >
            Nouvelle conversation ({MODE_LABEL[mode]})
          </button>
        </Sheet>
      )}
    </div>
  );
}

function Orb({ phase, level }: { phase: Phase; level: number }) {
  const palette: Record<Phase, [string, string]> = {
    idle: ['#D4A23A', '#8C5A1E'],
    listening: ['#F2C14E', '#E07A2E'],
    thinking: ['#8E7CFF', '#4F3CC9'],
    speaking: ['#5FD1A0', '#2A8C78'],
  };
  const [a, b] = palette[phase];
  const scale = phase === 'listening' ? 1 + level * 0.35 : 1;
  return (
    <div className="relative grid h-[250px] w-[250px] place-items-center">
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-all duration-150 ${phase === 'speaking' ? 'animate-pulse' : ''}`}
        style={{ background: a, opacity: 0.22, transform: `scale(${0.85 + (scale - 1) * 1.4})` }}
      />
      <div
        className={`h-40 w-40 rounded-full shadow-2xl transition-transform duration-100 ${phase === 'thinking' ? 'animate-spin' : ''}`}
        style={{
          transform: `scale(${scale})`,
          background: `conic-gradient(from 0deg, ${a}, ${b}, ${a}, ${b}, ${a})`,
          animationDuration: phase === 'thinking' ? '2.5s' : undefined,
          boxShadow: `0 0 60px ${a}55`,
        }}
      />
      <div className="pointer-events-none absolute h-16 w-16 -translate-x-6 -translate-y-7 rounded-full bg-white/30 blur-md" />
    </div>
  );
}

function RoundButton({ label, active, onClick, icon, danger }: { label: string; active: boolean; onClick: () => void; icon: ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span className={`grid h-16 w-16 place-items-center rounded-full ${danger && active ? 'bg-[#B3413A]' : 'bg-[#2A2433]'} ${active ? 'text-white' : 'text-white/50'}`}>
        {icon}
      </span>
      <span className="text-[11.5px] text-white/70">{label}</span>
    </button>
  );
}

function Sheet({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] grid place-items-end bg-black/45 sm:place-items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-t-[28px] bg-[#F7F3E8] p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2 text-[14px]">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[#D4A23A]" />
    </label>
  );
}

