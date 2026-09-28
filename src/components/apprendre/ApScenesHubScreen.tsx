// Portage fidèle de `ApScenesHubScreen` (fitila_flutter/lib/apprendre/apprendre_scenes_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927) — accueil du module Scènes
// de vie : thématiques, niveaux, filtres, progression, et lancement d'une
// scène.
//
// Référence : apprendre_v24_spec.md §8.1 (`scIcon`/`scColor`) et §8.2 (flux
// exact de l'écran liste).
//
// Composant réutilisable et autonome, à l'image de `ApReviewScreen.tsx` : un
// futur écran Hub (hors périmètre de cette tâche) le monte avec une
// `ScenesContent`/`ScenesProgress` déjà chargées — reproduit le chargement
// asynchrone (`_load()`, état `_error`) du Dart source, qui reste hors de ce
// composant. La navigation vers une scène (`ApSceneDetailScreen`) est gérée
// entièrement en interne (état `openScene`), comme `ApReviewScreen` le fait
// pour `ApSessionScreen` — aucun routage n'est introduit ici.

import { useState, type ComponentType, type CSSProperties } from 'react';
import {
  ArrowLeft, Play, RefreshCw, Check, PlayCircle,
  Sunset, Home, Store, Wheat, Heart, Footprints, PartyPopper, Users, Droplet,
  UtensilsCrossed, School, Trees, PawPrint, Handshake, Hospital, Baby, Music,
  Construction, Moon, Wallet, UsersRound, MessagesSquare, Drama,
} from 'lucide-react';
import { type ScCategory, type ScScene, type ScenesContent } from '@/lib/apprendre/content';
import { type ScenesProgress, SCENES_PASS_MARK } from '@/lib/apprendre/scenes';
import type { ApprendreStore } from '@/lib/apprendre/store';
import { AP_COLORS } from './apColors';
import ApSceneDetailScreen from './ApSceneDetailScreen';

// AP_COLORS n'expose pas encore `quiet` (apprendre_v24_spec.md §13.1) —
// ajoutée localement plutôt que de modifier apColors.ts (hors périmètre de
// cette tâche). `night`, lui, est identique à AP_COLORS.ink (mêmes
// 0xFF241F2E) et est donc réutilisé tel quel dans `SC_PALETTE`.
const QUIET = '#5E5846';

type IconComp = ComponentType<{ className?: string; style?: CSSProperties }>;

// scIcon() — mapping nom JSON -> icône (spec §8.1). Fallback : Drama
// (masques de théâtre), équivalent de `Icons.theater_comedy_rounded`.
const SCENE_ICONS: Record<string, IconComp> = {
  wb_twilight: Sunset,
  home: Home,
  storefront: Store,
  agriculture: Wheat,
  favorite: Heart,
  directions_walk: Footprints,
  celebration: PartyPopper,
  groups: Users,
  water_drop: Droplet,
  restaurant: UtensilsCrossed,
  school: School,
  forest: Trees,
  pets: PawPrint,
  handshake: Handshake,
  local_hospital: Hospital,
  child_care: Baby,
  music_note: Music,
  construction: Construction,
  nights_stay: Moon,
  payments: Wallet,
  family_restroom: UsersRound,
  forum: MessagesSquare,
};
function scIcon(name: string): IconComp {
  return SCENE_ICONS[name] ?? Drama;
}

// scColor() — cycle exact sur 4 couleurs (spec §8.1) : clay, goldDeep, sage,
// night — les 11 catégories du module se répartissent donc 0,4,8 → clay ;
// 1,5,9 → goldDeep ; 2,6,10 → sage ; 3,7 → night.
const SC_PALETTE = [AP_COLORS.clay, AP_COLORS.goldDeep, AP_COLORS.sage, AP_COLORS.ink];
function scColor(index: number): string {
  return SC_PALETTE[index % SC_PALETTE.length];
}

export interface ApScenesHubScreenProps {
  content: ScenesContent;
  progress: ScenesProgress;
  store: ApprendreStore;
  /** Quitter le module Scènes de vie (bouton retour de l'en-tête). */
  onBack: () => void;
}

type FilterState = 'all' | 'new' | 'review' | 'done';
type FilterLevel = 0 | 1 | 2 | 3;

