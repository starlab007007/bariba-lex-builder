// Portage fidèle de `ApSessionScreen` (fitila_flutter/lib/apprendre/apprendre_session.dart,
// branche feat/apprendre-v2.4-build19-20260927) — séance d'exercices : choix,
// remise en ordre, prononciation (auto-évaluée, le micro n'est pas encore
// câblé côté web — voir la note sur les tâches `speak` plus bas).
//
// Composant réutilisable et autonome : un écran parent (séance du jour,
// pratique, quiz de fondation, quiz de scène, révision) le monte en plein
// écran quand l'utilisateur démarre une séance. Toute la logique d'état de
// séance (score, XP, SRS, compteurs par compétence, tâches ratées) vient de
// `ApSessionRunner` (`src/lib/apprendre/session.ts`), déjà porté et vérifié —
// ce composant ne fait que la piloter et l'afficher.

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, HelpCircle, CheckCircle2, XCircle, Lightbulb, Loader2 } from 'lucide-react';
import { type ApTask, isCorrectChoice, isCorrectOrder, skillLabel } from '@/lib/apprendre/tasks';
import type { ApprendreStore } from '@/lib/apprendre/store';
import { ApSessionRunner, type ApSessionResult, retryTasks, sessionPercent } from '@/lib/apprendre/session';
import { PASS_MARK } from '@/lib/apprendre/store';
import { AP_COLORS } from './apColors';
import ApSessionResultScreen from './ApSessionResultScreen';
import { BaribaAudioButton } from '@/components/fitila/BaribaAudioText';

