import type { LucideIcon } from 'lucide-react';
import { Award, AudioLines, BookOpen, BrainCircuit, ClipboardCheck, ClipboardList, Clapperboard, Edit3, GraduationCap, Globe, Keyboard, Mic2, ShieldCheck, Vault, Languages, Layers, Settings, Sparkles, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { SIG } from './signatureTheme';
import { useFitilaRoles } from '@/hooks/useFitilaRoles';

type Item = { label: string; path: string; icon: LucideIcon; desc?: string };

// Menu volontairement réduit à l'essentiel ; les autres écrans restent joignables par leurs liens et URL.
const EXPLORER: Item[] = [
  { label: 'Fil', path: '/social', icon: Layers, desc: 'Publications, vidéos, audios et templates' },
  { label: 'Dictionnaire', path: '/dictionary', icon: BookOpen },
  { label: 'Classe', path: '/classe', icon: ClipboardList },
  { label: 'IA', path: '/ia', icon: Sparkles },
  { label: 'DUNYA IA', path: '/dunya', icon: BrainCircuit, desc: 'Intelligence locale · mémoire privée · hors Internet' },
  { label: 'Traducteur', path: '/translator', icon: Languages },
  { label: 'Apprendre', path: '/learn', icon: GraduationCap },
  { label: 'Créateur', path: '/creator', icon: Clapperboard },
  { label: 'Espace', path: '/espace', icon: Vault, desc: 'Coffre-fort, éditeur et scan OCR Bàátɔ̀nú' },
];
const CULTURE: Item[] = [{ label: 'Voice Lab', path: '/voice-lab', icon: AudioLines }];
const COMPTE: Item[] = [
  { label: 'Clavier', path: '/keyboard', icon: Keyboard },
  { label: 'Enseignant', path: '/teacher', icon: Award },
  { label: 'Profil', path: '/profile', icon: User },
  { label: 'Paramètres', path: '/settings', icon: Settings },
];

function isActive(pathname: string, path: string) {
  if (path === '/learn') return pathname === '/' || pathname.startsWith('/learn');
  if (path === '/social') return pathname.startsWith('/social') || pathname.startsWith('/handunia') || pathname.startsWith('/sagesse-battle');
  if (path === '/classe') return pathname.startsWith('/classe');
  return pathname === path || pathname.startsWith(`${path}/`);
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 mt-5 px-[6px] text-[11px] font-extrabold" style={{ color: SIG.muted }}>{children}</h3>;
}

/**
 * Panneau de navigation FITILA : tiroir mobile, menu latéral du bureau et rail d'icônes de la tablette (`compact`).
 */
export default function FitilaNavPanel({ onNavigate, compact = false }: { onNavigate?: (path: string) => void; compact?: boolean }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { currentLang, setLanguage } = useFitilaLanguage();
  const { user, isAdmin } = useAuth();
  const access = useFitilaRoles();
  const go = (p: string) => (onNavigate ? onNavigate(p) : nav(p));

  const habilitations: Item[] = [
    ...(access.speaker ? [{ label: 'Enregistrer', path: '/learn/voice-studio', icon: Mic2 }] : []),
    ...(access.reviewer ? [{ label: 'Valider', path: '/learn/voice-review', icon: ClipboardCheck }] : []),
    ...(access.teacher ? [{ label: 'Enseigner', path: '/teacher', icon: Award }] : []),
    ...(access.editor ? [{ label: 'Éditer', path: '/espace', icon: Edit3 }] : []),
    ...(access.admin ? [{ label: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
  ];

  const row = ({ label, path, icon: Icon, desc }: Item) => {
    const active = isActive(pathname, path);
    return (
      <button
        key={path}
        type="button"
        onClick={() => go(path)}
        aria-current={active ? 'page' : undefined}
        aria-label={label}
        title={compact ? label : undefined}
        className={`group flex w-full items-center rounded-[16px] text-left transition-all duration-200 hover:bg-[#F1EDDF]/70 active:scale-[0.98] ${compact ? 'h-12 justify-center' : 'gap-4 px-[14px] py-[10px]'}`}
        style={{ background: active ? SIG.surfaceAlt : undefined, boxShadow: active ? 'inset 3px 0 0 ' + SIG.gold : undefined }}
      >
        <Icon className="h-[20px] w-[20px] shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: SIG.goldDeep }} strokeWidth={active ? 2.4 : 2} />
        {!compact && (
          <span className="min-w-0">
            <span className="block text-[14px]" style={{ color: SIG.ink, fontWeight: active ? 800 : 500 }}>{label}</span>
            {active && desc && <span className="block truncate text-[11px]" style={{ color: SIG.muted }}>{desc}</span>}
          </span>
        )}
      </button>
    );
  };

  const initial = (user?.user_metadata?.display_name || user?.email || 'U').toString().charAt(0).toUpperCase();

  return (
    <div className={`flex h-full flex-col overflow-y-auto pb-6 pt-5 ${compact ? 'items-stretch px-[10px]' : 'px-[18px]'}`} style={{ background: SIG.surface, color: SIG.ink }}>
      <div className={compact ? 'text-center' : 'px-[6px]'}>
        <div className="font-semibold leading-none" style={{ fontFamily: 'Fraunces, ui-serif, serif', color: SIG.goldDeep, fontSize: compact ? 22 : 28 }}>{compact ? 'F' : 'FITILA'}</div>
        {!compact && <div className="mt-2 text-[11px]" style={{ color: SIG.muted }}>Bàátɔ̀nú · Langue, Culture &amp; IA</div>}
      </div>

      {!compact && <GroupTitle>Explorer</GroupTitle>}
      <div className={`space-y-0.5 ${compact ? 'mt-5' : ''}`}>{EXPLORER.map(row)}</div>
      {!compact && <GroupTitle>Culture</GroupTitle>}
      <div className={`space-y-0.5 ${compact ? 'mt-3 border-t pt-3' : ''}`} style={compact ? { borderColor: SIG.hairline } : undefined}>{CULTURE.map(row)}</div>
      {user && habilitations.length > 0 && !compact && <GroupTitle>Mes accès</GroupTitle>}
      {user && habilitations.length > 0 && <div className={`space-y-0.5 ${compact ? 'mt-3 border-t pt-3' : ''}`} style={compact ? { borderColor: SIG.hairline } : undefined}>{habilitations.map(row)}</div>}
      {!compact && <GroupTitle>Compte</GroupTitle>}
      <div className={`space-y-0.5 ${compact ? 'mt-3 border-t pt-3' : ''}`} style={compact ? { borderColor: SIG.hairline } : undefined}>{COMPTE.map(row)}</div>

      {!compact && (
        <>
          <GroupTitle>Langue</GroupTitle>
          <div className="grid grid-cols-2 gap-2">
            {([['fr', 'Français'], ['ba', 'Bàátɔ̀nú']] as const).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-pressed={currentLang === code}
                className="flex h-[42px] items-center justify-center gap-2 rounded-full border text-[13px] font-extrabold transition-transform active:scale-95"
                style={{ background: currentLang === code ? SIG.gold : '#fff', borderColor: currentLang === code ? SIG.gold : SIG.hairline, color: currentLang === code ? '#2B2110' : SIG.ink }}
              >
                <Globe className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button type="button" onClick={() => go('/admin')} className="mt-4 rounded-[16px] border p-3 text-left text-[13px] font-extrabold" style={{ borderColor: SIG.hairline, background: SIG.surfaceAlt }}>
              Administration
            </button>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => go(user ? '/profile' : '/auth')}
        aria-label={user ? 'Mon profil' : 'Se connecter'}
        title={compact ? (user ? 'Mon profil' : 'Se connecter') : undefined}
        className={`mt-auto flex items-center rounded-[18px] text-left transition-transform active:scale-[0.98] ${compact ? 'mt-6 justify-center p-1' : 'mt-6 gap-3 p-3'}`}
        style={{ background: compact ? undefined : SIG.surfaceAlt }}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold" style={{ background: SIG.gold, color: '#2B2110' }}>{initial}</span>
        {!compact && (
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-extrabold">{user?.user_metadata?.display_name || (user ? 'Utilisateur Fitila' : 'Se connecter')}</span>
            <span className="block text-[11px]" style={{ color: SIG.muted }}>{user ? 'Membre' : 'Retrouver mon compte'}</span>
          </span>
        )}
      </button>
    </div>
  );
}
