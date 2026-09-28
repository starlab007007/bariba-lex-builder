// Portage fidèle de `ApSceneDetailScreen` (fitila_flutter/lib/apprendre/apprendre_scenes_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927) — une scène de bout en bout :
// présentation, dialogue (écoute ou jeu de rôle), culture, vocabulaire et
// test de compréhension.
//
// Référence : apprendre_v24_spec.md §8.2 (flux exact `_Stage`, `_advance()`,
// `_learnerTurn`, boutons de fin de scène).
//
// Écran autonome et piloté par les props, à l'image de `ApReviewScreen.tsx` :
// le parent (`ApScenesHubScreen`) charge `ScenesContent`/`ScenesProgress` et
// remonte une instance FRAÎCHE de ce composant (React `key={scene.id}`) pour
// chaque nouvelle scène — cela reproduit exactement la sémantique du
// `Navigator.pushReplacement` du Dart source, qui crée un nouveau `State`
// (donc `_stage`, `_shown`, `_learner`, etc. repartent tous de zéro), sans
// que ce composant ait à gérer lui-même la transition d'une scène à l'autre.
//
// Deux simplifications volontaires par rapport au Dart, imposées par ce qui
// existe déjà côté web (voir le rapport de tâche pour le détail) :
// - `ApAudioButton`/`ApAudioService.instance.play` (bibliothèque de voix de
//   référence pré-enregistrées + lecture automatique à chaque réplique
//   révélée) ne sont pas portés : ce module (`ApSessionScreen.tsx`,
//   `session.ts`) est délibérément hors-ligne et sans appel réseau ("aucun
//   appel réseau n'est fait ici", cf. commentaires d'en-tête déjà présents) ;
//   `BaribaAudioText` (voix pré-enregistrées via Supabase), utilisé par
//   l'ancien écran `FitilaLearnScenes.tsx`, romprait cette frontière. Le
//   bouton d'écoute est donc un bouton local, meilleur effort, utilisant la
//   synthèse vocale du navigateur (comme le bouton « Lire la consigne » déjà
//   présent dans `ApSessionScreen.tsx`) — pas de lecture automatique (les
//   navigateurs bloquent l'audio non déclenché par un geste utilisateur) ;
// - « Comparer ma voix » (`ApCompareButton`, enregistrement + analyse audio
//   côté client) n'est pas câblé : comme pour les tâches `speak` de
//   `ApSessionScreen.tsx` déjà porté, le micro n'est pas encore disponible
//   sur le web, donc le bouton reste présent (fidélité de mise en page) mais
//   désactivé.

import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import {
  ArrowLeft, SignalHigh, MessagesSquare, Mic, Ear, Play, Flame, ListChecks,
  ArrowRightLeft, ArrowRight, Eye, ArrowDown, Volume2,
} from 'lucide-react';
import {
  type ScScene, type ScLine, type ScenesContent,
  scLineIsNarration, scLineVerified, scLineSource,
} from '@/lib/apprendre/content';
import { type ScenesProgress, buildSceneQuiz } from '@/lib/apprendre/scenes';
import type { ApprendreStore } from '@/lib/apprendre/store';
import type { ApTask } from '@/lib/apprendre/tasks';
import { sessionPercent } from '@/lib/apprendre/session';
import { AP_COLORS } from './apColors';
import ApSessionScreen from './ApSessionScreen';

// AP_COLORS n'expose pas encore `nightText`/`quiet` (apprendre_v24_spec.md
// §13.1) — valeurs ajoutées localement plutôt que de modifier apColors.ts
// (hors périmètre de cette tâche). `night` lui-même est identique à
// AP_COLORS.ink (mêmes 0xFF241F2E) et est donc réutilisé tel quel, sans
// nouvelle constante.
const NIGHT_TEXT = '#D9D3C1';
const QUIET = '#5E5846';

type IconComp = ComponentType<{ className?: string; style?: CSSProperties }>;

export interface ApSceneDetailScreenProps {
  scene: ScScene;
  content: ScenesContent;
  progress: ScenesProgress;
  store: ApprendreStore;
  /** Quitter la scène (bouton retour de l'en-tête) — retour au hub. */
  onBack: () => void;
  /** Ouvre la scène suivante du module (le parent remonte une instance
   *  fraîche, voir note d'en-tête) ; non appelé quand `content.after(scene)`
   *  est indéfini — le bouton de fin devient alors « Terminer » et appelle
   *  `onBack` à la place (équivalent de `Navigator.maybePop()`). */
  onNext: (next: ScScene) => void;
}

type Stage = 'intro' | 'dialogue';

function learnerTurnAt(scene: ScScene, idx: number, learner: 'a' | 'b', rolePlay: boolean): boolean {
  if (!rolePlay || idx >= scene.lines.length) return false;
  const line = scene.lines[idx];
  return !scLineIsNarration(line) && line.who === learner;
}