export interface ApSessionScreenProps {
  /** Titre affiché en haut de l'écran (ex. « Séance du jour », « Fondation : Tons »). */
  title: string;
  tasks: readonly ApTask[];
  store: ApprendreStore;
  /** Clé de thème de la séance (ex. `famille`, `fondation:tons`) — conservée pour
   *  compatibilité d'API ; aucun appel réseau n'est fait ici (`session.ts` ne
   *  porte pas l'enregistrement analytique `FitilaBackend.recordLearningSession`
   *  du côté Dart, qui reste hors du périmètre de ce module). */
  sessionKey: string;
  foundationId?: string;
  /** Appelé à chaque fin de séance (séance initiale ET chaque reprise d'erreurs). */
  onFinish?: (result: ApSessionResult) => void;
  /** Quitter l'écran (bouton « Quitter la séance » ou « Retour au parcours »). */
  onClose: () => void;
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

function optionStyle(state: OptionState) {
  switch (state) {
    case 'correct': return { bg: AP_COLORS.sageTint, border: AP_COLORS.sage, fg: AP_COLORS.sageInk };
    case 'wrong': return { bg: AP_COLORS.clayTint, border: AP_COLORS.clay, fg: AP_COLORS.clayInk };
    case 'dimmed': return { bg: AP_COLORS.surface, border: AP_COLORS.line, fg: AP_COLORS.muted };
    default: return { bg: AP_COLORS.surface, border: AP_COLORS.line, fg: AP_COLORS.ink };
  }
}

function SourceTag({ source, verified }: { source: string; verified: boolean }) {
  if (!source) return null;
  return (
    <div className="flex items-center gap-1 text-[11px]" style={{ color: AP_COLORS.muted }}>
      {!verified && <HelpCircle className="h-3 w-3 shrink-0" />}
      <span className="truncate">{source}{!verified ? ' · à valider' : ''}</span>
    </div>
  );
}

/** Zone « remets les mots dans l'ordre » : banque de mots + phrase en construction. */
function OrderBody({
  task, pickedIndices, answered, wasCorrect, onPick, onUnpick, onCheck,
}: {
  task: ApTask;
  pickedIndices: number[];
  answered: boolean;
  wasCorrect: boolean;
  onPick: (optionIndex: number) => void;
  onUnpick: (pickedPosition: number) => void;
  onCheck: () => void;
}) {
  const remaining = task.options.map((_, i) => i).filter((i) => !pickedIndices.includes(i));
  const boxBorder = answered ? (wasCorrect ? AP_COLORS.sage : AP_COLORS.clay) : AP_COLORS.lineStrong;
  return (
    <div>
      <div
        className="min-h-[70px] rounded-[18px] p-3"
        style={{ backgroundColor: AP_COLORS.surface, border: `${answered ? 2 : 1}px solid ${boxBorder}` }}
      >
        <div className="flex flex-wrap gap-2">
          {pickedIndices.length === 0 && (
            <p className="p-2 text-sm" style={{ color: AP_COLORS.muted }}>Touche les mots dans le bon ordre</p>
          )}
          {pickedIndices.map((optionIndex, pos) => (
            <button
              key={pos}
              onClick={() => onUnpick(pos)}
              disabled={answered}
              className="rounded-[14px] border px-3.5 py-2.5 text-[16px] font-bold"
              style={{ backgroundColor: AP_COLORS.goldTint, borderColor: AP_COLORS.gold, color: AP_COLORS.ink }}
            >
              {task.options[optionIndex]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {remaining.map((optionIndex) => (
          <button
            key={optionIndex}
            onClick={() => onPick(optionIndex)}
            disabled={answered}
            className="rounded-[14px] border px-3.5 py-2.5 text-[16px] font-bold"
            style={{ backgroundColor: AP_COLORS.surface, borderColor: AP_COLORS.lineStrong, color: AP_COLORS.ink }}
          >
            {task.options[optionIndex]}
          </button>
        ))}
      </div>
      {!answered && (
        <button
          onClick={onCheck}
          disabled={pickedIndices.length !== task.orderAnswer.length}
          className="mt-4.5 w-full rounded-full py-3.5 text-sm font-extrabold disabled:opacity-40"
          style={{ backgroundColor: AP_COLORS.gold, color: AP_COLORS.goldInk }}
        >
          Vérifier
        </button>
      )}
    </div>
  );
}

/** Piloté une seule instance de séance (tâches + `ApSessionRunner` fixés à
 *  la création) ; remonté avec une nouvelle `key` par le parent pour chaque
 *  nouvelle séance ou reprise d'erreurs, ce qui recrée un `ApSessionRunner`
 *  neuf — reproduit exactement le `Navigator.pushReplacement` du côté Dart. */
function ApSessionRun({
  tasks, store, title, foundationId, onFinish, onClose,
}: {
  tasks: readonly ApTask[];
  store: ApprendreStore;
  title: string;
  foundationId?: string;
  onFinish: (result: ApSessionResult, missed: readonly ApTask[]) => void;
  onClose: () => void;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule séance par montage, voir commentaire ci-dessus
  const runner = useMemo(() => new ApSessionRunner(tasks, store), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [pickedIndices, setPickedIndices] = useState<number[]>([]);
  const [finishing, setFinishing] = useState(false);

  const oral = store.progress.profile === 'oral';
  const showTranscription = store.progress.profile === 'fr' || store.progress.profile === 'both';

  const finish = useCallback(() => {
    setFinishing(true);
    const result = runner.finish({ foundationId, now: Date.now() });
    onFinish(result, runner.missedTasks);
  }, [runner, foundationId, onFinish]);

  const goNext = useCallback(() => {
    if (index + 1 < tasks.length) {
      setIndex(index + 1);
      setSelected(null);
      setAnswered(false);
      setWasCorrect(false);
      setPickedIndices([]);
    } else {
      finish();
    }
  }, [index, tasks.length, finish]);

  if (tasks.length === 0) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col" style={{ backgroundColor: AP_COLORS.ivory, color: AP_COLORS.ink, paddingInline: 'max(0px, calc((100% - 760px) / 2))' }}>
        <div className="flex items-center gap-3.5 px-4 pt-3">
          <button onClick={onClose} aria-label="Quitter la séance" className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
            <X className="h-5 w-5" />
          </button>
          <p className="text-base font-extrabold">{title}</p>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p style={{ color: AP_COLORS.ink }}>Rien à réviser pour l’instant. Reviens plus tard ou apprends de nouveaux mots.</p>
        </div>
      </div>
    );
  }

  const task = tasks[index];

  const readInstruction = () => {
    try {
      if (!('speechSynthesis' in window)) return;
      const text = task.promptIsBariba ? task.instruction : `${task.instruction} ${task.prompt}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // Lecture vocale indisponible sur cet appareil — pas d'action de repli nécessaire.
    }
  };

  const recordAnswer = (ok: boolean) => {
    setAnswered(true);
    setWasCorrect(ok);
    runner.answer(task, ok, Date.now());
  };

  const choose = (option: string) => {
    if (answered) return;
    setSelected(option);
    recordAnswer(isCorrectChoice(task, option));
  };

  const pickWord = (optionIndex: number) => {
    if (answered) return;
    setPickedIndices((cur) => [...cur, optionIndex]);
  };
  const unpickWord = (pickedPosition: number) => {
    if (answered) return;
    setPickedIndices((cur) => cur.filter((_, p) => p !== pickedPosition));
  };
  const checkOrder = () => {
    const words = pickedIndices.map((i) => task.options[i]);
    recordAnswer(isCorrectOrder(task, words));
  };

  /** Exercice `speak` sans micro disponible (câblage micro hors périmètre de
   *  cette tâche) : reproduit le seul chemin que le Dart source emprunte
   *  quand aucun enregistrement n'existe — passer la tâche sans qu'elle
   *  compte dans le score, le total ni la répétition espacée. */
  const skipSpeak = () => {
    if (answered) return;
    runner.skip();
    goNext();
  };

  const last = index + 1 === tasks.length;
  const showAnswer = !wasCorrect && task.kind !== 'speak';

  return (
    <div className="absolute inset-0 z-10 flex flex-col" style={{ backgroundColor: AP_COLORS.ivory, color: AP_COLORS.ink, paddingInline: 'max(0px, calc((100% - 760px) / 2))' }}>
      {finishing ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: AP_COLORS.gold }} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3.5 px-4 pt-3 pb-1">
            <button onClick={onClose} aria-label="Quitter la séance" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
              <X className="h-5 w-5" />
            </button>
            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: AP_COLORS.line }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${((index + (answered ? 1 : 0)) / tasks.length) * 100}%`, backgroundColor: AP_COLORS.gold }}
              />
            </div>
            <span className="shrink-0 text-xs font-bold">{index + 1}/{tasks.length}</span>
          </div>

          <p className="truncate px-5 pt-0.5 text-xs font-semibold">
            {task.skill.length === 0 ? title : `${title} · ${skillLabel(task.skill)}`}
          </p>

          <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="flex-1 pt-1.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ color: AP_COLORS.muted }}>
                {task.instruction}
              </p>
              <button
                onClick={readInstruction}
                aria-label="Lire la consigne"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}
              >
                <Volume2 className="h-4 w-4" style={{ color: AP_COLORS.muted }} />
              </button>
            </div>

            <div className="mt-2.5 rounded-[24px] border p-5" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
              {task.promptIsBariba ? (
                <div className="flex items-start gap-3">
                  <p className={`min-w-0 flex-1 font-bold ${oral ? 'text-[30px]' : 'text-[26px]'}`}>{task.prompt}</p>
                  <BaribaAudioButton text={task.prompt} hideUnavailable />
                </div>
              ) : (
                <p className={`font-extrabold ${oral ? 'text-[26px]' : 'text-[22px]'}`}>{task.prompt}</p>
              )}
              {task.promptIsBariba && showTranscription && task.transcription && (
                <p className="mt-1 text-sm" style={{ color: AP_COLORS.muted }}>[{task.transcription}]</p>
              )}
              {task.promptSub && <p className="mt-2 text-sm" style={{ color: AP_COLORS.muted }}>{task.promptSub}</p>}
              {!task.verified && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: AP_COLORS.clayTint, color: AP_COLORS.clayInk }}>
                  <HelpCircle className="h-3.5 w-3.5" /> Forme en cours de validation
                </div>
              )}
            </div>

            <div className="mt-4.5">
              {task.kind === 'choice' && (
                <div className="space-y-2.5">
                  {task.options.map((option) => {
                    const state: OptionState = !answered
                      ? 'idle'
                      : isCorrectChoice(task, option)
                        ? 'correct'
                        : option === selected
                          ? 'wrong'
                          : 'dimmed';
                    const { bg, border, fg } = optionStyle(state);
                    return (
                      <button
                        key={option}
                        onClick={() => choose(option)}
                        disabled={answered}
                        className={`flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3.5 text-left ${oral ? 'min-h-[66px]' : 'min-h-[58px]'}`}
                        style={{ backgroundColor: bg, color: fg, border: `${state === 'idle' || state === 'dimmed' ? 1 : 2}px solid ${border}` }}
                      >
                        <span className={`${task.optionsAreBariba ? 'font-bold' : 'font-semibold'}`} style={{ fontSize: oral ? 19 : task.optionsAreBariba ? 17 : 15 }}>
                          {option}
                        </span>
                        {state === 'correct' && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: border }} />}
                        {state === 'wrong' && <XCircle className="h-5 w-5 shrink-0" style={{ color: border }} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {task.kind === 'order' && (
                <OrderBody
                  task={task}
                  pickedIndices={pickedIndices}
                  answered={answered}
                  wasCorrect={wasCorrect}
                  onPick={pickWord}
                  onUnpick={unpickWord}
                  onCheck={checkOrder}
                />
              )}

              {task.kind === 'speak' && !answered && (
                <div className="rounded-[18px] border p-5 text-center" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
                  <p className="text-sm" style={{ color: AP_COLORS.muted }}>
                    L’enregistrement vocal arrive bientôt sur le web. Compare-le mentalement à l’écrit ci-dessus.
                  </p>
                  <button onClick={skipSpeak} className="mt-3.5 text-sm font-bold underline underline-offset-2" style={{ color: AP_COLORS.goldDeep }}>
                    Je ne peux pas parler maintenant · passer
                  </button>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ y: 48, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 48, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-t-[26px] px-5 pb-6 pt-4"
                style={{ backgroundColor: wasCorrect ? AP_COLORS.sageTint : AP_COLORS.clayTint }}
              >
                <div className="flex items-center gap-2">
                  {wasCorrect ? <CheckCircle2 className="h-5 w-5" style={{ color: AP_COLORS.sageInk }} /> : <Lightbulb className="h-5 w-5" style={{ color: AP_COLORS.clayInk }} />}
                  <span className="text-lg font-extrabold" style={{ color: wasCorrect ? AP_COLORS.sageInk : AP_COLORS.clayInk }}>
                    {wasCorrect ? 'Bien vu !' : 'Presque.'}
                  </span>
                </div>
                {showAnswer && (
                  <div className="mt-2">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: wasCorrect ? AP_COLORS.sageInk : AP_COLORS.clayInk }}>
                      Bonne réponse
                    </p>
                    <p className="text-[17px] font-bold" style={{ color: AP_COLORS.ink }}>{task.answer}</p>
                  </div>
                )}
                {task.explain && <p className="mt-2 text-[13.5px]" style={{ color: AP_COLORS.ink }}>{task.explain}</p>}
                <div className="mt-2">
                  <SourceTag source={task.source} verified={task.verified} />
                </div>
                <button
                  onClick={goNext}
                  className="mt-3.5 w-full rounded-full py-3.5 text-sm font-extrabold"
                  style={{ backgroundColor: wasCorrect ? AP_COLORS.gold : AP_COLORS.ink, color: wasCorrect ? AP_COLORS.goldInk : '#FFFFFF' }}
                >
                  {last ? 'Voir mon résultat' : 'Continuer'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

/** État d'une reprise (« Mes erreurs ») — remplace la séance en cours par les
 *  tâches ratées, sans `foundationId` (le Dart source ne le transmet pas non
 *  plus au `_retry`). */
interface RetryState {
  tasks: ApTask[];
  gen: number;
}

export default function ApSessionScreen({ title, tasks, store, foundationId, onFinish, onClose }: ApSessionScreenProps) {
  const [retry, setRetry] = useState<RetryState | null>(null);
  const [phase, setPhase] = useState<'session' | 'result'>('session');
  const [result, setResult] = useState<ApSessionResult | null>(null);
  const [missedTasks, setMissedTasks] = useState<readonly ApTask[]>([]);

  const activeTasks = retry ? retry.tasks : tasks;
  const activeTitle = retry ? 'Mes erreurs' : title;
  const activeFoundationId = retry ? undefined : foundationId;

  const handleFinish = (finishedResult: ApSessionResult, missed: readonly ApTask[]) => {
    setResult(finishedResult);
    setMissedTasks(missed);
    setPhase('result');
    onFinish?.(finishedResult);
  };

  const handleRetry = () => {
    setRetry((prev) => ({ tasks: retryTasks(missedTasks), gen: (prev?.gen ?? 0) + 1 }));
    setPhase('session');
  };

  if (phase === 'result' && result) {
    return (
      <ApSessionResultScreen
        title={activeTitle}
        result={result}
        missed={missedTasks}
        store={store}
        foundationPassed={activeFoundationId ? sessionPercent(result) >= PASS_MARK : null}
        onRetry={missedTasks.length > 0 ? handleRetry : undefined}
        onClose={onClose}
      />
    );
  }

  return (
    <ApSessionRun
      key={retry?.gen ?? 0}
      tasks={activeTasks}
      store={store}
      title={activeTitle}
      foundationId={activeFoundationId}
      onFinish={handleFinish}
      onClose={onClose}
    />
  );
}
