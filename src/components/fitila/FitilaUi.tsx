import { ChevronRight, Volume2, type LucideIcon } from 'lucide-react';
import { SIG } from './signatureTheme';

/** Page pleine hauteur au fond Premium Clair. */
export function FitilaPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto pb-6" style={{ background: SIG.appBackground, color: SIG.ink }}>
      {children}
    </div>
  );
}

export type Metric = { label: string; value: string };

/** Bandeau de 3 métriques (Flutter _MetricStrip). */
export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-3 gap-[10px] px-[18px]">
      {metrics.map((m) => (
        <div key={m.label} className="flex h-[80px] flex-col items-center justify-center rounded-[18px] border bg-white px-2" style={{ borderColor: SIG.hairline }}>
          <span className="text-[16px] font-extrabold">{m.value}</span>
          <span className="mt-1 text-[11px]" style={{ color: SIG.muted }}>{m.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Puce sélectionnable (Flutter ChoiceChip). */
export function Chip({ label, icon: Icon, selected, onClick }: { label: string; icon?: LucideIcon; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[13px] font-extrabold transition-colors active:scale-95"
      style={{
        background: selected ? SIG.gold : '#fff',
        borderColor: selected ? SIG.gold : SIG.hairline,
        color: selected ? '#2B2110' : SIG.ink,
      }}
    >
      {Icon && <Icon className="h-[16px] w-[16px]" style={{ color: selected ? '#2B2110' : SIG.goldDeep }} />}
      {label}
    </button>
  );
}

export function ChipWrap({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-x-2 gap-y-[18px] px-[18px]">{children}</div>;
}

export type Feature = { icon: LucideIcon; title: string; desc: string; onClick?: () => void };

/** Grille 2 colonnes de cartes (Flutter _FeatureGrid). */
export function FeatureGrid({ items }: { items: Feature[] }) {
  return (
    <div className="grid grid-cols-2 gap-[10px] px-[18px]">
      {items.map(({ icon: Icon, title, desc, onClick }) => (
        <button
          key={title}
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className="flex h-[132px] flex-col rounded-[18px] border bg-white p-[12px] text-left disabled:cursor-default"
          style={{ borderColor: SIG.hairline }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: SIG.goldDeep }} />
          <span className="mt-auto text-[13px] font-extrabold">{title}</span>
          <span className="mt-1 line-clamp-2 text-[10.5px] leading-[1.35]" style={{ color: SIG.muted }}>{desc}</span>
        </button>
      ))}
    </div>
  );
}

/** Liste de lignes icône + titre + description (Flutter _ActionList). */
export function ActionList({ items }: { items: Feature[] }) {
  return (
    <div className="space-y-[8px] px-[18px]">
      {items.map(({ icon: Icon, title, desc, onClick }) => (
        <button
          key={title}
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className="flex w-full items-center gap-3 rounded-[18px] border bg-white p-[12px] text-left disabled:cursor-default"
          style={{ borderColor: SIG.hairline }}
        >
          <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px]" style={{ background: SIG.goldTint, color: SIG.goldDeep }}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold">{title}</span>
            <span className="mt-0.5 block text-[11px] leading-[1.35]" style={{ color: SIG.muted }}>{desc}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" style={{ color: SIG.muted }} />
        </button>
      ))}
    </div>
  );
}

/** Ligne à interrupteur (Flutter _SwitchTile). */
export function SwitchTile({ icon: Icon, title, value, onChange }: { icon: LucideIcon; title: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 border-b px-[18px] py-[16px]" style={{ borderColor: SIG.hairline }}>
      <Icon className="h-[18px] w-[18px] shrink-0" style={{ color: SIG.goldDeep }} />
      <span className="flex-1 text-[15px] font-semibold leading-snug">{title}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={() => onChange(!value)}
        className="relative h-[32px] w-[52px] shrink-0 rounded-full transition-colors"
        style={{ background: value ? SIG.gold : '#D8D2BC' }}
      >
        <span className="absolute top-[4px] h-[24px] w-[24px] rounded-full bg-white shadow transition-all" style={{ left: value ? 24 : 4 }} />
      </button>
    </div>
  );
}

export type DomainTile = {
  id: string;
  label: string;
  Icon: LucideIcon;
  danger?: boolean;
  onClick: () => void;
  onSpeak?: (e: React.MouseEvent) => void;
};

/** Grille de sections des écrans métier (Santé, Agriculture, Finance, Éducation…). */
export function SectionTiles({ items }: { items: DomainTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-[10px]">
      {items.map(({ id, label, Icon, danger, onClick, onSpeak }) => (
        <div key={id} className="relative">
          <button
            type="button"
            onClick={onClick}
            className="flex h-[92px] w-full flex-col rounded-[16px] border bg-white p-[12px] text-left transition-transform active:scale-[0.98]"
            style={{ borderColor: danger ? SIG.clay : SIG.hairline }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color: danger ? SIG.clay : SIG.sage }} />
            <span className="mt-auto text-[12px] font-extrabold" style={{ color: danger ? SIG.clay : SIG.ink }}>{label}</span>
          </button>
          {onSpeak && (
            <button
              type="button"
              onClick={onSpeak}
              aria-label={`Écouter : ${label}`}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ color: SIG.muted }}
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Carte blanche générique (résumé, météo, progression…). */
export function InfoCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`block w-full rounded-[18px] border bg-white p-[14px] text-left ${className}`}
      style={{ borderColor: SIG.hairline }}
    >
      {children}
    </Tag>
  );
}
