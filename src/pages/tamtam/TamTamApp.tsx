import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TamTamLanguageProvider, useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { Home, Users, Radio, ShoppingBag, User, Settings, X, ChevronRight, LogOut, HelpCircle, Bell, Moon, Globe } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 TAM-TAM APP V4 - LAYOUT PRINCIPAL AVEC MENU HAMBURGER GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════

// Context pour le menu hamburger global
interface SideMenuContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SideMenuContext = createContext<SideMenuContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export const useSideMenu = () => useContext(SideMenuContext);

// ═══════════════════════════════════════════════════════════════════════════════
// SIDE MENU DRAWER - GLASSMORPHISM
// ═══════════════════════════════════════════════════════════════════════════════

const SideMenuDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang, setLanguage } = useTamTamLanguage();

  const navItems = [
    { icon: Home, label: 'Accueil', labelBa: 'Ilé', path: '/tamtam', emoji: '🏠' },
    { icon: Users, label: 'Social', labelBa: 'Àwùjọ', path: '/tamtam/social', emoji: '💬' },
    { icon: Radio, label: 'Radio', labelBa: 'Rédíò', path: '/tamtam/radio', emoji: '📻' },
    { icon: ShoppingBag, label: 'Marché', labelBa: 'Ọjà', path: '/tamtam/market', emoji: '🛒' },
    { icon: User, label: 'Profil', labelBa: 'Èmi', path: '/tamtam/profile', emoji: '👤' },
  ];

  const handleNavigate = (path: string) => {
    triggerFeedback('click');
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => {
    if (path === '/tamtam') return location.pathname === '/tamtam' || location.pathname === '/tamtam/';
    return location.pathname.startsWith(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] z-[101] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.95) 0%, rgba(15, 15, 20, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Header avec avatar */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <Bell className="w-5 h-5 text-white" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <Moon className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Avatar & User Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-xl">
                  <span className="text-3xl">👤</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-lg font-bold">Utilisateur</h3>
                  <p className="text-white/60 text-sm">@tamtam_user</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[#FF7A00] text-xs font-medium">125 abonnés</span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/60 text-xs">48 suivis</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3 px-2">Navigation</p>
              <div className="space-y-1">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <motion.button
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        active ? 'bg-[#FF7A00]/20 border border-[#FF7A00]/30' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        active ? 'bg-[#FF7A00]' : 'bg-white/10'
                      }`}>
                        <span className="text-xl">{item.emoji}</span>
                      </div>
                      <span className={`font-medium flex-1 text-left ${active ? 'text-[#FF7A00]' : 'text-white'}`}>
                        {currentLang === 'ba' ? item.labelBa : item.label}
                      </span>
                      {active && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FF7A00]/20 text-[#FF7A00] text-[10px] font-bold">
                          ACTIF
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 ${active ? 'text-[#FF7A00]' : 'text-white/40'}`} />
                    </motion.button>
                  );
                })}
              </div>

              {/* Language Toggle */}
              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Globe className="w-5 h-5 text-[#FF7A00]" />
                  <span className="text-white font-medium">Langue</span>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLanguage('fr')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentLang === 'fr' ? 'bg-[#FF7A00] text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    🇫🇷 Français
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLanguage('ba')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentLang === 'ba' ? 'bg-[#FF7A00] text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    🇧🇯 Yorùbá
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavigate('/tamtam/settings')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 mb-2"
              >
                <Settings className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Paramètres</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5"
              >
                <HelpCircle className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Aide & Support</span>
              </motion.button>
            </div>

            {/* Logo */}
            <div className="p-4 flex items-center justify-center gap-2 opacity-50">
              <span className="text-2xl">🥁</span>
              <span className="text-white font-black">TAM-TAM</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

function AppContent() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Routes fullscreen
  const fullscreenRoutes = ['/tamtam/social', '/tamtam/home', '/tamtam/radio', '/tamtam'];
  const isFullscreen = fullscreenRoutes.some(route => {
    if (route === '/tamtam') return location.pathname === '/tamtam' || location.pathname === '/tamtam/';
    return location.pathname.startsWith(route);
  });

  const menuContext: SideMenuContextType = {
    isOpen: isMenuOpen,
    open: () => setIsMenuOpen(true),
    close: () => setIsMenuOpen(false),
    toggle: () => setIsMenuOpen(prev => !prev),
  };

  return (
    <SideMenuContext.Provider value={menuContext}>
      <div className="min-h-screen" style={{ background: '#0B0B0B' }}>
        <SideMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <main><Outlet /></main>
      </div>
    </SideMenuContext.Provider>
  );
}

export default function TamTamApp() {
  return (
    <TamTamLanguageProvider>
      <AudioDescriptionProvider>
        <AppContent />
      </AudioDescriptionProvider>
    </TamTamLanguageProvider>
  );
}
