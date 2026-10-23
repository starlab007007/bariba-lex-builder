/**
 * Discussion vocale directe et continue pour Fitila IA (Tem IA / Code Foncier).
 *
 * Même principe d'échange que DUNYA IA (écoute -> réponse -> écoute, mains libres) : parlez, la
 * question est transcrite puis cherchée dans le Code Foncier Baatɔnum embarqué (RAG 100% local,
 * `onAsk` = `answerFromCorpus`, aucun appel à un modèle d'IA générale ni à ByT5), et la réponse est
 * lue à voix haute. Le mode mains libres relance l'écoute dès la fin de la lecture.
 *
 * STT : reconnaissance du navigateur en français (hors ligne, sans réseau) ou enregistrement avec
 * détection de silence puis transcription seule (`dunya-voice-turn`, transcribe_only) en baatɔnum —
 * jamais le moteur IA ni ByT5. TTS : lecture seule (`speech_only`) via Meta MMS, comme le lecteur de
 * chaque réponse en mode texte.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Headphones, Mic, Pause, Play, Scale, Square, X } from 'lucide-react';
import { runServerVoice } from '@/lib/dunya/serverVoice';
import {
  hasFrenchRecognition, loadPreference, playUrl, recognizeFrench, recordUtterance,
  savePreference, stopSpeaking, pauseSpeaking, resumeSpeaking,
} from '@/lib/dunya/voiceWeb';
import { loadReplyAudio } from '@/lib/voice/replySpeech';
import { replySpeechChunks } from '@/lib/voice/speechTextCore';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
type InputLang = 'bba' | 'fr';

type Props = {
  onExit: () => void;
  /** Recherche locale (RAG) + historique partagé avec la vue texte ; renvoie le texte de la réponse, ou null si rien n'a été envoyé. */
  onAsk: (text: string) => string | null;
};

