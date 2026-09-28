// Portage fidèle de `ApReviewScreen` (fitila_flutter/lib/apprendre/apprendre_review.dart,
// branche feat/apprendre-v2.4-build19-20260927) — module Révision : mots à
// revoir, boîtes de mémoire (Leitner), prévisions à 7 jours, et lancement des
// trois types de séance (révision, entraînement libre, séance du jour).
//
// Composant réutilisable et autonome : un futur écran Hub (hors périmètre de
// cette tâche) le montera avec une `ApprendreContent` et un `ApprendreStore`
// déjà ouverts. La séance elle-même (choix/ordre/prononciation, score, XP,
// SRS) vient entièrement de `ApSessionScreen`, déjà porté et vérifié — ce
// composant ne fait que construire les listes de tâches et l'afficher en
// plein écran par-dessus.

import { useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import {
  ArrowLeft,
  Zap,
  Eye,
  CheckCircle2,
  ChevronRight,
  Play,
  Dumbbell,
  Languages,
  TextCursor,
  Copy,
  Clock,
  Shuffle,
  Mic,
  GraduationCap,
} from 'lucide-react';
import { type ApCard, ApprendreContent } from '@/lib/apprendre/content';
import type { ApprendreStore } from '@/lib/apprendre/store';
import { type ApTask, ApTaskFactory, skillLabel } from '@/lib/apprendre/tasks';
import { ApSessionPlanner, skillsFor } from '@/lib/apprendre/planner';
import { type ApSkillIconName, skillIconName } from '@/lib/apprendre/session';
import { AP_COLORS } from './apColors';
import ApSessionScreen from './ApSessionScreen';

export interface ApReviewScreenProps {
  content: ApprendreContent;
  store: ApprendreStore;
  /** Quitter le module Révision (bouton retour de l'en-tête). */
  onBack: () => void;
  /** Ouvre la fiche détaillée d'un mot (équivalent de `showApWordSheet` côté
   *  Dart) — non fourni par cette tâche : chaque ligne de la liste « À revoir
   *  avant d'oublier » reste un bouton, mais ne fait rien si absent. */
  onWordTap?: (card: ApCard) => void;
}

/** Les 7 boîtes de Leitner affichées (la boîte 0 — mots jamais revus — n'est
 *  jamais montrée séparément, spec §5.3). */
const BOX_LABELS = ['1 j', '2 j', '4 j', '8 j', '16 j', '32 j', '64 j'];
const FORECAST_DAYS = ['Auj.', 'J+1', 'J+2', 'J+3', 'J+4', 'J+5', 'J+6'];

const SKILL_ICON_COMPONENTS: Record<ApSkillIconName, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  eye: Eye,
  languages: Languages,
  'text-cursor': TextCursor,
  copy: Copy,
  clock: Clock,
  shuffle: Shuffle,
  mic: Mic,
  'graduation-cap': GraduationCap,
};

/** État de la séance actuellement ouverte en plein écran (ou `null`). */
interface ActiveSession {
  title: string;
  tasks: ApTask[];
  sessionKey: string;
  foundationId?: string;
}

function StatCard({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: number;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
}) {
  return (
    <div className="rounded-[20px] border p-3" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
      <Icon className="h-[18px] w-[18px]" style={{ color }} />
      <p className="mt-1.5 text-2xl font-extrabold" style={{ color: AP_COLORS.ink }}>{value}</p>
      <p className="text-[11.5px]" style={{ color: AP_COLORS.muted }}>{label}</p>
    </div>
  );
}

function PrimaryButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
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

function SecondaryButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border text-sm font-bold disabled:opacity-40"
      style={{ borderColor: AP_COLORS.lineStrong, backgroundColor: AP_COLORS.surface, color: AP_COLORS.ink }}
    >
      <Icon className="h-[18px] w-[18px]" style={{ color: AP_COLORS.goldDeep }} />
      <span>{label}</span>
    </button>
  );
}

function SectionTitle({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <div className="flex items-end justify-between pb-2.5 pt-5">
      <h2 className="text-[17px] font-extrabold" style={{ color: AP_COLORS.ink }}>{title}</h2>
      {trailing && <span className="text-[13px]" style={{ color: AP_COLORS.muted }}>{trailing}</span>}
    </div>
  );
}

