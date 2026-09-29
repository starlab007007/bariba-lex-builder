// Portage fidèle de `ApFoundationScreen` (fitila_flutter/lib/apprendre/apprendre_foundation.dart,
// branche feat/apprendre-v2.4-build19-20260927) — leçon de fondation : en-tête,
// sections (explications, astuces, exemples, culture, tableaux, paires
// minimales, ordre des mots), puis test « TESTE TES ACQUIS ».
//
// Référence : apprendre_v24_spec.md §12.1 (structure exacte de l'écran) —
// le rendu de chaque section vient de `ApFoundationSections.tsx` (§12.2/§12.3).
//
// Composant autonome et piloté par les props, à l'image de `ApReviewScreen.tsx`/
// `ApSceneDetailScreen.tsx` : un futur écran Hub (délégué séparément) le
// montera avec un `ApFoundation` et une `ApprendreContent`/`ApprendreStore`
// déjà chargées. Le test de fin de fondation est lancé exactement comme le
// Dart source : `ApTaskFactory(content).foundationQuiz(unit)` monté dans
// `ApSessionScreen` avec `foundationId: unit.id`, plein écran par-dessus —
// c'est `ApSessionRunner.finish()` (session.ts, déjà câblé) qui enregistre
// le score de fondation (+30 XP de bonus au seuil de 60 %) via
// `progress.recordFoundation`, pas ce composant.

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Play } from 'lucide-react';
import { type ApFoundation, type ApprendreContent } from '@/lib/apprendre/content';
import type { ApprendreStore } from '@/lib/apprendre/store';
import { type ApTask, ApTaskFactory } from '@/lib/apprendre/tasks';
import { AP_COLORS } from './apColors';
import { apIcon, ApSectionView } from './ApFoundationSections';
import ApSessionScreen from './ApSessionScreen';

export interface ApFoundationScreenProps {
  unit: ApFoundation;
  content: ApprendreContent;
  store: ApprendreStore;
  /** Quitter la leçon (bouton retour de l'en-tête) — retour au hub. */
  onBack: () => void;
}

function Pill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-[5px] text-[11.5px] font-bold"
      style={{ backgroundColor: AP_COLORS.sageTint, color: AP_COLORS.sageInk }}
    >
      <Check className="h-3.5 w-3.5" style={{ color: AP_COLORS.sageInk }} />
      <span>{label}</span>
    </span>
  );
}

export default function ApFoundationScreen({ unit, content, store, onBack }: ApFoundationScreenProps) {
  const factory = useMemo(() => new ApTaskFactory(content), [content]);
  const [quizTasks, setQuizTasks] = useState<ApTask[] | null>(null);
  // Bumpé à la fermeture de la séance pour relire `store.progress` (mutée en
  // place par `ApSessionRunner.finish()`), à l'image du `setState(() {})`
  // du Dart après le retour de `Navigator.push`.
  const [refreshKey, setRefreshKey] = useState(0);

  const best = useMemo(() => store.progress.foundationScores[unit.id], [store, unit.id, refreshKey]);
  const done = useMemo(() => store.progress.foundationDone(unit.id), [store, unit.id, refreshKey]);

  const startQuiz = () => setQuizTasks(factory.foundationQuiz(unit));
  const closeQuiz = () => {
    setQuizTasks(null);
    setRefreshKey((k) => k + 1);
  };

  if (quizTasks) {
    return (
      <ApSessionScreen
        title={unit.title_fr}
        tasks={quizTasks}
        store={store}
        sessionKey={`fondation:${unit.id}`}
        foundationId={unit.id}
        onClose={closeQuiz}
      />
    );
  }

  const UnitIcon = apIcon(unit.icon);

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: AP_COLORS.ivory, paddingInline: 'max(0px, calc((100% - 900px) / 2))' }}>
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: AP_COLORS.ink }} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold leading-tight" style={{ color: AP_COLORS.ink }}>
              Fondation {unit.order}
            </h1>
            <p className="truncate text-xs" style={{ color: AP_COLORS.muted }}>
              {unit.minutes} min · {unit.quiz.length} questions
            </p>
          </div>
          {done && <Pill label="Validée" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 pb-7 pt-2">
          <div className="flex items-start gap-3.5">
            <div
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: AP_COLORS.goldTint }}
            >
              <UnitIcon className="h-6 w-6" style={{ color: AP_COLORS.goldDeep }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[26px] font-semibold leading-[1.15]" style={{ color: AP_COLORS.ink }}>
                {unit.title_fr}
              </p>
              {unit.title_ba && unit.title_ba.length > 0 && (
                <p className="text-[15px] font-bold" style={{ color: AP_COLORS.goldDeep }}>{unit.title_ba}</p>
              )}
            </div>
          </div>

          <p className="mt-3 text-[15px] leading-[1.45]" style={{ color: AP_COLORS.inkSoft }}>{unit.summary}</p>

          {unit.sections.map((section, i) => (
            <div key={i} className="mt-[18px]">
              <ApSectionView section={section} />
            </div>
          ))}

          <div
            className="mt-[26px] rounded-[26px] p-[18px]"
            style={{ backgroundColor: AP_COLORS.night }}
          >
            <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: AP_COLORS.goldTint }}>
              TESTE TES ACQUIS
            </p>
            <p className="mt-1.5 text-xl font-semibold leading-[1.15] text-white">
              {best === undefined
                ? `${unit.quiz.length} questions · 60 % pour valider`
                : `Meilleur score : ${best} %`}
            </p>
            <button
              onClick={startQuiz}
              className="mt-3.5 flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-base font-extrabold"
              style={{ backgroundColor: AP_COLORS.gold, color: AP_COLORS.goldInk }}
            >
              <Play className="h-5 w-5" />
              <span>{best === undefined ? 'Commencer le test' : 'Refaire le test'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