/** Lit un texte baatɔnum en le découpant comme le lecteur par réponse (mêmes voix, même cache). */
async function speakBariba(text: string, signal: AbortSignal): Promise<void> {
  for (const chunk of replySpeechChunks(text)) {
    signal.throwIfAborted();
    const { blob } = await loadReplyAudio(chunk, signal);
    const url = URL.createObjectURL(blob);
    try {
      await playUrl(url, signal);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export default function FitilaTemIAVoice({ onExit, onAsk }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [caption, setCaption] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [handsFree, setHandsFree] = useState(() => loadPreference('temia-voice-handsFree', true));
  const [inputLang, setInputLang] = useState<InputLang>(() => loadPreference('temia-voice-lang', 'bba'));

  const session = useRef(false);
  const turnCounter = useRef(0);
  const emptyListens = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const recordStop = useRef<AbortController | null>(null);
  const listenTurnRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => () => {
    session.current = false;
    turnCounter.current++;
    abort.current?.abort();
    stopSpeaking();
  }, []);

  const interrupt = useCallback(() => {
    turnCounter.current++;
    abort.current?.abort();
    abort.current = null;
    stopSpeaking();
    setPaused(false);
  }, []);
  const endSession = useCallback(() => {
    session.current = false;
    interrupt();
    setPhase('idle');
    setNotice(null);
  }, [interrupt]);

  const answerTurn = useCallback(async (question: string) => {
    const turnId = turnCounter.current;
    const controller = new AbortController();
    abort.current = controller;
    const active = () => !controller.signal.aborted && turnId === turnCounter.current;
    setPhase('thinking');
    setCaption(question);
    setNotice(null);
    try {
      const answer = onAsk(question);
      if (!active()) return;
      if (!answer) {
        setNotice('Je n’ai rien reçu. Réessayez.');
        return;
      }
      setLastAnswer(answer);
      setPhase('speaking');
      setCaption(answer);
      await speakBariba(answer, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      setNotice(error instanceof Error ? error.message : 'Lecture indisponible. Touchez Réécouter.');
    } finally {
      if (active()) {
        setPhase('idle');
        if (session.current && handsFree) void listenTurnRef.current();
      }
    }
  }, [handsFree, onAsk]);

  const listenTurn = useCallback(async () => {
    if (!session.current) return;
    const controller = new AbortController();
    abort.current = controller;
    const finish = new AbortController();
    recordStop.current = finish;
    setPhase('listening');
    setCaption('');
    setLevel(0);
    setNotice(null);
    try {
      let text = '';
      if (inputLang === 'fr' && hasFrenchRecognition()) {
        const result = await recognizeFrench({ onInterim: setCaption, signal: controller.signal, finishSignal: finish.signal });
        text = result.text;
      } else {
        const audio = await recordUtterance({ onLevel: setLevel, signal: controller.signal, finishSignal: finish.signal });
        if (controller.signal.aborted || !session.current) return;
        if (audio) {
          setPhase('thinking');
          setNotice('Je comprends…');
          let transcript = '';
          await runServerVoice({
            audio, lang: inputLang, transcribeOnly: true, signal: controller.signal,
            onEvent(event) { if (event.type === 'transcript') transcript = event.text?.trim() ?? ''; },
          });
          text = transcript;
        }
      }
      if (controller.signal.aborted || !session.current) return;
      if (!text.trim()) {
        if (session.current && handsFree && emptyListens.current < 2) {
          emptyListens.current++;
          void listenTurnRef.current();
        } else {
          session.current = false;
          emptyListens.current = 0;
          setPhase('idle');
          setNotice('Je n’ai rien entendu. Touchez pour réessayer.');
        }
        return;
      }
      emptyListens.current = 0;
      await answerTurn(text.trim());
    } catch (error) {
      if (controller.signal.aborted) return;
      session.current = false;
      setPhase('idle');
      setNotice(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Autorisez le micro dans le navigateur.'
        : error instanceof Error ? error.message : 'Microphone indisponible.');
    }
  }, [answerTurn, handsFree, inputLang]);
  listenTurnRef.current = listenTurn;

  const onOrb = () => {
    if (phase === 'listening') { recordStop.current?.abort(); return; }
    if (phase === 'speaking') { interrupt(); session.current = true; void listenTurn(); return; }
    if (phase === 'thinking') { endSession(); return; }
    session.current = true;
    emptyListens.current = 0;
    void listenTurn();
  };

  const replayLast = () => {
    if (!lastAnswer) return;
    session.current = false;
    interrupt();
    const controller = new AbortController();
    abort.current = controller;
    setPhase('speaking');
    setCaption(lastAnswer);
    setNotice(null);
    void speakBariba(lastAnswer, controller.signal)
      .catch(error => { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Lecture indisponible.'); })
      .finally(() => { if (!controller.signal.aborted) setPhase('idle'); });
  };

  const setLang = (lang: InputLang) => { endSession(); setInputLang(lang); savePreference('temia-voice-lang', lang); };
  const toggleHandsFree = () => { const next = !handsFree; setHandsFree(next); savePreference('temia-voice-handsFree', next); };

  const label =
    phase === 'listening' ? 'Je vous écoute'
      : phase === 'thinking' ? 'Je cherche dans le Code Foncier…'
        : phase === 'speaking' ? 'Appuyez pour interrompre'
          : 'Appuyez pour parler';

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
      style={{ background: 'radial-gradient(120% 70% at 50% 38%, #2F4E3C 0%, #16271E 55%, #0E1813 100%)' }}>
      <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3 md:px-6 md:pt-5">
        <button type="button" onClick={onExit} aria-label="Quitter le mode vocal"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.12] ring-1 ring-white/25 hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86D9A8]">
          <X className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Scale className="h-5 w-5 shrink-0 text-[#86D9A8]" />
          <span className="truncate text-[16px] font-extrabold">Tem IA · Vocal</span>
        </div>
        <div role="radiogroup" aria-label="Langue de votre question" className="flex shrink-0 rounded-full bg-white/[0.10] p-1 ring-1 ring-white/25">
          {(['bba', 'fr'] as InputLang[]).map((l) => (
            <button key={l} role="radio" aria-checked={l === inputLang} onClick={() => l !== inputLang && setLang(l)}
              className={`min-h-9 whitespace-nowrap rounded-full px-3 text-[13px] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86D9A8] ${l === inputLang ? 'bg-[#86D9A8] text-[#16271E]' : 'text-white/90 hover:bg-white/10'}`}>
              {l === 'bba' ? 'Baatɔnum' : 'Français'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center px-5">
        <div className="flex-1" />
        <button onClick={onOrb} aria-label={label} className="relative grid place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#86D9A8]/50">
          <Orb phase={phase} level={level} />
        </button>
        <p className="mt-6 text-center text-[26px] font-extrabold leading-tight tracking-tight text-white" role="status" aria-live="polite">{label}</p>
        {phase === 'idle' && (
          <p className="mt-1.5 max-w-xs text-center text-[17px] leading-7 text-white/80">
            {inputLang === 'fr' ? 'Posez votre question en français.' : 'Yaa sɔ̃ɔ tem bausu gari Baribarum.'}
          </p>
        )}
        {lastAnswer && phase === 'idle' && (
          <div className="mt-4 flex gap-2">
            <Pill onClick={replayLast}><Headphones className="h-4 w-4" />Réécouter</Pill>
          </div>
        )}
        {phase === 'speaking' && lastAnswer && (
          <div className="mt-4 flex gap-2">
            <Pill onClick={() => { if (paused) { resumeSpeaking(); } else { pauseSpeaking(); } setPaused(!paused); }}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? 'Reprendre' : 'Pause'}
            </Pill>
          </div>
        )}
        <div className="flex-1" />
        {caption && (
          <div className="mx-auto mb-4 w-full max-w-2xl text-center">
            <p className="line-clamp-6 text-[22px] font-bold leading-[1.35] text-white md:text-[28px]">{caption}</p>
          </div>
        )}
      </div>

      {notice && (
        <p role="status" aria-live="polite" className="mx-4 mb-2 rounded-2xl bg-[#86D9A8]/15 px-4 py-2.5 text-center text-[15px] font-bold leading-6 text-[#BDEFD0] ring-1 ring-[#86D9A8]/35 sm:mx-auto sm:max-w-xl">
          {notice}
        </p>
      )}

      <footer className="mx-auto flex w-full max-w-md flex-wrap items-center justify-center gap-3 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-1">
        <Pill onClick={toggleHandsFree} active={handsFree} aria-pressed={handsFree}>
          <Headphones className="h-4 w-4" />Mains libres {handsFree ? 'activées' : 'désactivées'}
        </Pill>
        {phase !== 'idle' && <Pill onClick={endSession} danger><Square className="h-4 w-4" />Arrêter</Pill>}
      </footer>
    </div>
  );
}

function Orb({ phase, level }: { phase: Phase; level: number }) {
  const palette: Record<Phase, [string, string, string]> = {
    idle: ['#CFF2DC', '#86D9A8', '#1F5C3B'],
    listening: ['#D7F5E3', '#5FCB8E', '#1A5234'],
    thinking: ['#D9D2FF', '#8E7CFF', '#3A2A9C'],
    speaking: ['#FFE9B8', '#F2A94A', '#9A4A14'],
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
        {phase === 'idle' && <Mic aria-hidden className="absolute inset-0 m-auto h-14 w-14 text-[#16271E]/75" strokeWidth={2.2} />}
      </div>
    </div>
  );
}

function Pill({ children, onClick, active = true, danger, ...rest }: { children: ReactNode; onClick: () => void; active?: boolean; danger?: boolean; 'aria-pressed'?: boolean }) {
  return (
    <button onClick={onClick} {...rest}
      className={`flex min-h-12 items-center gap-2 rounded-full px-5 text-[16px] font-extrabold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86D9A8] ${danger ? 'bg-[#D4503F] text-white ring-[#D4503F]' : active ? 'bg-white/[0.14] text-white ring-white/30 hover:bg-white/[0.2]' : 'bg-transparent text-white/80 ring-white/25'}`}>
      {children}
    </button>
  );
}
