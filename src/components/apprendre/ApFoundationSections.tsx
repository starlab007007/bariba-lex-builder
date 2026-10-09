// Portage fidèle de `ApSectionView` et de ses six rendus par type
// (fitila_flutter/lib/apprendre/apprendre_foundation.dart, branche
// feat/apprendre-v2.4-build19-20260927) — dispatch exact sur `section.type` :
// explain / tip / examples / culture / table / pairs / order (tout autre
// type ne rend rien, comme le `default: SizedBox.shrink()` du Dart).
//
// Référence : apprendre_v24_spec.md §12.1/§12.2 (checklist exacte par type)
// et §12.3 (points de fidélité impératifs : détection de la colonne
// "Source" par libellé exact + `row_status` pour `table`, clé de lookup
// audio = texte bariba brut pour tout `Example`/mot).
//
// `apIcon()` ci-dessous porte la table de correspondance §13.3
// (`foundations[].icon` → icône) — mapping local vers des icônes lucide-react
// équivalentes, à l'image de `scIcon()` déjà établi dans
// `ApScenesHubScreen.tsx` pour les icônes de scènes (table de correspondance
// différente, fallback différent — volontairement non fusionnées, comme le
// souligne la spec).
//
// Audio : comme documenté en tête de `ApSceneDetailScreen.tsx`, aucune
// bibliothèque de voix de référence n'est portée ici (`ApAudioButton`/
// `ApAudioService`) — ce module reste hors-ligne et sans appel réseau. Le
// bouton d'écoute est donc un repli local, meilleur effort, via la synthèse
// vocale du navigateur. La clé de lookup conceptuelle reste néanmoins le
// texte bariba brut passé en argument (`example.ba`, ou les mots d'un
// `order` rejoints par un espace) — pas un id — pour rester compatible avec
// un futur câblage sur un vrai catalogue de voix (spec §12.3).

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import {
  Lightbulb, Flame, CheckCircle2, HelpCircle, ArrowLeftRight,
  Mic2, AudioLines, LayoutGrid, Users2, Zap, Wand2, History, Pin, Network,
  Hand, UsersRound, Home, UtensilsCrossed, Clock, Heart, Wheat, Store, Trees,
  Smile, MessagesSquare, Landmark, PersonStanding, Ear, BookMarked, RefreshCw,
  Sunset, BookOpen,
} from 'lucide-react';
import { type ApExample, type ApFoundationSection, exampleVerified } from '@/lib/apprendre/content';
import { AP_COLORS } from './apColors';
import { BaribaAudioButton as PublishedBaribaAudioButton } from '@/components/fitila/BaribaAudioText';

type IconComp = ComponentType<{ className?: string; style?: CSSProperties }>;

// apIcon() — mapping nom JSON -> icône (spec §13.3). Fallback : BookOpen,
// équivalent de `Icons.auto_stories_rounded`.
const AP_ICONS: Record<string, IconComp> = {
  record_voice_over: Mic2,
  graphic_eq: AudioLines,
  category: LayoutGrid,
  people_alt: Users2,
  bolt: Zap,
  auto_fix_high: Wand2,
  view_timeline: History,
  pin: Pin,
  account_tree: Network,
  waving_hand: Hand,
  family_restroom: UsersRound,
  cottage: Home,
  restaurant: UtensilsCrossed,
  schedule: Clock,
  favorite: Heart,
  agriculture: Wheat,
  storefront: Store,
  forest: Trees,
  mood: Smile,
  forum: MessagesSquare,
  // Remappé côté Dart vers Icons.account_balance_rounded (PAS l'icône temple
  // littérale) — Landmark est l'équivalent lucide le plus proche.
  temple_buddhist: Landmark,
  directions_run: PersonStanding,
  hearing: Ear,
  menu_book: BookMarked,
  local_fire_department: Flame,
  sync_alt: RefreshCw,
  wb_twilight: Sunset,
  home: Home,
};

export function apIcon(name: string): IconComp {
  return AP_ICONS[name] ?? BookOpen;
}

/** Voix de référence validée/published. Le bouton disparaît tant qu'aucune
 * prise approuvée et activée n'existe pour ce texte. */
export function ApAudioButton({ text, size = 34 }: { text: string; size?: number }) {
  return <PublishedBaribaAudioButton text={text} compact={size <= 32} hideUnavailable />;
}

/** Portage fidèle de `ApSourceTag` (spec §13.4) : icône `verified_rounded`
 *  (sage) si vérifié, sinon `help_outline_rounded` (clay) + suffixe
 *  " · à valider" ; invisible si la source est une chaîne vide. */
export function ApSourceTag({ source, verified = true }: { source: string; verified?: boolean }) {
  if (!source) return null;
  const color = verified ? AP_COLORS.sage : AP_COLORS.clay;
  const Icon = verified ? CheckCircle2 : HelpCircle;
  return (
    <div className="flex items-center gap-1 text-[11px]" style={{ color: AP_COLORS.muted }}>
      <Icon className="h-3 w-3 shrink-0" style={{ color }} />
      <span className="truncate">{source}{!verified ? ' · à valider' : ''}</span>
    </div>
  );
}

