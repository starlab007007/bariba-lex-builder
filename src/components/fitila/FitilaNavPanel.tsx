import type { LucideIcon } from 'lucide-react';
import {
  Award, BookOpen, Cast, ClipboardList, Clapperboard, Compass, CloudOff, Download, Globe, GraduationCap, History, Keyboard,
  Languages, Layers, LayoutGrid, Mail, MessageSquare, PlaySquare, ScanLine, Settings, ShieldPlus, ShoppingBag, Siren, Sparkles,
  Store, Tractor, User, Wallet, AudioLines,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { SIG } from './signatureTheme';

type Item = { label: string; path: string; icon: LucideIcon; desc?: string };

// Libellés et sous-titres repris de FitilaPage (fitila_flutter/lib/main.dart).
const EXPLORER: Item[] = [
  { label: 'Fil', path: '/social', icon: Layers, desc: 'Publications, vidéos, audios et templates' },
  { label: 'Dictionnaire', path: '/dictionary', icon: BookOpen },
  { label: 'Classe', path: '/classe', icon: ClipboardList },
  { label: 'IA', path: '/ia', icon: Sparkles },
  { label: 'Traducteur', path: '/translator', icon: Languages },
  { label: 'Apprendre', path: '/learn', icon: GraduationCap },
  { label: 'Templates', path: '/templates', icon: PlaySquare },
  { label: 'Créateur', path: '/creator', icon: Clapperboard },
];
const CULTURE: Item[] = [
  { label: 'Voice Lab', path: '/voice-lab', icon: AudioLines },
  { label: 'Éducation', path: '/education', icon: Cast },
  { label: 'Découvrir', path: '/discover', icon: Compass },
  { label: 'Messages', path: '/messages', icon: MessageSquare },
];
const SERVICES: Item[] = [
  { label: 'Services', path: '/services', icon: LayoutGrid, desc: 'Services communautaires et outils locaux' },
  { label: 'Marché', path: '/market', icon: Store, desc: 'Produits, jobs et annonces du marché' },
  { label: 'Agriculture', path: '/agriculture', icon: Tractor, desc: 'Conseils agricoles, météo et prix' },
  { label: 'Finance', path: '/finance', icon: Wallet, desc: 'Portefeuille, tontine et mobile money' },
  { label: 'Santé', path: '/health', icon: ShieldPlus, desc: 'Santé, prévention et assistance' },
  { label: 'SOS', path: '/sos', icon: Siren, desc: 'Alerte rapide et contacts de confiance' },
  { label: 'Installer', path: '/install', icon: Download, desc: 'Installation PWA, APK et clavier' },
];
const COMPTE: Item[] = [
  { label: 'Clavier', path: '/keyboard', icon: Keyboard },
  { label: 'Enseignant', path: '/teacher', icon: Award },
  { label: 'Brouillons', path: '/drafts', icon: Mail },
  { label: 'Hors ligne', path: '/offline', icon: CloudOff },
  { label: 'Portefeuille', path: '/wallet', icon: Wallet },
  { label: 'Historique', path: '/history', icon: History },
  { label: 'Scanner', path: '/scan', icon: ScanLine },
  { label: 'Boutique', path: '/shop', icon: ShoppingBag },
  { label: 'Profil', path: '/profile', icon: User },
  { label: 'Paramètres', path: '/settings', icon: Settings },
];

function isActive(pathname: string, path: string) {
  if (path === '/learn') return pathname === '/' || pathname.startsWith('/learn');
  if (path === '/social') return pathname.startsWith('/social') || pathname.startsWith('/handunia') || pathname.startsWith('/sagesse-battle');
  return pathname === path || pathname.startsWith(`${path}/`);
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 mt-5 px-[6px] text-[11px] font-extrabold" style={{ color: SIG.muted }}>{children}</h3>;
}

/** Panneau de navigation FITILA : tiroir mobile et menu latéral permanent du bureau. */
export default function FitilaNavPanel({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { currentLang, setLanguage } = useFitilaLanguage();
  const { user, isAdmin } = useAuth();
  const go = (p: string) => (onNavigate ? onNavigate(p) : nav(p));

  const row = ({ label, path, icon: Icon, desc }: Item) => {
    const active = isActive(pathname, path);
    return (
      <button
        key={path}
        type="button"
        onClick={() => go(path)}
        aria-current={active ? 'page' : undefined}
        className="flex w-full items-center gap-4 rounded-[16px] px-[14px] py-[10px] text-left transition-colors hover:bg-[#F1EDDF]/60"
        style={{ background: active ? SIG.surfaceAlt : 'transparent' }}
      >
        <Icon className="h-[20px] w-[20px] shrink-0" style={{ color: SIG.goldDeep }} />
        <span className="min-w-0">
          <span className="block text-[14px]" style={{ color: SIG.ink, fontWeight: active ? 800 : 500 }}>{label}</span>
          {active && desc && <span className="block truncate text-[11px]" style={{ color: SIG.muted }}>{desc}</span>}
        </span>
      </button>
    );
  };

  const tile = ({ label, path, icon: Icon, desc }: Item) => {
    const active = isActive(pathname, path);
    return (
      <button
        key={path}
        type="button"
        onClick={() => go(path)}
        aria-current={active ? 'page' : undefined}
        className="flex h-[88px] flex-col rounded-[16px] border p-[12px] text-left"
        style={{ background: SIG.surfaceAlt, borderColor: active ? SIG.gold : SIG.hairline }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color: SIG.goldDeep }} />
        <span className="mt-auto text-[12px] font-extrabold" style={{ color: SIG.ink }}>{label}</span>
        <span className="truncate text-[10px]" style={{ color: SIG.muted }}>{desc}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto px-[18px] pb-6 pt-5" style={{ background: SIG.surface, color: SIG.ink }}>
      <div className="px-[6px]">
        <div className="text-[28px] font-semibold leading-none" style={{ fontFamily: 'Fraunces, ui-serif, serif', color: SIG.goldDeep }}>FITILA</div>
        <div className="mt-2 text-[11px]" style={{ color: SIG.muted }}>Bàátɔ̀nú · Langue, Culture &amp; IA</div>
      </div>

      <GroupTitle>Explorer</GroupTitle>
      <div className="space-y-0.5">{EXPLORER.map(row)}</div>
      <GroupTitle>Culture</GroupTitle>
      <div className="space-y-0.5">{CULTURE.map(row)}</div>
      <GroupTitle>Services</GroupTitle>
      <div className="grid grid-cols-2 gap-[10px]">{SERVICES.map(tile)}</div>
      <GroupTitle>Compte</GroupTitle>
      <div className="space-y-0.5">{COMPTE.map(row)}</div>

      <GroupTitle>Langue</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        {([['fr', 'Français'], ['ba', 'Bàátɔ̀nú']] as const).map(([code, label]) => (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={currentLang === code}
            className="flex h-[42px] items-center justify-center gap-2 rounded-full border text-[13px] font-extrabold"
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

      <button
        type="button"
        onClick={() => go(user ? '/profile' : '/auth')}
        className="mt-6 flex items-center gap-3 rounded-[18px] p-3 text-left"
        style={{ background: SIG.surfaceAlt }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-extrabold" style={{ background: SIG.gold, color: '#2B2110' }}>
          {(user?.user_metadata?.display_name || user?.email || 'U').toString().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold">{user?.user_metadata?.display_name || (user ? 'Utilisateur Fitila' : 'Se connecter')}</span>
          <span className="block text-[11px]" style={{ color: SIG.muted }}>{user ? 'Membre' : 'Retrouver mon compte'}</span>
        </span>
      </button>
    </div>
  );
}

export { SIG as FITILA_NAV_SIG };
