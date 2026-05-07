import { cn } from '@/lib/utils';

export default function QualityBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const tier = score >= 80 ? 'good' : score >= 60 ? 'mid' : 'bad';
  const label = tier === 'good' ? 'Excellent' : tier === 'mid' ? 'Acceptable' : 'À refaire';
  const cls = tier === 'good'
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
    : tier === 'mid'
    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full border', cls)}>
      ⭐ {score} · {label}
    </span>
  );
}