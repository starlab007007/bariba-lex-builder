import { supabase } from '@/integrations/supabase/client';
import { DUNYA_PILOT_ROLES, getMetaVoiceFlags, nextPilotStatus, resolveDunyaVoice, type DunyaPilotStatus, type DunyaVoiceChoice } from '@/lib/voice/metaVoice';
import { frenchGreetingAnswer, routeDunyaInput } from '@/lib/dunya/semanticRouter';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Captions, CaptionsOff, Check, ChevronDown, Copy, Languages, Menu, MessageSquare, Mic, MicOff, Send, Settings2, Square, Volume2, X } from 'lucide-react';
import {
  askDunya,
  hasFrenchRecognition,
  loadHistory,
  loadPreference,
  looksFrench,
  MODE_LABEL,
  recognizeFrench,
  recordUtterance,
  saveHistory,
  savePreference,
  speakBariba,
  speakFrench,
  splitSentences,
  stopSpeaking,
  transcribeBariba,
  setDunyaMetaVoice,
  lastVoiceEngine,
  translate,
  type DunyaWebMode,
  type DunyaWebTurn,
} from '@/lib/dunya/voiceWeb';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

type Props = {
  onOpenMenu?: () => void;
  /** Local, offline answer used when the browser has no network. */
  offlineAnswer?: (question: string) => string;
};

const MODE_HINT: Record<DunyaWebMode, string> = {
  fr: 'DUNYA écoute et répond uniquement en français.',
  bba: 'DUNYA écoute et répond uniquement en baatɔnum.',
  both: 'Parlez l’une ou l’autre langue : DUNYA répond dans la vôtre.',
};