/** Reproduit exactement la boucle de `_advance()` (spec §8.2 point 3) : les
 *  narrations révélées sont groupées avec la réplique suivante, sauf quand
 *  celle-ci est au tour de l'apprenant — dans ce cas on s'arrête. */
function computeAdvance(scene: ScScene, from: number, learner: 'a' | 'b', rolePlay: boolean): number {
  if (from >= scene.lines.length) return from;
  let shown = from + 1;
  while (
    shown < scene.lines.length &&
    scLineIsNarration(scene.lines[shown - 1]) &&
    !learnerTurnAt(scene, shown, learner, rolePlay)
  ) {
    shown++;
  }
  return shown;
}

function Pill({
  label, icon: Icon, background = AP_COLORS.goldTint, foreground = AP_COLORS.goldDeep,
}: {
  label: string;
  icon?: IconComp;
  background?: string;
  foreground?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-[5px] text-[11.5px] font-bold" style={{ backgroundColor: background, color: foreground }}>
      {Icon && <Icon className="h-3.5 w-3.5" style={{ color: foreground }} />}
      <span>{label}</span>
    </span>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <p className="mb-2.5 mt-[18px] text-[11.5px] font-bold uppercase tracking-wide" style={{ color: AP_COLORS.muted }}>
      {title}
    </p>
  );
}

function PrimaryButton({ label, icon: Icon, onClick }: { label: string; icon: IconComp; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-base font-extrabold"
      style={{ backgroundColor: AP_COLORS.gold, color: AP_COLORS.goldInk }}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

function SecondaryButton({ label, icon: Icon, onClick }: { label: string; icon: IconComp; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border text-sm font-bold"
      style={{ borderColor: AP_COLORS.lineStrong, backgroundColor: AP_COLORS.surface, color: AP_COLORS.ink }}
    >
      <Icon className="h-[18px] w-[18px]" style={{ color: AP_COLORS.goldDeep }} />
      <span>{label}</span>
    </button>
  );
}

function Avatar({ name, mine }: { name: string; mine: boolean }) {
  const initial = name.length === 0 ? '?' : name.slice(0, 1).toUpperCase();
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold"
      style={{ backgroundColor: mine ? AP_COLORS.gold : AP_COLORS.ink, color: mine ? AP_COLORS.goldInk : '#FFFFFF' }}
    >
      {initial}
    </div>
  );
}

function ModeCard({
  icon: Icon, title, line, selected, onClick,
}: {
  icon: IconComp;
  title: string;
  line: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-[20px] border p-3 text-left"
      style={{
        backgroundColor: selected ? AP_COLORS.goldGlow : AP_COLORS.surface,
        borderColor: selected ? AP_COLORS.gold : AP_COLORS.line,
      }}
    >
      <Icon className="h-5 w-5" style={{ color: selected ? AP_COLORS.goldDeep : AP_COLORS.muted }} />
      <p className="mt-1.5 text-sm font-extrabold" style={{ color: AP_COLORS.ink }}>{title}</p>
      <p className="text-[11.5px]" style={{ color: AP_COLORS.muted }}>{line}</p>
    </button>
  );
}

/** Meilleur effort, hors-ligne : synthèse vocale du navigateur (pas de voix
 *  bariba disponible côté navigateur — même repli que le bouton « Lire la
 *  consigne » déjà présent dans `ApSessionScreen.tsx`). Équivalent réduit de
 *  `ApAudioButton` (spec §13.4) : pas de bibliothèque de voix de référence
 *  pré-enregistrées côté web pour l'instant. */
function speakBariba(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // Synthèse vocale indisponible sur cet appareil — pas de repli nécessaire.
  }
}

function AudioButton({ text, size = 30, dark = false }: { text: string; size?: number; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); speakBariba(text); }}
      aria-label={`Écouter : ${text}`}
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: dark ? 'rgba(255,255,255,0.18)' : AP_COLORS.goldTint }}
    >
      <Volume2 style={{ width: size * 0.5, height: size * 0.5, color: dark ? '#FFFFFF' : AP_COLORS.goldDeep }} />
    </button>
  );
}

function Narration({ text }: { text: string }) {
  return (
    <p className="px-[18px] py-2 text-center text-[12px] italic" style={{ color: QUIET }}>
      {text}
    </p>
  );
}

