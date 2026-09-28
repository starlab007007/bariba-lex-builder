import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  Languages,
  BookMarked,
  Plus,
  Sparkles,
  Waves,
} from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';

const items = [
  { label: 'Fil', path: '/social', icon: Waves },
  { label: 'Apprendre', path: '/learn', icon: BookOpen },
  { label: 'Classe', path: '/classe', icon: ClipboardList },
  { label: 'Dico', path: '/dictionary', icon: BookMarked },
  { label: 'Traduc.', path: '/translator', icon: Languages },
  { label: 'Fitila IA', path: '/ia', icon: Sparkles },
] as const;

function routeIsActive(pathname: string, path: string) {
  if (path === '/learn') return pathname === '/' || pathname === '/learn' || pathname.startsWith('/learn/');
  if (path === '/social') return pathname.startsWith('/social') || pathname.startsWith('/handunia') || pathname.startsWith('/sagesse-battle');
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function FitilaBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path: string) => {
    triggerFeedback('click');
    navigate(path);
  };

  return (
    <nav
      aria-label="Navigation principale FITILA"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[max(10px,env(safe-area-inset-bottom))]"
    >
      <div
        className="pointer-events-auto mx-auto flex h-[72px] w-full max-w-[920px] items-stretch rounded-[26px] border bg-white/95 px-1.5 shadow-[0_18px_45px_-24px_rgba(36,31,46,.55)] backdrop-blur-xl"
        style={{ borderColor: '#E4DFCC' }}
      >
        {items.slice(0, 3).map(({ label, path, icon: Icon }) => {
          const active = routeIsActive(location.pathname, path);
          return (
            <button
              key={path}
              type="button"
              onClick={() => go(path)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2 transition-colors"
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} style={{ color: active ? '#9C6B1D' : '#8B856F' }} />
              <span className="max-w-full truncate text-[11px] font-bold sm:text-xs" style={{ color: active ? '#9C6B1D' : '#8B856F' }}>
                {label}
              </span>
            </button>
          );
        })}

        <div className="relative flex min-w-[62px] flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => go('/creator')}
            className="absolute -top-3 flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 shadow-[0_16px_28px_-12px_rgba(156,107,29,.75)] transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#D6A53A 0%,#B37A20 100%)',
              borderColor: '#F2DC9A',
              color: '#2B2110',
            }}
            aria-label="Création"
          >
            <Plus className="h-8 w-8" strokeWidth={2.2} />
          </button>
          <span className="mt-10 text-[10px] font-bold sm:text-[11px]" style={{ color: '#8B856F' }}>Créer</span>
        </div>

        {items.slice(3).map(({ label, path, icon: Icon }) => {
          const active = routeIsActive(location.pathname, path);
          return (
            <button
              key={path}
              type="button"
              onClick={() => go(path)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2 transition-colors"
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} style={{ color: active ? '#9C6B1D' : '#8B856F' }} />
              <span className="max-w-full truncate text-[11px] font-bold sm:text-xs" style={{ color: active ? '#9C6B1D' : '#8B856F' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
