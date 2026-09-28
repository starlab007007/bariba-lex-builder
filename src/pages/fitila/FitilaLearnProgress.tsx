// Écran « Ma progression » — portage de l'écran Flutter Build19 (phone_learn_progress).
import { useMemo, useState } from 'react';
import { useApprendreContent } from '@/lib/apprendre/contentLoader';
import { ApprendreStore } from '@/lib/apprendre/store';
import { AP_COLORS as C } from '@/components/apprendre/apColors';
import { apIcon } from '@/components/apprendre/ApFoundationSections';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';

const DISPLAY = { fontFamily: 'Fraunces, ui-serif, Georgia, serif' } as const;
const DAYS = ['Aujourd’hui', 'J+1', 'J+2', 'J+3', 'J+4', 'J+5', 'J+6'];
const SHORT_DAYS = ['Auj.', 'J+1', 'J+2', 'J+3', 'J+4', 'J+5', 'J+6'];

function Bar({ ratio, color = C.gold }: { ratio: number; color?: string }) {
  return (
    <div className="h-[6px] overflow-hidden rounded-full" style={{ background: C.surfaceAlt }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, background: color }} />
    </div>
  );
}

export default function FitilaLearnProgress() {
  const { data, isLoading, error } = useApprendreContent();
  const [store] = useState(() => ApprendreStore.open());
  const progress = store.progress;
  const now = useMemo(() => Date.now(), []);
  const forecast = useMemo(() => progress.dueForecast(now), [progress, now]);

  if (isLoading) return <div className="flex h-full items-center justify-center" style={{ background: C.ivory }}>Chargement…</div>;
  if (error || !data?.content) return <div className="flex h-full items-center justify-center" style={{ background: C.ivory }}>Progression indisponible.</div>;

  const content = data.content;
  const max = Math.max(1, ...forecast);
  const stats: [string, string, number, string][] = [
    ['Mots actifs', String(progress.activeWords), content.cards.size ? progress.activeWords / content.cards.size : 0, C.sage],
    ['Fondations', `${progress.foundationsDone}/${content.foundations.length}`, content.foundations.length ? progress.foundationsDone / content.foundations.length : 0, C.sage],
    ['Jours de suite', String(progress.streak), Math.min(1, progress.streak / 7), C.clay],
    ['Points', String(progress.xp), (progress.xp % 500) / 500, C.goldDeep],
  ];

  return (
    <div className="h-full overflow-y-auto pb-28" style={{ background: C.ivory, color: C.ink }}>
      <FitilaPageHeader title="Ma progression" subtitle="Enregistrée sur cet appareil" />
      <div className="mx-auto max-w-[900px] px-5 pt-1">
        <div className="grid grid-cols-2 gap-[10px]">
          {stats.map(([label, value, ratio, color]) => (
            <div key={label} className="rounded-[18px] border bg-white p-[14px]" style={{ borderColor: C.line }}>
              <div className="text-[12.5px]" style={{ color: C.muted }}>{label}</div>
              <div className="mb-3 mt-0.5 text-[24px] font-semibold leading-none" style={DISPLAY}>{value}</div>
              <Bar ratio={ratio} color={color} />
            </div>
          ))}
        </div>

        <h2 className="mb-3 mt-[22px] text-[17px] font-extrabold">Révisions à venir</h2>
        <div className="rounded-[20px] border bg-white p-[16px]" style={{ borderColor: C.line }}>
          <h3 className="text-[19px] font-semibold" style={DISPLAY}>
            {forecast[0] === 0 ? 'Rien à revoir aujourd’hui' : `${forecast[0]} mot${forecast[0] > 1 ? 's' : ''} à revoir aujourd’hui`}
          </h3>
          <p className="mt-1 text-[13px]" style={{ color: C.muted }}>
            Chaque mot revient juste avant d’être oublié : 1, 2, 4, 8… jours.
          </p>
          <div className="mt-4 flex h-[120px] items-end gap-2">
            {forecast.map((n, i) => (
              <div key={DAYS[i]} className="flex flex-1 flex-col items-center justify-end">
                <div className="text-[12px] font-bold">{n}</div>
                <div className="mt-1 w-full rounded-t-[8px]" style={{ height: 4 + (80 * n) / max, background: i === 0 ? C.clay : C.gold }} />
                <div className="mt-2 text-[10.5px]" style={{ color: C.muted }}>{SHORT_DAYS[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="mb-3 mt-[22px] text-[17px] font-extrabold">Par thème</h2>
        <div className="space-y-[14px]">
          {content.themes.map((theme) => {
            const learned = progress.learnedIn(theme);
            const total = theme.cards.length;
            const Icon = apIcon(theme.icon);
            return (
              <div key={theme.id} className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0" style={{ color: theme.color || C.goldDeep }} />
                <span className="w-[128px] shrink-0 truncate text-[12.5px]">{theme.name_fr}</span>
                <div className="flex-1"><Bar ratio={total ? learned / total : 0} color={theme.color || C.gold} /></div>
                <span className="w-[54px] shrink-0 text-right text-[12px] font-bold" style={{ color: C.muted }}>{learned}/{total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
