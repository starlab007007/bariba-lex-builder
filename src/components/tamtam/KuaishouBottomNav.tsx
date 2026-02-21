import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass, Plus, MessageSquare, User } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface NavItem {
  id: string;
  icon: React.ElementType;
  labelFr: string;
  labelBa: string;
  path: string;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, labelFr: 'Home', labelBa: 'Ilé', path: '/fitila/social' },
  { id: 'discover', icon: Compass, labelFr: 'Featured', labelBa: 'Wá', path: '/fitila/discover' },
  { id: 'create', icon: Plus, labelFr: 'Create', labelBa: 'Ṣẹ̀dá', path: '/fitila/creator', isCreate: true },
  { id: 'inbox', icon: MessageSquare, labelFr: 'Message', labelBa: 'Ìròyìn', path: '/fitila/messages' },
  { id: 'profile', icon: User, labelFr: 'Me', labelBa: 'Èmi', path: '/fitila/profile' },
];

export const KuaishouBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang } = useTamTamLanguage();

  // Hide bottom nav on translator page
  if (location.pathname.includes('/translator')) {
    return null;
  }

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
    navigate(item.path);
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'tween', duration: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ 
        paddingBottom: 'max(env(safe-area-inset-bottom), 4px)',
        background: '#000000',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-end justify-around px-1 pt-1.5 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const label = currentLang === 'ba' ? item.labelBa : item.labelFr;

          // Create button (center) - Kuaishou style with cyan/red split
          if (item.isCreate) {
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleNavPress(item)}
                className="relative -mt-3"
              >
                <div className="relative w-12 h-8 rounded-lg overflow-hidden shadow-lg">
                  {/* Cyan left side */}
                  <div className="absolute inset-0 bg-[hsl(var(--kuaishou-accent-cyan))]" />
                  {/* Red right side with diagonal cut */}
                  <div 
                    className="absolute inset-0 bg-[hsl(var(--kuaishou-accent-red))]"
                    style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 15% 100%)' }}
                  />
                  {/* Plus icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                </div>
              </motion.button>
            );
          }

          // Regular nav item - Kuaishou white background style
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNavPress(item)}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[52px] min-h-[44px] active:scale-95 transition-transform"
            >
              <Icon 
                className={`w-5 h-5 transition-colors ${
                  active 
                    ? 'text-[hsl(var(--kuaishou-nav-icon))]' 
                    : 'text-[hsl(var(--kuaishou-nav-icon-muted))]'
                }`}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span className={`text-[10px] transition-colors ${
                active 
                  ? 'text-[hsl(var(--kuaishou-nav-icon))] font-medium' 
                  : 'text-[hsl(var(--kuaishou-nav-icon-muted))]'
              }`}>
                {label}
              </span>
              
              {/* Active indicator dot */}
              {active && (
                <motion.div
                  layoutId="kuaishouNavIndicator"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[hsl(var(--kuaishou-nav-icon))]"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default KuaishouBottomNav;