function SceneBubble({ line, name, mine, showFrench }: { line: ScLine; name: string; mine: boolean; showFrench: boolean }) {
  return (
    <div className={`mb-2.5 flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] px-3.5 py-2.5"
        style={{
          backgroundColor: mine ? AP_COLORS.ink : AP_COLORS.surface,
          border: mine ? 'none' : `1px solid ${AP_COLORS.line}`,
          borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        }}
      >
        <p className="text-[11px] font-extrabold" style={{ color: mine ? AP_COLORS.goldTint : AP_COLORS.goldDeep }}>{name}</p>
        <div className="mt-0.5 flex items-start gap-1.5">
          <p className="min-w-0 flex-1 text-[17px] font-bold" style={{ color: mine ? '#FFFFFF' : AP_COLORS.ink }}>{line.ba}</p>
          <AudioButton text={line.ba} size={30} dark={mine} />
        </div>
        {showFrench && (
          <p className="mt-[3px] text-xs" style={{ color: mine ? NIGHT_TEXT : QUIET }}>{line.fr}</p>
        )}
        <p className="mt-1 text-[10.5px]" style={{ color: mine ? NIGHT_TEXT : AP_COLORS.muted }}>
          {scLineVerified(line) ? scLineSource(line) : `${scLineSource(line)} · à valider`}
        </p>
      </div>
    </div>
  );
}

export default function ApSceneDetailScreen({ scene, content, progress, store, onBack, onNext }: ApSceneDetailScreenProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [learner, setLearner] = useState<'a' | 'b'>(scene.learner);
  const [rolePlay, setRolePlay] = useState(true);
  const [showFrench, setShowFrench] = useState(true);
  const [hint, setHint] = useState(false);
  const [shown, setShown] = useState(0);
  const [quiz, setQuiz] = useState<ApTask[] | null>(null);
  const recordedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const finished = shown >= scene.lines.length;
  const learnerTurn = learnerTurnAt(scene, shown, learner, rolePlay);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, stage]);

  const start = (learnerOverride?: 'a' | 'b') => {
    const learnerVal = learnerOverride ?? learner;
    setStage('dialogue');
    setHint(false);
    const initial = learnerTurnAt(scene, 0, learnerVal, rolePlay) ? 0 : computeAdvance(scene, 0, learnerVal, rolePlay);
    setShown(initial);
    if (initial >= scene.lines.length) {
      progress.markPlayed(scene.id);
      progress.save();
    }
  };

  const advance = () => {
    setHint(false);
    if (finished) return;
    const next = computeAdvance(scene, shown, learner, rolePlay);
    setShown(next);
    if (next >= scene.lines.length) {
      progress.markPlayed(scene.id);
      progress.save();
    }
  };

  const swapRole = () => {
    const next = scene.otherRole(learner);
    setLearner(next);
    start(next);
  };

  const goNextScene = () => {
    const next = content.after(scene);
    if (next) onNext(next); else onBack();
  };

  const category = content.categoryById(scene.category);
  const hasBest = scene.id in progress.best;
  const best = progress.best[scene.id];
  const visible = scene.lines.slice(0, shown);
  const current = !finished ? scene.lines[shown] : undefined;

  if (quiz) {
    return (
      <ApSessionScreen
        title={scene.title}
        tasks={quiz}
        store={store}
        sessionKey={`scene:${scene.id}`}
        onFinish={(result) => {
          // Un seul enregistrement par lancement du quiz — sur la première
          // fin de séance (le passage complet), pas sur d'éventuelles
          // reprises d'erreurs (« Mes erreurs »), qui ne portent que sur un
          // sous-ensemble des tâches et fausseraient le score de scène.
          if (recordedRef.current) return;
          recordedRef.current = true;
          progress.recordScore(scene.id, sessionPercent(result));
          progress.save();
        }}
        onClose={() => {
          setQuiz(null);
          recordedRef.current = false;
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col" style={{ backgroundColor: AP_COLORS.ivory }}>
      <div className="shrink-0 pb-4" style={{ background: `linear-gradient(135deg, ${AP_COLORS.clay}, ${AP_COLORS.goldDeep})` }}>
        <div className="flex items-center gap-3 px-4 pb-1 pt-3">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.14)' }}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-white">{category?.title ?? 'Scène de vie'}</p>
            <p className="truncate text-xs text-white/80">{scene.place}</p>
          </div>
          {stage === 'dialogue' && (
            <button onClick={() => setShowFrench((v) => !v)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white">
              {showFrench ? 'Masquer FR' : 'Voir FR'}
            </button>
          )}
        </div>
        <p className="px-5 pt-0.5 text-[24px] font-bold leading-tight text-white">{scene.title}</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {stage === 'intro' ? (
          <div className="mx-auto max-w-2xl px-5 pb-6 pt-4">
            <div className="flex gap-2">
              <Pill label={`Niveau ${scene.level}`} icon={SignalHigh} />
              <Pill label={`${scene.spoken.length} répliques`} icon={MessagesSquare} background={AP_COLORS.surfaceAlt} foreground={AP_COLORS.inkSoft} />
            </div>
            <p className="mt-3.5 text-[15px]" style={{ color: AP_COLORS.inkSoft }}>{scene.intro}</p>

            <SectionTitle title="Les personnages" />
            {(['a', 'b'] as const).map((who) => (
              <button
                key={who}
                onClick={() => setLearner(who)}
                className="mb-2 flex w-full items-center gap-3 rounded-[18px] border p-3 text-left"
                style={{
                  backgroundColor: who === learner ? AP_COLORS.goldGlow : AP_COLORS.surface,
                  borderColor: who === learner ? AP_COLORS.gold : AP_COLORS.line,
                }}
              >
                <Avatar name={scene.roleName(who)} mine={who === learner} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color: AP_COLORS.ink }}>{scene.roleLabel(who)}</span>
                {who === learner && <Pill label="Ton rôle" icon={Mic} />}
              </button>
            ))}
            <p className="text-[11.5px]" style={{ color: AP_COLORS.muted }}>Touche un personnage pour choisir ton rôle.</p>

            <SectionTitle title="Mots de la scène" />
            <div className="flex flex-wrap gap-2">
              {scene.vocab.map((word, i) => (
                <div key={i} className="rounded-[14px] border px-3 py-2" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
                  <p className="text-[15px] font-bold" style={{ color: AP_COLORS.ink }}>{word.ba}</p>
                  <p className="text-[11.5px]" style={{ color: AP_COLORS.muted }}>{word.fr}</p>
                </div>
              ))}
            </div>

            <SectionTitle title="Comment jouer ?" />
            <div className="flex gap-2.5">
              <ModeCard icon={Mic} title="Jouer mon rôle" line="Je dis mes répliques à voix haute." selected={rolePlay} onClick={() => setRolePlay(true)} />
              <ModeCard icon={Ear} title="Écouter" line="Je suis la scène réplique par réplique." selected={!rolePlay} onClick={() => setRolePlay(false)} />
            </div>

            <div className="mt-[18px]">
              <PrimaryButton label="Commencer la scène" icon={Play} onClick={() => start()} />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-4 pb-5 pt-4">
            {visible.map((line, i) =>
              scLineIsNarration(line) ? (
                <Narration key={i} text={line.fr} />
              ) : (
                <SceneBubble key={i} line={line} name={scene.roleName(line.who)} mine={line.who === learner} showFrench={showFrench} />
              ),
            )}
            {finished && (
              <>
                <div className="mt-2 flex items-start gap-2.5 rounded-[18px] p-3.5" style={{ backgroundColor: AP_COLORS.sageTint }}>
                  <Flame className="h-5 w-5 shrink-0" style={{ color: AP_COLORS.sageInk }} />
                  <p className="text-sm" style={{ color: AP_COLORS.sageInk }}>{scene.culture}</p>
                </div>
                <div className="mt-4 space-y-2.5">
                  <PrimaryButton
                    label={hasBest ? `Refaire le test (meilleur : ${best} %)` : 'Tester ma compréhension'}
                    icon={ListChecks}
                    onClick={() => setQuiz(buildSceneQuiz(scene))}
                  />
                  <SecondaryButton label="Rejouer avec l’autre rôle" icon={ArrowRightLeft} onClick={swapRole} />
                  <SecondaryButton
                    label={content.after(scene) === undefined ? 'Terminer' : 'Scène suivante'}
                    icon={ArrowRight}
                    onClick={goNextScene}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {stage === 'dialogue' && !finished && current && (
        <div className="shrink-0 border-t px-5 pb-[18px] pt-3" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
          {learnerTurn && (
            <>
              <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: AP_COLORS.goldDeep }}>
                À toi, {scene.roleName(learner)} : dis en bàátɔ̀nú
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: AP_COLORS.ink }}>« {current.fr} »</p>
              <div className="mt-1.5 flex items-center gap-2">
                {hint ? (
                  <>
                    <p className="text-lg font-bold" style={{ color: AP_COLORS.ink }}>{current.ba}</p>
                    <AudioButton text={current.ba} size={36} />
                  </>
                ) : (
                  <button onClick={() => setHint(true)} className="flex items-center gap-1.5 text-sm font-bold" style={{ color: AP_COLORS.goldDeep }}>
                    <Eye className="h-[18px] w-[18px]" /> Voir la réplique
                  </button>
                )}
              </div>
              <div className="mb-2 mt-1.5">
                <button
                  disabled
                  title="Enregistrement vocal bientôt disponible sur le web"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold opacity-50"
                  style={{ borderColor: AP_COLORS.lineStrong, color: AP_COLORS.muted }}
                >
                  <Mic className="h-3.5 w-3.5" /> Comparer ma voix
                </button>
              </div>
            </>
          )}
          <PrimaryButton label={learnerTurn ? 'Je l’ai dit' : 'Suite'} icon={learnerTurn ? Mic : ArrowDown} onClick={advance} />
        </div>
      )}
    </div>
  );
}
