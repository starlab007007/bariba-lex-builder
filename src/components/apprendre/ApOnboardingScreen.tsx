// Portage de `apprendre_onboarding.dart` (Flutter Build19) — choix du profil
// d'apprenant et du sens d'apprentissage.

import { useState } from 'react';
import { ArrowLeft, ArrowLeftRight, BookOpen, Circle, CircleDot, Ear, Flame, type LucideIcon } from 'lucide-react';
import type { ApProfile } from '@/lib/apprendre/content';
import { AP_COLORS } from './apColors';

const PROFILE_ICONS: Record<string, LucideIcon> = {
  hearing: Ear,
  menu_book: BookOpen,
  local_fire_department: Flame,
  sync_alt: ArrowLeftRight,
};

export interface ApOnboardingChoice {
  profile: string;
  direction: string;
}

interface Props {
  profiles: ApProfile[];
  initialProfile?: string | null;
  initialDirection?: string;
  onDone: (choice: ApOnboardingChoice | null) => void;
}

const DISPLAY = { fontFamily: 'Fraunces, ui-serif, Georgia, serif' } as const;

export default function ApOnboardingScreen({ profiles, initialProfile, initialDirection = 'fr_to_ba', onDone }: Props) {
  const [profile, setProfile] = useState(initialProfile ?? 'fr');
  const [direction, setDirection] = useState(initialDirection);

  const pick = (id: string) => {
    setProfile(id);
    if (id === 'ba') setDirection('ba_to_fr');
    else if (id === 'fr' || id === 'oral') setDirection('fr_to_ba');
  };

  const segment = (id: string, label: string) => {
    const selected = direction === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setDirection(id)}
        aria-pressed={selected}
        className="h-[46px] flex-1 rounded-[14px] text-[13.5px] font-extrabold"
        style={{ background: selected ? AP_COLORS.night : 'transparent', color: selected ? '#fff' : AP_COLORS.inkSoft }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: AP_COLORS.ivory, color: AP_COLORS.ink }}>
      <div className="flex items-center gap-3 px-[14px] pt-[14px]">
        <button
          type="button"
          onClick={() => onDone(null)}
          aria-label="Retour"
          className="relative z-[86] flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-white"
          style={{ borderColor: AP_COLORS.line }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[16px] font-extrabold leading-tight">Mɛɛribu</p>
          <p className="text-[12px] leading-tight" style={{ color: AP_COLORS.muted }}>Apprendre · étape 1</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2">
        <h1 className="mt-2 text-[30px] font-semibold leading-[1.15]" style={DISPLAY}>Comment veux-tu apprendre ?</h1>
        <p className="mt-2 text-[15px] leading-[1.45]" style={{ color: AP_COLORS.inkSoft }}>
          Fitila adapte les séances à ta façon de lire et d’écouter. Tu pourras changer plus tard.
        </p>

        <div className="mt-5 space-y-[10px]" role="radiogroup" aria-label="Profil d’apprenant">
          {profiles.map((p) => {
            const selected = p.id === profile;
            const Icon = PROFILE_ICONS[p.icon] ?? BookOpen;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => pick(p.id)}
                className="flex w-full items-center gap-[14px] rounded-[20px] p-[14px] text-left"
                style={{
                  background: selected ? AP_COLORS.goldGlow : AP_COLORS.surface,
                  border: `${selected ? 2 : 1}px solid ${selected ? AP_COLORS.gold : AP_COLORS.line}`,
                }}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
                  style={{ background: selected ? AP_COLORS.gold : AP_COLORS.goldTint, color: selected ? AP_COLORS.goldInk : AP_COLORS.goldDeep }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-extrabold">{p.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: AP_COLORS.quiet }}>{p.line}</span>
                </span>
                {selected
                  ? <CircleDot className="h-6 w-6 shrink-0" style={{ color: AP_COLORS.gold }} />
                  : <Circle className="h-6 w-6 shrink-0" style={{ color: AP_COLORS.lineStrong }} />}
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-[22px] text-[11.5px] font-bold tracking-[0.08em]" style={{ color: AP_COLORS.muted }}>SENS D’APPRENTISSAGE</p>
        <div className="flex gap-1 rounded-[18px] p-1" style={{ background: AP_COLORS.surfaceAlt }}>
          {segment('fr_to_ba', 'Français → Bàátɔ̀nú')}
          {segment('ba_to_fr', 'Bàátɔ̀nú → Français')}
        </div>
      </div>

      <div className="px-5 pb-5 pt-2">
        <button
          type="button"
          onClick={() => onDone({ profile, direction })}
          className="flex h-[54px] w-full items-center justify-center rounded-full text-base font-extrabold"
          style={{ background: AP_COLORS.gold, color: AP_COLORS.goldInk }}
        >
          Commencer
        </button>
      </div>
    </div>
  );
}