const SUGGESTIONS: Record<DunyaWebMode, string[]> = {
  fr: ['Comment soigner une plaie légère ?', 'Explique-moi la rotation des cultures', 'Comment dit-on merci en baatɔnum ?'],
  bba: ['A kua', 'Bɛɛ ka weru'],
  both: ['Comment dit-on merci en baatɔnum ?', 'A kua'],
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function DunyaVoiceWeb({ onOpenMenu, offlineAnswer }: Props) {
  const [mode, setMode] = useState<DunyaWebMode>(() => loadPreference<DunyaWebMode>('mode', 'fr'));
  const [turns, setTurns] = useState<DunyaWebTurn[]>(() => loadHistory(loadPreference<DunyaWebMode>('mode', 'fr')));
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [caption, setCaption] = useState('');
  const [subCaption, setSubCaption] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [textView, setTextView] = useState(false);
  const [draft, setDraft] = useState('');
  const [modePicker, setModePicker] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(() => loadPreference('onboarded', false));
  const [handsFree, setHandsFree] = useState(() => loadPreference('handsFree', true));
  const [subtitles, setSubtitles] = useState(() => loadPreference('subtitles', true));
  const [frSubtitles, setFrSubtitles] = useState(() => loadPreference('frSubtitles', false));
  const [muted, setMuted] = useState(false);
  const [pilotStatus, setPilotStatus] = useState<DunyaPilotStatus>('checking');
  const pilot = pilotStatus === 'eligible';
  const [voiceChoice, setVoiceChoice] = useState<DunyaVoiceChoice | null>(() => loadPreference<DunyaVoiceChoice | null>('voiceChoice', null));
  const [reviewStt, setReviewStt] = useState(() => loadPreference('reviewStt', false));

  // Pilot gating: Meta voices (MMS-TTS CC BY-NC) only for signed-in admin/editor accounts.
  // An RPC failure never clears an already-confirmed pilot status.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const uidv = data.session?.user?.id;
      if (!uidv) { if (alive) setPilotStatus('signed_out'); return; }
      const roles: string[] = [];
      let failed = false;
      for (const r of DUNYA_PILOT_ROLES) {
        try {
          const { data: ok, error } = await supabase.rpc('has_role', { _user_id: uidv, _role: r });
          if (error) failed = true; else if (ok) roles.push(r);
        } catch { failed = true; }
      }
      if (alive) setPilotStatus((prev) => nextPilotStatus(prev, true, roles, failed));
    };
    void check().catch(() => { if (alive) setPilotStatus((p) => (p === 'eligible' ? p : 'check_failed')); });
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') void check().catch(() => undefined);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    setDunyaMetaVoice(pilot ? resolveDunyaVoice(true, voiceChoice, getMetaVoiceFlags()) : null);
    return () => setDunyaMetaVoice(null);
  }, [pilot, voiceChoice]);
  const metaOn = pilot && voiceChoice !== 'fitila';
  const effective = pilot ? resolveDunyaVoice(true, voiceChoice, getMetaVoiceFlags()) : getMetaVoiceFlags();
  const pilotLabel: Record<DunyaPilotStatus, string> = {
    checking: 'Vérification du compte…',
    signed_out: 'Non connecté — voix FITILA utilisée.',
    eligible: 'Compte pilote autorisé.',
    not_eligible: 'Compte non pilote — voix FITILA utilisée.',
    check_failed: 'Vérification du rôle impossible (réseau) — voix FITILA utilisée.',
  };

  const session = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const turnCounter = useRef(0);
  const emptyListens = useRef(0);
  const scroller = useRef<HTMLDivElement | null>(null);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  useEffect(() => saveHistory(mode, turns), [mode, turns]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [turns, textView]);
  useEffect(() => () => {
    session.current = false;
    abort.current?.abort();
    stopSpeaking();
  }, []);

  const interrupt = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    stopSpeaking();
  }, []);

  const endSession = useCallback(() => {
    session.current = false;
    interrupt();
    setPhase('idle');
  }, [interrupt]);

  // -------------------------------------------------------------------------
  // Speaking
  // -------------------------------------------------------------------------

  const speak = useCallback(
    async (text: string, lang: 'fr' | 'bba', subtitle: string | undefined, turnId: number) => {
      const sentences = lang === 'fr' ? splitSentences(text) : [text];
      for (const s of sentences) {
        if (turnId !== turnCounter.current) return;
        setPhase('speaking');
        setCaption(s);
        setSubCaption(lang === 'bba' && frSubtitles ? subtitle ?? null : null);
        if (lang === 'fr') {
          await speakFrench(s);
        } else {
          try {
            const ok = await speakBariba(s);
            if (!ok) setNotice('Voix baatɔnum momentanément indisponible.');
          } catch {
            setNotice('Voix baatɔnum momentanément indisponible.');
          }
        }
      }
    },
    [frSubtitles],
  );

  // -------------------------------------------------------------------------
  // One turn
  // -------------------------------------------------------------------------

  const listenTurnRef = useRef<() => Promise<void>>(async () => {});

  const runTurn = useCallback(
    async (heard: string, heardLang: 'fr' | 'bba', spoken: boolean) => {
      const clean = heard.trim();
      if (!clean) {
        if (session.current && handsFree) void listenTurnRef.current();
        else setPhase('idle');
        return;
      }
      const turnId = ++turnCounter.current;
      const replyLang: 'fr' | 'bba' = mode === 'fr' ? 'fr' : mode === 'bba' ? 'bba' : heardLang;
      const user: DunyaWebTurn = { id: uid(), role: 'user', text: clean, lang: heardLang, createdAt: Date.now() };
      setTurns((t) => [...t, user]);
      setPhase('thinking');
      setCaption('');
      setNotice(null);

      const routed = routeDunyaInput(clean, heardLang, spoken ? 'voice' : 'text');
      let answerText = '';
      let answerSub: string | undefined;
      try {
        const direct = replyLang === 'fr' ? frenchGreetingAnswer(routed) : null;
        if (direct) {
          answerText = direct;
        } else if (!navigator.onLine) {
          answerText = offlineAnswer?.(clean) ?? 'Pas de connexion. Réessayez quand le réseau revient.';
          setNotice('Hors ligne : réponse tirée des ressources FITILA de ce navigateur.');
        } else {
          let question = clean;
          if (heardLang === 'bba') {
            setStatus('Je traduis…');
            const translatedQuestion = await translate(clean, 'bba', 'fr');
            if (!translatedQuestion) {
              throw new Error('La demande baatɔnum ne peut pas être traduite avec fiabilité. Reformulez-la ou essayez en français.');
            }
            question = translatedQuestion;
          }
          setStatus(routed.route === 'knowledge' ? 'Je consulte les connaissances…' : 'Je réfléchis…');
          const answer = await askDunya(question, turnsRef.current, replyLang === 'bba');
          if (replyLang === 'bba') {
            // Sentence by sentence: ByT5 is most reliable on short sentences, and
            // attested sentences come straight from the translation memory.
            const parts = splitSentences(answer.fr);
            const translated = await Promise.all(parts.map((p) => translate(p, 'fr', 'bba')));
            const perSentence = translated.every((t) => t && t.trim()) ? translated.join(' ') : null;
            const ba = perSentence ?? answer.ba;
            if (ba) {
              answerText = ba;
              answerSub = answer.fr;
            } else {
              answerText = answer.fr;
              setNotice('Traduction vers le baatɔnum indisponible : réponse en français.');
            }
          } else {
            answerText = answer.fr;
          }
        }
      } catch (error) {
        // Cloud outage must not discard useful, already installed FITILA knowledge.
        // Offline fallback is a sourced extract, not a generated answer.
        const local = offlineAnswer?.(clean)?.trim();
        answerText = local || 'Je n’ai pas trouvé de réponse fiable dans les ressources disponibles.';
        answerSub = undefined;
        setNotice(local
          ? 'Service distant indisponible : extrait des ressources locales FITILA (non génératif).'
          : error instanceof Error ? error.message : 'Service momentanément indisponible.');
      } finally {
        setStatus(null);
      }
      if (turnId !== turnCounter.current) return;

      const speakLang: 'fr' | 'bba' = replyLang === 'bba' && answerSub ? 'bba' : 'fr';
      const assistant: DunyaWebTurn = {
        id: uid(),
        role: 'assistant',
        text: answerText,
        lang: speakLang,
        subtitle: answerSub,
        createdAt: Date.now(),
      };
      setTurns((t) => [...t, assistant]);
      await speak(answerText, speakLang, answerSub, turnId);
      if (turnId !== turnCounter.current) return;
      if (session.current && handsFree && spoken) void listenTurnRef.current();
      else setPhase('idle');
    },
    [handsFree, mode, offlineAnswer, speak],
  );

  // -------------------------------------------------------------------------
  // Listening (hands-free loop)
  // -------------------------------------------------------------------------

  const listenTurn = useCallback(async () => {
    if (!session.current) return;
    if (muted) {
      setPhase('idle');
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setPhase('listening');
    setCaption('');
    setSubCaption(null);
    setLevel(0);
    try {
      let heard = '';
      let heardLang: 'fr' | 'bba' = mode === 'bba' ? 'bba' : 'fr';
      if (mode === 'fr') {
        const r = await recognizeFrench({ onInterim: setCaption, signal: controller.signal });
        heard = r.text;
      } else if (mode === 'bba') {
        const blob = await recordUtterance({ onLevel: setLevel, signal: controller.signal });
        if (blob) {
          setPhase('thinking');
          setStatus(metaOn ? 'Je vous comprends (Meta)…' : 'Je vous comprends…');
          heard = await transcribeBariba(blob);
        }
      } else {
        // Both languages: run the two recognisers together, keep the clearer one.
        const [fr, blob] = await Promise.all([
          hasFrenchRecognition()
            ? recognizeFrench({ onInterim: setCaption, signal: controller.signal }).catch(() => ({ text: '', confidence: 0 }))
            : Promise.resolve({ text: '', confidence: 0 }),
          recordUtterance({ onLevel: setLevel, signal: controller.signal }),
        ]);
        if (fr.text && looksFrench(fr.text, fr.confidence)) {
          heard = fr.text;
          heardLang = 'fr';
        } else if (blob) {
          setPhase('thinking');
          setStatus(metaOn ? 'Je vous comprends (Meta)…' : 'Je vous comprends…');
          heard = await transcribeBariba(blob);
          heardLang = 'bba';
        }
      }
      if (controller.signal.aborted || !session.current) return;
      if (!heard.trim()) {
        emptyListens.current += 1;
        if (emptyListens.current >= 2 || !handsFree) {
          session.current = false;
          setPhase('idle');
        } else {
          void listenTurnRef.current();
        }
        return;
      }
      emptyListens.current = 0;
      if (reviewStt && heardLang === 'bba') {
        // Editable transcription: user checks/corrects before sending.
        session.current = false;
        setPhase('idle');
        setStatus(null);
        setDraft(heard);
        setTextView(true);
        setNotice(`Transcription ${lastVoiceEngine.asr === 'meta' ? 'Meta' : 'FITILA'} : corrigez si besoin puis envoyez.`);
        return;
      }
      await runTurn(heard, heardLang, true);
    } catch (error) {
      session.current = false;
      setPhase('idle');
      setStatus(null);
      setNotice(error instanceof Error ? error.message : 'Écoute interrompue.');
    }
  }, [handsFree, metaOn, mode, muted, reviewStt, runTurn]);

  listenTurnRef.current = listenTurn;

  const onOrb = async () => {
    if (phase === 'speaking') {
      turnCounter.current += 1;
      interrupt();
      if (session.current) void listenTurn();
      else setPhase('idle');
      return;
    }
    if (phase === 'listening') {
      abort.current?.abort();
      return;
    }
    if (phase === 'thinking') {
      turnCounter.current += 1;
      interrupt();
      setPhase('idle');
      return;
    }
    if (mode === 'fr' && !hasFrenchRecognition()) {
      setNotice('Ce navigateur ne gère pas la dictée en français : utilisez Chrome ou Edge, ou écrivez à DUNYA.');
      setTextView(true);
      return;
    }
    session.current = true;
    emptyListens.current = 0;
    void listenTurn();
  };

  const sendText = async () => {
    const text = draft.trim();
    if (!text || phase === 'thinking') return;
    setDraft('');
    interrupt();
    const lang: 'fr' | 'bba' = mode === 'bba' ? 'bba' : mode === 'fr' ? 'fr' : looksFrench(text, 0.9) ? 'fr' : 'bba';
    await runTurn(text, lang, false);
  };

  const changeMode = (next: DunyaWebMode) => {
    endSession();
    setMode(next);
    savePreference('mode', next);
    setTurns(loadHistory(next));
    setModePicker(false);
  };

  const setPref = <T,>(key: string, value: T, setter: (v: T) => void) => {
    setter(value);
    savePreference(key, value);
  };

  const label =
    phase === 'listening' ? 'Je vous écoute…'
      : phase === 'thinking' ? status ?? 'Je réfléchis…'
        : phase === 'speaking' ? 'Touchez pour m’interrompre'
          : muted ? 'Micro coupé' : 'Touchez la sphère pour parler';

  const lastUser = [...turns].reverse().find((t) => t.role === 'user')?.text ?? '';

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white" style={{ background: '#17131F' }}>
      <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3 md:px-5">
        {onOpenMenu && (
          <button onClick={onOpenMenu} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 md:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => setModePicker(true)} className="flex items-center gap-2 rounded-full bg-[#2A2433] px-4 py-2 text-sm font-extrabold">
          <Languages className="h-4 w-4 text-[#D4A23A]" />
          {MODE_LABEL[mode]}
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
        <span className="hidden rounded-full bg-[#52A47A]/15 px-3 py-1.5 text-[11px] font-extrabold text-[#8FD3A8] sm:inline">DUNYA IA · en ligne</span>
        <div className="flex-1" />
        <button onClick={() => setTextView((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Conversation écrite">
          <MessageSquare className="h-5 w-5" />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Réglages">
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
                    onClick={() => void speak(t.text, t.lang, t.subtitle, ++turnCounter.current).then(() => setPhase('idle'))}
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
          <p className="mt-5 text-base font-bold">{label}</p>
          <div className="flex-1" />
          {subtitles && (
            <div className="mx-auto mb-3 max-w-2xl text-center">
              {phase === 'thinking' && lastUser && <p className="line-clamp-3 italic text-white/60">« {lastUser} »</p>}
              {caption && <p className="line-clamp-5 text-[19px] font-semibold leading-snug">{caption}</p>}
              {subCaption && <p className="mt-1.5 line-clamp-3 text-sm text-white/55">{subCaption}</p>}
            </div>
          )}
          {notice && <p className="mb-2 max-w-xl text-center text-[12.5px] text-[#E9C46A]">{notice}</p>}
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
              if (next) abort.current?.abort();
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
          <fieldset className="mt-3 rounded-2xl border border-[#E4DFCC] p-3 text-[#17131F]" aria-label="Voix baatɔnum">
            <legend className="px-1 text-sm font-black">Voix baatɔnum</legend>
            {pilot ? (
              <>
                {([['meta', 'Meta MMS + Omnilingual (pilote)'], ['fitila', 'Voix FITILA classique']] as const).map(([v, l]) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 py-1.5 text-[14px]">
                    <input type="radio" name="dunya-voice" checked={(voiceChoice ?? 'meta') === v} onChange={() => setPref<DunyaVoiceChoice | null>('voiceChoice', v, setVoiceChoice)} className="h-4 w-4 accent-[#D4A23A]" />
                    {l}
                  </label>
                ))}
                <p className="mt-1 text-[12px] text-[#7D7566]">Pilote réservé (licence non commerciale CC BY-NC). En cas de panne, DUNYA repasse automatiquement sur la voix FITILA.</p>
              </>
            ) : (
              <p className="text-[12.5px] text-[#7D7566]">Voix FITILA. La voix Meta est en pilote, réservée aux comptes autorisés.</p>
            )}
          </fieldset>
          <p className="mt-3 text-[12.5px] text-[#7D7566]">
            Sur le web, DUNYA utilise Internet : dictée du navigateur pour le français, modèles FITILA pour le baatɔnum. Dans l’application mobile, tout fonctionne sans Internet.
          </p>
          <button
            onClick={() => {
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