const STATE_FILTERS: { id: FilterState; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'new', label: 'Nouvelles' },
  { id: 'review', label: 'À revoir' },
  { id: 'done', label: 'Réussies' },
];
const LEVEL_FILTERS: { id: FilterLevel; label: string }[] = [
  { id: 0, label: 'Tous les niveaux' },
  { id: 1, label: 'Niveau 1' },
  { id: 2, label: 'Niveau 2' },
  { id: 3, label: 'Niveau 3' },
];

function showScene(scene: ScScene, progress: ScenesProgress, level: FilterLevel, state: FilterState): boolean {
  if (level !== 0 && scene.level !== level) return false;
  switch (state) {
    case 'new': return !progress.started(scene.id);
    case 'review': return progress.needsReview(scene.id);
    case 'done': return progress.done(scene.id);
    default: return true;
  }
}

function statusPill(scene: ScScene, progress: ScenesProgress): { label: string; icon?: IconComp; background: string; foreground: string } {
  const hasBest = scene.id in progress.best;
  const score = progress.best[scene.id];
  const played = progress.played.has(scene.id);
  const needsReview = progress.needsReview(scene.id);
  if (hasBest && score >= SCENES_PASS_MARK) {
    return { label: `${score} %`, icon: Check, background: AP_COLORS.sageTint, foreground: AP_COLORS.sageInk };
  }
  if (needsReview) {
    return { label: hasBest ? `${score} % · revoir` : 'À revoir', icon: RefreshCw, background: AP_COLORS.goldTint, foreground: AP_COLORS.goldDeep };
  }
  if (hasBest || played) {
    return { label: hasBest ? `${score} %` : 'Écoutée', background: AP_COLORS.goldTint, foreground: AP_COLORS.goldDeep };
  }
  return { label: 'Nouveau', background: AP_COLORS.surfaceAlt, foreground: QUIET };
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

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold"
      style={{
        backgroundColor: selected ? AP_COLORS.goldTint : AP_COLORS.surface,
        borderColor: selected ? AP_COLORS.gold : AP_COLORS.line,
        color: AP_COLORS.ink,
      }}
    >
      {label}
    </button>
  );
}