/** Équivalent de `ApCardBox` (spec §13.4) : padding 16px, radius 20px, fond
 *  `surface`, bordure 1px `line`, sur toutes les cartes de section. */
function CardBox({
  children, padding = '16px', radius = 20, color = AP_COLORS.surface, borderColor = AP_COLORS.line,
}: {
  children: ReactNode;
  padding?: string;
  radius?: number;
  color?: string;
  borderColor?: string;
}) {
  return (
    <div
      className="overflow-hidden"
      style={{ padding, borderRadius: radius, backgroundColor: color, border: `1px solid ${borderColor}` }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, icon: Icon, iconColor }: { title: string; icon?: IconComp; iconColor?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      {Icon && <Icon className="h-[18px] w-[18px] shrink-0" style={{ color: iconColor }} />}
      <p className="text-[16.5px] font-extrabold" style={{ color: AP_COLORS.ink }}>{title}</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// explain
// ---------------------------------------------------------------------

function Explain({ section }: { section: Extract<ApFoundationSection, { type: 'explain' }> }) {
  return (
    <div>
      {section.title.length > 0 && (
        <p className="mb-1.5 text-[16.5px] font-extrabold" style={{ color: AP_COLORS.ink }}>{section.title}</p>
      )}
      <p className="text-sm leading-[1.45]" style={{ color: AP_COLORS.inkSoft }}>{section.body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// tip
// ---------------------------------------------------------------------

function Tip({ section }: { section: Extract<ApFoundationSection, { type: 'tip' }> }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[18px] p-3.5" style={{ backgroundColor: AP_COLORS.sageTint }}>
      <Lightbulb className="h-5 w-5 shrink-0" style={{ color: AP_COLORS.sageInk }} />
      {/* Couleur exacte du Dart (0xFF24452F), distincte de sageInk. */}
      <p className="text-[13.5px] leading-[1.45]" style={{ color: '#24452F' }}>{section.body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// examples / culture
// ---------------------------------------------------------------------

export function ApExampleTile({ example, culture = false }: { example: ApExample; culture?: boolean }) {
  const verified = exampleVerified(example);
  return (
    <CardBox
      padding="16px 16px 12px"
      radius={18}
      color={culture ? AP_COLORS.goldGlow : AP_COLORS.surface}
      borderColor={culture ? AP_COLORS.goldTint : AP_COLORS.line}
    >
      <div className="flex items-start gap-2.5">
        <p className="min-w-0 flex-1 text-[17px] font-bold" style={{ color: AP_COLORS.ink }}>{example.ba}</p>
        <ApAudioButton text={example.ba} size={34} />
      </div>
      <p className="mt-[3px] text-sm leading-[1.45]" style={{ color: AP_COLORS.quiet }}>{example.fr}</p>
      {example.note && example.note.length > 0 && (
        <p className="mt-1.5 text-xs font-semibold" style={{ color: AP_COLORS.goldDeep }}>{example.note}</p>
      )}
      <div className="mt-2">
        <ApSourceTag source={example.src} verified={verified} />
      </div>
    </CardBox>
  );
}

function Examples({
  section, culture,
}: {
  section: Extract<ApFoundationSection, { type: 'examples' | 'culture' }>;
  culture: boolean;
}) {
  return (
    <div>
      {section.title.length > 0 && (
        <SectionTitle title={section.title} icon={culture ? Flame : undefined} iconColor={AP_COLORS.clay} />
      )}
      <div className="space-y-2">
        {section.items.map((item, i) => (
          <ApExampleTile key={i} example={item} culture={culture} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// table
// ---------------------------------------------------------------------

const SOURCE_LABEL = 'Source';

function TableRowCard({
  columns, cells, first, verified,
}: {
  columns: string[];
  cells: string[];
  first: boolean;
  verified: boolean;
}) {
  if (cells.length === 0) return null;
  const isSourceColumn = (index: number) => index < columns.length && columns[index] === SOURCE_LABEL;
  const lead = cells[0];
  const second = cells.length > 1 ? cells[1] : '';
  return (
    <div
      className="px-4 py-3"
      style={{ borderTop: first ? 'none' : `1px solid ${AP_COLORS.line}` }}
    >
      <div className="flex items-baseline gap-3">
        <p className="shrink-0 text-[16px] font-bold" style={{ color: AP_COLORS.ink, minWidth: 64, maxWidth: 150 }}>{lead}</p>
        <p className="min-w-0 flex-1 text-[15px] font-semibold" style={{ color: AP_COLORS.inkSoft }}>
          {isSourceColumn(1) ? '' : second}
        </p>
      </div>
      {cells.slice(2).map((cell, i0) => {
        const i = i0 + 2;
        if (cell.length === 0 || isSourceColumn(i)) return null;
        return (
          <p key={i} className="mt-[3px] text-xs" style={{ color: AP_COLORS.inkSoft }}>
            {i < columns.length && <span className="font-bold">{columns[i]} : </span>}
            <span>{cell}</span>
          </p>
        );
      })}
      {cells.slice(1).map((cell, i0) => {
        const i = i0 + 1;
        if (!isSourceColumn(i)) return null;
        return (
          <div key={i} className="mt-[5px]">
            <ApSourceTag source={cell} verified={verified} />
          </div>
        );
      })}
    </div>
  );
}

function TableView({ section }: { section: Extract<ApFoundationSection, { type: 'table' }> }) {
  const columns = section.columns ?? [];
  const rowStatus = section.row_status ?? [];
  return (
    <div>
      {section.title && section.title.length > 0 && (
        <p className="mb-2.5 text-[16.5px] font-extrabold" style={{ color: AP_COLORS.ink }}>{section.title}</p>
      )}
      <CardBox padding="0" radius={18}>
        {section.rows.map((row, r) => (
          <TableRowCard
            key={r}
            columns={columns}
            cells={row}
            first={r === 0}
            // Absence totale de row_status => toutes les lignes vérifiées
            // par défaut (spec §12.3) : r >= rowStatus.length couvre ce cas.
            verified={r >= rowStatus.length || rowStatus[r] === 'atteste'}
          />
        ))}
      </CardBox>
    </div>
  );
}

// ---------------------------------------------------------------------
// pairs
// ---------------------------------------------------------------------

function PairSide({ example, color }: { example: ApExample; color: string }) {
  return (
    <div className="flex-1 rounded-2xl p-3" style={{ backgroundColor: color }}>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-xl font-bold" style={{ color: AP_COLORS.ink }}>{example.ba}</p>
        <ApAudioButton text={example.ba} size={32} />
      </div>
      <p className="mt-0.5 text-[13px] leading-[1.45]" style={{ color: AP_COLORS.inkSoft }}>{example.fr}</p>
      <p className="mt-1 text-[10.5px]" style={{ color: AP_COLORS.muted }}>{example.src}</p>
    </div>
  );
}

function Pairs({ section }: { section: Extract<ApFoundationSection, { type: 'pairs' }> }) {
  return (
    <div>
      <p className="mb-2.5 text-[16.5px] font-extrabold" style={{ color: AP_COLORS.ink }}>{section.title}</p>
      <div className="space-y-2.5">
        {section.items.map((pair, i) => (
          <div key={i} className="flex items-stretch gap-2">
            <PairSide example={pair.a} color={AP_COLORS.goldTint} />
            <ArrowLeftRight className="mt-3 h-5 w-5 shrink-0" style={{ color: AP_COLORS.muted }} />
            <PairSide example={pair.b} color={AP_COLORS.clayTint} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// order
// ---------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  sujet: AP_COLORS.goldTint,
  reprise: AP_COLORS.surfaceAlt,
  objet: AP_COLORS.sageTint,
  verbe: AP_COLORS.clayTint,
};

function Order({ section }: { section: Extract<ApFoundationSection, { type: 'order' }> }) {
  return (
    <CardBox radius={22}>
      <p className="text-[16.5px] font-extrabold" style={{ color: AP_COLORS.ink }}>{section.title}</p>
      <p className="mt-1 text-sm leading-[1.45]" style={{ color: AP_COLORS.inkSoft }}>{section.body}</p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {section.ba.map((word, i) => {
          const role = i < section.roles.length ? section.roles[i] : undefined;
          const bg = role !== undefined ? (ROLE_COLORS[role] ?? AP_COLORS.surfaceAlt) : AP_COLORS.surfaceAlt;
          return (
            <div key={i} className="rounded-[14px] px-3 py-2 text-center" style={{ backgroundColor: bg }}>
              <p className="text-lg font-bold" style={{ color: AP_COLORS.ink }}>{word}</p>
              {role !== undefined && <p className="text-[11px]" style={{ color: AP_COLORS.muted }}>{role}</p>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-start gap-2.5">
        <p className="min-w-0 flex-1 text-sm leading-[1.45]" style={{ color: AP_COLORS.quiet }}>{section.fr}</p>
        <ApAudioButton text={section.ba.join(' ')} size={34} />
      </div>
      <div className="mt-1.5">
        <ApSourceTag source={section.src} />
      </div>
    </CardBox>
  );
}

// ---------------------------------------------------------------------
// dispatcher — reproduit exactement le switch de `ApSectionView.build`
// ---------------------------------------------------------------------

export function ApSectionView({ section }: { section: ApFoundationSection }) {
  switch (section.type) {
    case 'explain':
      return <Explain section={section} />;
    case 'tip':
      return <Tip section={section} />;
    case 'examples':
      return <Examples section={section} culture={false} />;
    case 'culture':
      return <Examples section={section} culture={true} />;
    case 'table':
      return <TableView section={section} />;
    case 'pairs':
      return <Pairs section={section} />;
    case 'order':
      return <Order section={section} />;
    default:
      return null;
  }
}
