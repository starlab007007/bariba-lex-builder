// Sous-composants de présentation du Hub Apprendre (`ApHubScreen.tsx`),
// portage fidèle des widgets privés de `apprendre_hub.dart` (branche
// feat/apprendre-v2.4-build19-20260927) : `_GuideHero`, `_DailySessionCard`,
// `_DueTile`, `_FoundationTile`, `_ThemeTile`, `_ScenesEntryCard`,
// `_ProverbCard`, `_LinkChip`. Extraits dans leur propre fichier pour garder
// `ApHubScreen.tsx` sous la limite de taille raisonnable.
//
// Référence : apprendre_v24_spec.md §11 (conditions exactes) et §13
// (tokens de design ApColors/ApText à reproduire).

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import {
  Play, ChevronRight, Check, Sunset, UsersRound, Store, UtensilsCrossed,
  Wheat, Trees, Hospital, Footprints, PartyPopper, Users, Construction,
  type LucideIcon,
} from 'lucide-react';
import type { ApFoundation, ApProverb, ApTheme } from '@/lib/apprendre/content';
import { AP_COLORS } from './apColors';
import { apIcon } from './ApFoundationSections';

type IconComp = ComponentType<{ className?: string; style?: CSSProperties }>;

// ---------------------------------------------------------------------
// Boutons partagés (mêmes dimensions que ApPrimaryButton/ApSecondaryButton,
// spec §13.4) — dupliqués ici plutôt qu'importés : chaque écran déjà porté
// (ApReviewScreen, ApSessionScreen…) les redéfinit localement de la même
// façon, on garde la même convention.
// ---------------------------------------------------------------------

export function ApHubPrimaryButton({
  label, icon: Icon, onClick, dark = false,
}: {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-base font-extrabold"
      style={{
        backgroundColor: dark ? AP_COLORS.night : AP_COLORS.gold,
        color: dark ? '#FFFFFF' : AP_COLORS.goldInk,
      }}
    >
      {Icon && <Icon className="h-5 w-5" />}
      <span>{label}</span>
    </button>
  );
}

export function ApHubSecondaryButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick?: () => void }) {
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

export function ApHubSectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-end justify-between pb-2.5 pt-4">
      <h2 className="text-[17px] font-extrabold" style={{ color: AP_COLORS.ink }}>{title}</h2>
      {trailing}
    </div>
  );
}

export function ApHubPill({
  label, icon: Icon, background = AP_COLORS.goldTint, foreground = AP_COLORS.goldDeep,
}: {
  label: string;
  icon?: LucideIcon;
  background?: string;
  foreground?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-[5px] text-[11.5px] font-bold"
      style={{ backgroundColor: background, color: foreground }}
    >
      {Icon && <Icon className="h-3.5 w-3.5" style={{ color: foreground }} />}
      <span>{label}</span>
    </span>
  );
}

export function ApHubCardBox({
  children, onClick, color = AP_COLORS.surface, borderColor = AP_COLORS.line, radius = 20, padding = 16,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  borderColor?: string;
  radius?: number;
  padding?: number;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={onClick ? 'block w-full text-left' : undefined}
      style={{ backgroundColor: color, border: `1px solid ${borderColor}`, borderRadius: radius, padding, overflow: 'hidden' }}
    >
      {children}
    </Tag>
  );
}

// ---------------------------------------------------------------------
// `_GuideHero` (spec §11.2) — carte dégradée sombre, toujours affichée.
// ---------------------------------------------------------------------