/** Anneau blanc de progression (`_WhiteRing`, carte d'en-tête). */
function WhiteRing({ value }: { value: number }) {
  const size = 62;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);
  const percent = Math.round(clamped * 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${percent} %`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} fill="#FFFFFF">
        {percent} %
      </text>
    </svg>
  );
}

function SceneTile({ scene, color, progress, onTap }: { scene: ScScene; color: string; progress: ScenesProgress; onTap: () => void }) {
  const Icon = scIcon(scene.icon);
  const attempts = progress.attemptsFor(scene.id);
  const status = statusPill(scene, progress);
  const StatusIcon = status.icon;
  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-[18px] border p-3 text-left"
      style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}
    >
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: `${color}1F` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-extrabold" style={{ color: AP_COLORS.ink }}>{scene.title}</p>
        <p className="truncate text-[12px]" style={{ color: AP_COLORS.muted }}>{scene.place}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex shrink-0 gap-[3px]">
            {[1, 2, 3].map((i) => (
              <span key={i} className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: i <= scene.level ? color : AP_COLORS.line }} />
            ))}
          </div>
          <span className="truncate text-[11px]" style={{ color: AP_COLORS.muted }}>
            {attempts > 0 ? `${scene.spoken.length} répliques · ${attempts} essai${attempts > 1 ? 's' : ''}` : `${scene.spoken.length} répliques`}
          </span>
        </div>
      </div>
      <Pill label={status.label} icon={StatusIcon} background={status.background} foreground={status.foreground} />
    </button>
  );
}

function CategorySection({
  content, progress, category, index, level, state, onOpen,
}: {
  content: ScenesContent;
  progress: ScenesProgress;
  category: ScCategory;
  index: number;
  level: FilterLevel;
  state: FilterState;
  onOpen: (scene: ScScene) => void;
}) {
  const all = content.scenesOf(category.id);
  const shown = all.filter((s) => showScene(s, progress, level, state));
  if (shown.length === 0) return null;
  const done = all.filter((s) => progress.done(s.id)).length;
  const color = scColor(index);
  const CategoryIcon = scIcon(category.icon);
  return (
    <div className="mt-[22px]">
      <div className="flex items-center gap-3">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: color }}>
          <CategoryIcon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold" style={{ color: AP_COLORS.ink }}>{category.title}</p>
          <p className="truncate text-[12px]" style={{ color: AP_COLORS.muted }}>{category.summary}</p>
        </div>
        <span className="shrink-0 text-[12px] font-bold" style={{ color: AP_COLORS.muted }}>{done}/{all.length}</span>
      </div>
      <div className="mt-2.5 space-y-2">
        {shown.map((scene) => (
          <SceneTile key={scene.id} scene={scene} color={color} progress={progress} onTap={() => onOpen(scene)} />
        ))}
      </div>
    </div>
  );
}

export default function ApScenesHubScreen({ content, progress, store, onBack }: ApScenesHubScreenProps) {
  const [openScene, setOpenScene] = useState<ScScene | null>(null);
  const [state, setState] = useState<FilterState>('all');
  const [level, setLevel] = useState<FilterLevel>(0);

  if (openScene) {
    return (
      <ApSceneDetailScreen
        key={openScene.id}
        scene={openScene}
        content={content}
        progress={progress}
        store={store}
        onBack={() => setOpenScene(null)}
        onNext={(next) => setOpenScene(next)}
      />
    );
  }

  const next = progress.recommended(content.scenes);
  const reviewCount = progress.reviewQueue(content.scenes).length;
  const ringValue = content.scenes.length === 0 ? 0 : progress.doneCount / content.scenes.length;

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
            <h1 className="truncate text-base font-extrabold leading-tight" style={{ color: AP_COLORS.ink }}>Scènes de vie</h1>
            <p className="truncate text-xs" style={{ color: AP_COLORS.muted }}>
              {content.scenes.length} situations · {content.categories.length} thématiques
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 pb-7 pt-1">
          <div
            className="rounded-[26px] p-[18px]"
            style={{ background: `linear-gradient(135deg, ${AP_COLORS.clay}, ${AP_COLORS.goldDeep})` }}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold tracking-wide" style={{ color: AP_COLORS.goldTint }}>VIVRE LA LANGUE</p>
                <p className="mt-1 text-[21px] font-bold leading-tight text-white">
                  {progress.doneCount} / {content.scenes.length} scènes réussies
                </p>
                <p className="mt-1 text-xs text-white">{content.lineCount} répliques tirées du dictionnaire, page citée.</p>
              </div>
              <WhiteRing value={ringValue} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill label={`${progress.startedCount} commencées`} icon={PlayCircle} background="rgba(255,255,255,0.22)" foreground="#FFFFFF" />
              {reviewCount > 0 && <Pill label={`${reviewCount} à revoir`} icon={RefreshCw} background={AP_COLORS.goldTint} />}
            </div>
            {next && (
              <div className="mt-3.5">
                <button
                  onClick={() => setOpenScene(next)}
                  className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-base font-extrabold"
                  style={{ backgroundColor: AP_COLORS.gold, color: AP_COLORS.goldInk }}
                >
                  {progress.needsReview(next.id) ? <RefreshCw className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span>
                    {progress.needsReview(next.id)
                      ? `À revoir : ${next.title}`
                      : progress.started(next.id) ? `Rejouer : ${next.title}` : `Continuer : ${next.title}`}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {STATE_FILTERS.map((f) => (
              <Chip key={f.id} label={f.label} selected={state === f.id} onClick={() => setState(f.id)} />
            ))}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {LEVEL_FILTERS.map((f) => (
              <Chip key={f.id} label={f.label} selected={level === f.id} onClick={() => setLevel(f.id)} />
            ))}
          </div>

          {content.categories.map((category, i) => (
            <CategorySection
              key={category.id}
              content={content}
              progress={progress}
              category={category}
              index={i}
              level={level}
              state={state}
              onOpen={(scene) => setOpenScene(scene)}
            />
          ))}

          <p className="mt-4 text-[11px]" style={{ color: AP_COLORS.muted }}>
            Les répliques bariba sont des phrases du dictionnaire bariba-français, recopiées à l’identique.
            Les liaisons en italique et les notes culturelles sont rédigées en français pour situer la scène.
            Les tons et la prononciation restent à confirmer avec des locuteurs référents.
          </p>
        </div>
      </div>
    </div>
  );
}
