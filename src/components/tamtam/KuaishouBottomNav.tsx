import React, { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Plus, BookOpen, BookText, Book, School, Bot } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { toast } from 'sonner';

interface NavItem {
  id: string;
  icon: React.ElementType;
  labelFr: string;
  labelBa: string;
  path: string;
  isCreate?: boolean;
}

const COMING_SOON_PATHS: string[] = [];

const leftItems: NavItem[] = [
  { id: 'home', icon: Home, labelFr: 'Fil', labelBa: 'Soo', path: '/fitila/social' },
  { id: 'learn', icon: BookOpen, labelFr: 'Apprendre', labelBa: 'Dɔnku', path: '/fitila/learn' },
  { id: 'classe', icon: School, labelFr: 'Classe', labelBa: 'Klaasi', path: '/fitila/classe' },
];

const rightItems: NavItem[] = [
  { id: 'dictionary', icon: Book, labelFr: 'Dico', labelBa: 'Gãnsɛ', path: '/fitila/dictionary' },
  { id: 'translator', icon: BookText, labelFr: 'Traducteur', labelBa: 'Tɛnyɛ̃ɛ̃ru', path: '/fitila/translator' },
  { id: 'tem-ia', icon: Bot, labelFr: 'Fitila IA', labelBa: 'Fitila IA', path: '/fitila/tem-ia' },
];

const createItem: NavItem = { id: 'create', icon: Plus, labelFr: 'Créer', labelBa: 'Ko', path: '/fitila/creator', isCreate: true };

export const KuaishouBottomNav: React.FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang } = useTamTamLanguage();

  // Bottom nav is always visible

  const isActive = (path: string) => {
    if (path === '/fitila/social') {
      return location.pathname === '/fitila' || 
             location.pathname === '/fitila/' || 
             location.pathname === '/fitila/social';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavPress = (item: NavItem) => {
    triggerFeedback('click');
    if (COMING_SOON_PATHS.includes(item.path)) {
      toast('🚧 Bientôt disponible !', { description: `La section "${item.labelFr}" arrive très prochainement.` });
      return;
    }
    navigate(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ 
        paddingBottom: 'max(env(safe-area-inset-bottom), 4px)',
        background: '#000000',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="relative flex items-end px-0.5 sm:px-1 pt-1.5 pb-1">
        {/* Left group */}
        <div className="flex-1 flex items-end justify-around">
          {leftItems.map((item) => renderNavItem(item))}
        </div>

        {/* Center spacer for the floating button */}
        <div className="w-14 flex-shrink-0 flex items-center justify-center relative">
          <button
            onClick={() => handleNavPress(createItem)}
            className="absolute -top-5 left-1/2 -translate-x-1/2"
          >
            <div
              className="rounded-full flex items-center justify-center shadow-xl active:opacity-80 transition-opacity will-change-transform"
              style={{
                width: 52,
                height: 52,
                background: 'linear-gradient(135deg, hsl(var(--kuaishou-accent-cyan)), hsl(var(--kuaishou-accent-red)))',
                boxShadow: '0 4px 20px rgba(255, 80, 120, 0.4)',
              }}
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
          </button>
        </div>

        {/* Right group */}
        <div className="flex-1 flex items-end justify-around">
          {rightItems.map((item) => renderNavItem(item))}
        </div>
      </div>
    </nav>
  );

  function renderNavItem(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item.path);
    const label = currentLang === 'ba' ? item.labelBa : item.labelFr;

    return (
      <motion.button
        key={item.id}
        whileTap={{ scale: 0.9 }}
        onClick={() => handleNavPress(item)}
        className="relative flex flex-col items-center gap-0.5 py-1.5 min-h-[44px] active:scale-95 transition-transform overflow-hidden"
        style={{ flex: '1 1 0', minWidth: 0 }}
      >
        <Icon
          className={`w-5 h-5 transition-colors ${
            active
              ? 'text-[hsl(var(--kuaishou-nav-icon))]'
              : 'text-[hsl(var(--kuaishou-nav-icon-muted))]'
          }`}
          strokeWidth={active ? 2.5 : 1.5}
        />
        <span
          className={`text-[8px] sm:text-[9px] leading-tight transition-colors text-center truncate w-full ${
            active
              ? 'text-[hsl(var(--kuaishou-nav-icon))] font-medium'
              : 'text-[hsl(var(--kuaishou-nav-icon-muted))]'
          }`}
        >
          {label}
        </span>

        {active && (
          <motion.div
            layoutId="kuaishouNavIndicator"
            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[hsl(var(--kuaishou-nav-icon))]"
          />
        )}
      </motion.button>
    );
  }
});
KuaishouBottomNav.displayName = 'KuaishouBottomNav';

export default KuaishouBottomNav;