export function ApGuideHero({ title, subtitle, action, onTap }: { title: string; subtitle: string; action: string; onTap?: () => void }) {
  return (
    <div
      className="rounded-[28px] p-[18px]"
      style={{ background: `radial-gradient(circle at 90% -20%, #4A3B2A, ${AP_COLORS.night})` }}
    >
      <div className="flex items-start gap-3.5">
        <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden className="shrink-0">
          <defs><clipPath id="ap-guide-clip"><circle cx="34" cy="34" r="32" /></clipPath></defs>
          <circle cx="34" cy="34" r="33" fill="#2E2A3B" stroke={AP_COLORS.gold} strokeWidth="2" />
          <g clipPath="url(#ap-guide-clip)">
            <ellipse cx="34" cy="70" rx="26" ry="20" fill="#C99530" />
            <rect x="29" y="40" width="10" height="9" rx="4" fill="#A9682F" />
            <circle cx="34" cy="31" r="12" fill="#B9793A" />
            <path d="M21.5 27c1-9 7-14 13-14s11.5 5 12.5 14c-4-4-8-5.500-12.500-5.500S25 23 21.500 27z" fill="#F4EBD8" />
            <circle cx="30" cy="33" r="1.200" fill="#241F2E" /><circle cx="38.500" cy="33" r="1.200" fill="#241F2E" />
            <path d="M31 38.500q3 2 6 0" stroke="#241F2E" strokeWidth="1.200" fill="none" strokeLinecap="round" />
          </g>
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold tracking-wide" style={{ color: AP_COLORS.goldTint }}>TON GUIDE TE PROPOSE</p>
          <p className="mt-1 text-xl font-semibold leading-tight text-white">{title}</p>
          <p className="mt-0.5 text-sm" style={{ color: AP_COLORS.nightText }}>{subtitle}</p>
        </div>
      </div>
      <div className="mt-4">
        <ApHubPrimaryButton label={action} icon={Play} onClick={onTap} dark={false} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// `_DailySessionCard` (spec §11.3) — carte dorée « SÉANCE DU JOUR ».
// ---------------------------------------------------------------------

const SKILL_ICON_MAP: Record<string, LucideIcon> = {};
export function registerSkillIcons(map: Record<string, LucideIcon>) {
  Object.assign(SKILL_ICON_MAP, map);
}

export function ApDailySessionCard({
  skills, skillIcon, skillLabelFor, onStart,
}: {
  skills: readonly string[];
  skillIcon: (skill: string) => LucideIcon;
  skillLabelFor: (skill: string) => string;
  onStart: () => void;
}) {
  return (
    <ApHubCardBox color={AP_COLORS.goldGlow} borderColor={AP_COLORS.gold} radius={24} padding={16}>
      <p className="text-[11.5px] font-bold tracking-wide" style={{ color: AP_COLORS.goldDeep }}>SÉANCE DU JOUR</p>
      <p className="mt-1 text-[20px] font-semibold leading-tight" style={{ color: AP_COLORS.ink, fontFamily: 'Fraunces, ui-serif, Georgia, serif' }}>{skills.length} types d’exercices · environ 8 min</p>
      <p className="mt-0.5 text-sm" style={{ color: AP_COLORS.muted }}>Nouveaux mots, révisions et correction immédiate.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const Icon = skillIcon(skill);
          return (
            <div
              key={skill}
              title={skillLabelFor(skill)}
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: AP_COLORS.goldTint }}
            >
              <Icon className="h-[18px] w-[18px]" style={{ color: AP_COLORS.goldDeep }} />
            </div>
          );
        })}
      </div>
      <div className="mt-3.5">
        <ApHubPrimaryButton label="Lancer la séance" icon={Play} onClick={onStart} />
      </div>
    </ApHubCardBox>
  );
}

// ---------------------------------------------------------------------
// `_DueTile` (spec §11.4) — mot dû, pastille de rétention.
// ---------------------------------------------------------------------

export function ApDueTile({ ba, fr, retention, onTap }: { ba: string; fr: string; retention: number; onTap?: () => void }) {
  const pct = Math.round(retention * 100);
  const urgent = pct < 50;
  return (
    <ApHubCardBox onClick={onTap} radius={18} padding={0}>
      <div className="flex items-center py-3 pl-4 pr-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold" style={{ color: AP_COLORS.ink }}>{ba}</p>
          <p className="truncate text-sm" style={{ color: AP_COLORS.quiet }}>{fr}</p>
        </div>
        <ApHubPill
          label={`mémoire ${pct} %`}
          background={urgent ? AP_COLORS.clayTint : AP_COLORS.goldTint}
          foreground={urgent ? AP_COLORS.clayInk : AP_COLORS.goldDeep}
        />
      </div>
    </ApHubCardBox>
  );
}

// ---------------------------------------------------------------------
// `_FoundationTile` (spec §11.5).
// ---------------------------------------------------------------------

export function ApFoundationTile({ unit, done, current, onTap }: { unit: ApFoundation; done: boolean; current: boolean; onTap?: () => void }) {
  const UnitIcon = done ? Check : apIcon(unit.icon);
  return (
    <div className="w-[150px] shrink-0">
      <ApHubCardBox
        onClick={onTap}
        radius={20}
        padding={14}
        color={current ? AP_COLORS.goldGlow : AP_COLORS.surface}
        borderColor={current ? AP_COLORS.gold : AP_COLORS.line}
      >
        <div className="flex items-center">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: done ? AP_COLORS.sageTint : AP_COLORS.goldTint }}
          >
            <UnitIcon className="h-5 w-5" style={{ color: done ? AP_COLORS.sageInk : AP_COLORS.goldDeep }} />
          </div>
          <div className="flex-1" />
          <span className="text-xl font-semibold" style={{ color: AP_COLORS.lineStrong }}>{unit.order}</span>
        </div>
        <p
          className="mt-6 line-clamp-2 text-sm font-extrabold leading-tight"
          style={{ color: AP_COLORS.ink }}
        >
          {unit.title_fr}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: AP_COLORS.muted }}>{unit.minutes} min</p>
      </ApHubCardBox>
    </div>
  );
}

