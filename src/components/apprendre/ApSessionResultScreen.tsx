// Portage fidèle de `ApResultScreen` (fitila_flutter/lib/apprendre/apprendre_session.dart,
// branche feat/apprendre-v2.4-build19-20260927) — écran de fin de séance :
// anneau de score, titre, points, série, détail par type d'exercice, mots à
// retenir, message de rétention et reprise des erreurs.
//
// Toute la logique de calcul (pourcentage, titre, répartition par
// compétence, message de rétention, icône par compétence) vient de
// `src/lib/apprendre/session.ts`, déjà porté et vérifié — ce composant ne
// fait que l'afficher.

import type { CSSProperties, ComponentType } from 'react';
import { Star, Flame, Zap, RotateCcw, HelpCircle, Eye, Languages, TextCursor, Copy, Clock, Shuffle, Mic, GraduationCap } from 'lucide-react';
import { type ApTask, skillLabel } from '@/lib/apprendre/tasks';
import type { ApprendreStore } from '@/lib/apprendre/store';
import { PASS_MARK } from '@/lib/apprendre/store';
import {
  type ApSessionResult,
  type ApSkillIconName,
  sessionPercent,
  sessionHeadline,
  skillBreakdown,
  retentionMessage,
  skillIconName,
} from '@/lib/apprendre/session';
import { AP_COLORS } from './apColors';

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

export interface ApSessionResultScreenProps {
  /** Titre de la séance qui vient de se terminer (ex. « Séance du jour »). */
  title: string;
  result: ApSessionResult;
  /** Tâches ratées, pour la section « À retenir » et le bouton de reprise. */
  missed: readonly ApTask[];
  /** Progression, pour afficher la série et les mots actifs. */
  store: ApprendreStore;
  /** `null` hors test de fondation ; sinon `percent >= PASS_MARK` de cette séance. */
  foundationPassed: boolean | null;
  /** Présent seulement s'il reste des erreurs à rejouer. */
  onRetry?: () => void;
  onClose: () => void;
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

function PercentRing({ percent, color, size = 132 }: { percent: number; color: string; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${percent} pour cent`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={AP_COLORS.line} strokeWidth={stroke} />
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
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.19} fontWeight={800} fill={AP_COLORS.ink}>
        {percent} %
      </text>
    </svg>
  );
}

export default function ApSessionResultScreen({ title, result, missed, store, foundationPassed, onRetry, onClose }: ApSessionResultScreenProps) {
  const percent = sessionPercent(result);
  const headline = sessionHeadline(percent, foundationPassed);
  const skills = skillBreakdown(result);
  const progress = store.progress;
  const ringColor = percent >= PASS_MARK ? AP_COLORS.sage : AP_COLORS.clay;

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto" style={{ backgroundColor: AP_COLORS.ivory, color: AP_COLORS.ink }}>
      <div className="mx-auto max-w-lg px-5 pb-8 pt-8">
        <div className="flex justify-center">
          <PercentRing percent={percent} color={ringColor} />
        </div>

        <h1 className="mt-4.5 text-center text-[28px] font-extrabold leading-tight" style={{ color: AP_COLORS.ink }}>
          {headline}
        </h1>
        <p className="mt-1.5 text-center text-sm" style={{ color: AP_COLORS.muted }}>
          {title} · {result.correct} bonnes réponses sur {result.total}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: AP_COLORS.goldTint, color: AP_COLORS.goldDeep }}>
            <Star className="h-3.5 w-3.5" /> +{result.xpGained} points
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: AP_COLORS.clayTint, color: AP_COLORS.clayInk }}>
            <Flame className="h-3.5 w-3.5" /> {progress.streak} j de suite
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: AP_COLORS.sageTint, color: AP_COLORS.sageInk }}>
            <Zap className="h-3.5 w-3.5" /> {progress.activeWords} mots actifs
          </span>
        </div>

        {foundationPassed === false && (
          <p className="mt-2.5 text-center text-xs" style={{ color: AP_COLORS.muted }}>
            Il faut {PASS_MARK} % pour valider. Relis la leçon puis réessaie.
          </p>
        )}

        {skills.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-[15px] font-extrabold" style={{ color: AP_COLORS.ink }}>Par type d’exercice</h2>
            <div className="rounded-[20px] border px-3.5 py-1" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
              {skills.map(({ skill, total, correct }) => {
                const ratio = total === 0 ? 0 : correct / total;
                const barColor = ratio >= 0.6 ? AP_COLORS.sage : AP_COLORS.clay;
                const Icon = SKILL_ICON_COMPONENTS[skillIconName(skill)];
                return (
                  <div key={skill} className="flex items-center gap-3 py-2">
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px]" style={{ backgroundColor: AP_COLORS.goldTint }}>
                      <Icon className="h-[18px] w-[18px]" style={{ color: AP_COLORS.goldDeep }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-bold" style={{ color: AP_COLORS.ink }}>{skillLabel(skill)}</span>
                        <span className="shrink-0 text-xs" style={{ color: AP_COLORS.muted }}>{correct} / {total}</span>
                      </div>
                      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: AP_COLORS.line }}>
                        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {missed.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-[15px] font-extrabold" style={{ color: AP_COLORS.ink }}>À retenir</h2>
            <div className="space-y-2">
              {missed.slice(0, 6).map((task, i) => (
                <div key={`${task.cardId ?? task.answer}-${i}`} className="rounded-[16px] border p-3.5" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
                  <p className={task.promptIsBariba ? 'text-[16px] font-bold' : 'text-sm font-bold'} style={{ color: AP_COLORS.ink }}>{task.prompt}</p>
                  <p className={`mt-1 ${task.optionsAreBariba ? 'font-bold' : ''} text-[15px]`} style={{ color: AP_COLORS.sageInk }}>{task.answer}</p>
                  <div className="mt-1.5">
                    <SourceTag source={task.source} verified={task.verified} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-center text-xs" style={{ color: AP_COLORS.muted }}>
          {retentionMessage(missed.length)}
        </p>

        <div className="mt-5 space-y-2.5">
          {missed.length > 0 && onRetry && (
            <button
              onClick={onRetry}
              className="flex w-full items-center justify-center gap-2 rounded-full border py-3.5 text-sm font-bold"
              style={{ borderColor: AP_COLORS.lineStrong, color: AP_COLORS.ink, backgroundColor: AP_COLORS.surface }}
            >
              <RotateCcw className="h-4 w-4" /> Refaire mes erreurs ({missed.length})
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-full py-3.5 text-sm font-extrabold"
            style={{ backgroundColor: AP_COLORS.gold, color: AP_COLORS.goldInk }}
          >
            Retour au parcours
          </button>
        </div>
      </div>
    </div>
  );
}