/** Anneau de rétention — même technique que `PercentRing` dans
 *  `ApSessionResultScreen.tsx`, redimensionné (44px, trait 6) et recoloré
 *  pour reproduire `ApRing` (apprendre_ui.dart) tel qu'utilisé par `_WordRow`. */
function RetentionRing({ value, label, color, size = 44 }: { value: number; label: string; color: string; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={AP_COLORS.surfaceAlt} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.24} fontWeight={800} fill={AP_COLORS.ink}>
        {label}
      </text>
    </svg>
  );
}

function WordRow({ card, retention, onClick }: { card: ApCard; retention: number; onClick: () => void }) {
  const pct = Math.round(retention * 100);
  const color = pct < 50 ? AP_COLORS.clay : pct < 70 ? AP_COLORS.gold : AP_COLORS.sage;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] border px-3.5 py-2.5 text-left"
      style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}
    >
      <RetentionRing value={retention} label={`${pct} %`} color={color} />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold" style={{ color: AP_COLORS.ink }}>{card.ba}</p>
        <p className="truncate text-sm" style={{ color: AP_COLORS.muted }}>{card.fr}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0" style={{ color: AP_COLORS.muted }} />
    </button>
  );
}

function Pill({ label, icon: Icon }: { label: string; icon: ComponentType<{ className?: string; style?: CSSProperties }> }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-xl px-2.5 py-[5px] text-[11.5px] font-bold"
      style={{ backgroundColor: AP_COLORS.surfaceAlt, color: AP_COLORS.inkSoft }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: AP_COLORS.inkSoft }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export default function ApReviewScreen({ content, store, onBack, onWordTap }: ApReviewScreenProps) {
  const factory = useMemo(() => new ApTaskFactory(content), [content]);
  const planner = useMemo(() => new ApSessionPlanner(content), [content]);
  // Recalculée après chaque retour de séance (`ApSessionScreen.onClose`), pour
  // refléter la progression fraîchement mutée par `ApSessionRunner` — reproduit
  // le `setState(() {})` du `_run()` Dart, qui suit chaque `Navigator.push`.
  const [now, setNow] = useState(() => Date.now());
  const [session, setSession] = useState<ActiveSession | null>(null);

  const progress = store.progress;
  const due = progress.dueCardIds(now);

  const boxes = new Array(7).fill(0) as number[];
  for (const state of Object.values(progress.srs)) {
    boxes[Math.min(Math.max(state.box, 1), 7) - 1]++;
  }
  const maxBox = Math.max(1, ...boxes);

  const forecast = progress.dueForecast(now, 7);
  const maxDue = Math.max(1, ...forecast);

  const runReview = () => {
    const tasks = factory.reviewSession(progress, { now: Date.now() });
    setSession({ title: 'Révision', tasks, sessionKey: 'revision' });
  };
  const runPractice = () => {
    const tasks = planner.practiceSession(progress, Date.now());
    setSession({ title: 'Entraînement libre', tasks, sessionKey: 'entrainement' });
  };
  const runDaily = () => {
    const tasks = planner.dailySession(progress, Date.now());
    setSession({ title: 'Séance du jour', tasks, sessionKey: 'seance_du_jour' });
  };

  const closeSession = () => {
    setSession(null);
    setNow(Date.now());
  };

  if (session) {
    return (
      <ApSessionScreen
        title={session.title}
        tasks={session.tasks}
        store={store}
        sessionKey={session.sessionKey}
        foundationId={session.foundationId}
        onClose={closeSession}
      />
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col" style={{ backgroundColor: AP_COLORS.ivory }}>
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: AP_COLORS.ink }} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold leading-tight" style={{ color: AP_COLORS.ink }}>Révision</h1>
            <p className="truncate text-xs" style={{ color: AP_COLORS.muted }}>Répétition espacée · hors-ligne</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 pb-7 pt-1">
          <div className="flex gap-2.5">
            <div className="flex-1"><StatCard value={due.length} label="À revoir" icon={Zap} color={AP_COLORS.clay} /></div>
            <div className="flex-1"><StatCard value={progress.seenWords} label="Mots vus" icon={Eye} color={AP_COLORS.goldDeep} /></div>
            <div className="flex-1"><StatCard value={progress.activeWords} label="Mots actifs" icon={CheckCircle2} color={AP_COLORS.sage} /></div>
          </div>

          <div className="mt-4">
            {due.length > 0 ? (
              <PrimaryButton label={`Réviser maintenant (${due.length})`} icon={Zap} onClick={runReview} />
            ) : (
              <div className="rounded-[20px] border p-3.5" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
                <p className="text-sm" style={{ color: AP_COLORS.inkSoft }}>
                  {progress.seenWords === 0
                    ? "Aucun mot à réviser : commence par la séance du jour. Chaque mot appris reviendra ici juste avant d'être oublié."
                    : "Aucun mot ne s'efface aujourd'hui. Tu peux t'entraîner librement ou lancer la séance du jour."}
                </p>
              </div>
            )}
          </div>

          <div className="mt-2.5 flex gap-2.5">
            <div className="flex-1"><SecondaryButton label="Séance du jour" icon={Play} onClick={runDaily} /></div>
            <div className="flex-1">
              <SecondaryButton label="Entraînement" icon={Dumbbell} onClick={runPractice} disabled={progress.seenWords === 0} />
            </div>
          </div>

          {due.length > 0 && (
            <>
              <SectionTitle title="À revoir avant d'oublier" trailing={`${due.length} mots`} />
              <div className="space-y-2">
                {due.slice(0, 20).map((id) => {
                  const card = content.cards.get(id);
                  if (!card) return null;
                  const retention = progress.srs[id]?.retention(now) ?? 0;
                  return (
                    <WordRow key={id} card={card} retention={retention} onClick={() => onWordTap?.(card)} />
                  );
                })}
              </div>
            </>
          )}

          <SectionTitle title="Boîtes de mémoire" />
          <div className="rounded-[20px] border p-4" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
            <div className="flex h-[120px] items-end">
              {boxes.map((count, i) => {
                const color = i < 1 ? AP_COLORS.clay : i < 3 ? AP_COLORS.gold : AP_COLORS.sage;
                const height = 6 + (70 * count) / maxBox;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end px-[3px]">
                    <span className="text-[11px]" style={{ color: AP_COLORS.muted }}>{count}</span>
                    <div className="mt-1 w-full rounded-lg" style={{ height, backgroundColor: color }} />
                    <span className="mt-1.5 text-[10.5px]" style={{ color: AP_COLORS.muted }}>{BOX_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2.5 text-[11.5px]" style={{ color: AP_COLORS.muted }}>
              Une bonne réponse fait monter le mot d&rsquo;une boîte et l&rsquo;espace davantage&nbsp;; une erreur le ramène dans la première boîte.
            </p>
          </div>

          <SectionTitle title="Révisions à venir" />
          <div className="rounded-[20px] border p-4" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
            <div className="flex h-[110px] items-end">
              {forecast.map((count, i) => {
                const color = i === 0 ? AP_COLORS.gold : AP_COLORS.goldTint;
                const height = 4 + (60 * count) / maxDue;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end px-[3px]">
                    <span className="text-[11px]" style={{ color: AP_COLORS.muted }}>{count}</span>
                    <div className="mt-1 w-full rounded-lg" style={{ height, backgroundColor: color }} />
                    <span className="mt-1.5 text-[10.5px]" style={{ color: AP_COLORS.muted }}>{FORECAST_DAYS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <SectionTitle title="Les 7 exercices d'une séance" />
          <div className="flex flex-wrap gap-2">
            {skillsFor(progress.profile).map((skill) => {
              const Icon = SKILL_ICON_COMPONENTS[skillIconName(skill)];
              return <Pill key={skill} label={skillLabel(skill)} icon={Icon} />;
            })}
          </div>
          {progress.profile === 'oral' && (
            <p className="mt-2 text-[11.5px]" style={{ color: AP_COLORS.muted }}>
              Profil «&nbsp;Je ne lis pas encore&nbsp;» : les exercices de lecture de phrase sont remplacés par l&rsquo;écoute et la prononciation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