// ---------------------------------------------------------------------
// `_ThemeTile` (spec §11.6).
// ---------------------------------------------------------------------

export function ApThemeTile({ theme, learned, onTap }: { theme: ApTheme; learned: number; onTap?: () => void }) {
  const ThemeIcon = apIcon(theme.icon);
  const total = theme.cards.length;
  const ratio = total === 0 ? 0 : Math.max(0, Math.min(1, learned / total));
  return (
    <ApHubCardBox onClick={onTap} radius={20} padding={14}>
      <ThemeIcon className="h-5 w-5" style={{ color: theme.color }} />
      <p
        className="mt-6 line-clamp-2 text-[13.5px] font-extrabold leading-tight"
        style={{ color: AP_COLORS.ink }}
      >
        {theme.name_fr}
      </p>
      <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full" style={{ backgroundColor: AP_COLORS.surfaceAlt }}>
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: theme.color }} />
      </div>
      <p className="mt-1 text-[10.5px]" style={{ color: AP_COLORS.muted }}>{learned} / {total} mots</p>
    </ApHubCardBox>
  );
}

// ---------------------------------------------------------------------
// `_ScenesEntryCard` (spec §11.7) — 11 chips de sujets codés en dur.
// ---------------------------------------------------------------------

const SCENE_TOPICS: { icon: IconComp; label: string }[] = [
  { icon: Sunset, label: 'Saluer' },
  { icon: UsersRound, label: 'Famille' },
  { icon: Store, label: 'Marché' },
  { icon: UtensilsCrossed, label: 'Repas' },
  { icon: Wheat, label: 'Champ' },
  { icon: Trees, label: 'Nature' },
  { icon: Hospital, label: 'Santé' },
  { icon: Footprints, label: 'Voyage' },
  { icon: PartyPopper, label: 'Fêtes' },
  { icon: Users, label: 'Village' },
  { icon: Construction, label: 'Métiers' },
];

export function ApScenesEntryCard({ onOpen }: { onOpen?: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="block w-full rounded-[24px] p-4 text-left"
      style={{ background: `linear-gradient(135deg, ${AP_COLORS.clay}, ${AP_COLORS.goldDeep})` }}
    >
      <p className="text-[11.5px] font-bold tracking-wide" style={{ color: AP_COLORS.goldTint }}>VIVRE LA LANGUE</p>
      <p className="mt-1 text-lg font-semibold leading-tight text-white">Des dialogues complets, de la salutation au départ</p>
      <p className="mt-1 text-sm text-white">Jeu de rôle, culture, vocabulaire et test pour chaque situation.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SCENE_TOPICS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-[5px] text-[11.5px] font-bold text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
          >
            <Icon className="h-3.5 w-3.5 text-white" />
            {label}
          </span>
        ))}
      </div>
      <div className="mt-3.5">
        <ApHubPrimaryButton label="Explorer les scènes" icon={ChevronRight} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------
// `_ProverbCard` (spec §11.8).
// ---------------------------------------------------------------------

export function ApProverbCard({ proverb }: { proverb: ApProverb }) {
  return (
    <div className="rounded-[24px] p-[18px]" style={{ backgroundColor: AP_COLORS.night }}>
      <p className="text-[11.5px] font-bold tracking-wide" style={{ color: AP_COLORS.goldTint }}>SAGESSE DU JOUR</p>
      <p className="mt-2 text-lg font-bold leading-[1.35] text-white">{proverb.ba}</p>
      <p className="mt-1.5 text-sm" style={{ color: AP_COLORS.nightText }}>{proverb.fr}</p>
      <p className="mt-1.5 text-[11px]" style={{ color: '#B7AF98' }}>Dictionnaire, {proverb.src}</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// `_LinkChip` (spec §11.10).
// ---------------------------------------------------------------------

export function ApLinkChip({ label, icon: Icon, onTap }: { label: string; icon: LucideIcon; onTap?: () => void }) {
  return (
    <button
      onClick={onTap}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold"
      style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface, color: AP_COLORS.ink }}
    >
      <Icon className="h-[18px] w-[18px]" style={{ color: AP_COLORS.goldDeep }} />
      <span>{label}</span>
    </button>
  );
}
