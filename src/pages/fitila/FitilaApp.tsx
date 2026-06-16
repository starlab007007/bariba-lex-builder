import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FitilaLanguageProvider, useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTamTamProfile } from '@/hooks/useTamTamProfile';
import { Home, User, Settings, X, Bell, Globe, BookOpen, Shield, LayoutDashboard, Package, Sparkles } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton';
import { BuildInfo } from '@/components/BuildInfo';
import { useHFPreWarm } from '@/hooks/useHFPreWarm';
import { useExtendedNotifications } from '@/hooks/useExtendedNotifications';
import AppTourProvider, { TOUR_STORAGE_KEY } from '@/components/onboarding/AppTourProvider';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 FITILA APP V7 - MENU SIMPLIFIÉ
// ═══════════════════════════════════════════════════════════════════════════════

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
// SIDE MENU DRAWER - SIMPLIFIÉ
// ═══════════════════════════════════════════════════════════════════════════════

const SideMenuDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, setLanguage, currentLang } = useFitilaLanguage();
  const { isAdmin } = useAuth();
  const { profile } = useTamTamProfile();

  const navItems = [
    { icon: Home, labelKey: 'sidebar_home', path: '/fitila/social', emoji: '🏠' },
    { icon: User, labelKey: 'sidebar_profile', path: '/fitila/profile', emoji: '👤' },
  ];

  // ✨ Modules récemment ajoutés - mis en avant
  const newToolsItems = [
    { emoji: '🏫', labelKey: 'sidebar_classe',         descKey: 'sidebar_classe_desc',         path: '/fitila/classe',    gradient: 'from-rose-500 to-pink-400' },
    { emoji: '🎙️', labelKey: 'sidebar_voice_lab',      descKey: 'sidebar_voice_lab_desc',      path: '/fitila/voice-lab', gradient: 'from-pink-500 to-rose-400' },
    { emoji: '⚖️', labelKey: 'sidebar_fitila_tem_ia',  descKey: 'sidebar_fitila_tem_ia_desc',  path: '/fitila/tem-ia',    gradient: 'from-emerald-500 to-teal-400' },
  ];

  const toolsItems = [
    { emoji: '⌨️', labelKey: 'sidebar_keyboard', descKey: 'sidebar_keyboard_desc', path: '/fitila/keyboard', gradient: 'from-amber-500 to-orange-400' },
    { emoji: '📖', labelKey: 'sidebar_dictionary', descKey: 'sidebar_dictionary_desc', path: '/fitila/dictionary', gradient: 'from-emerald-500 to-teal-400' },
    { emoji: '🌍', labelKey: 'sidebar_translator', descKey: 'sidebar_translator_desc', path: '/fitila/translator', gradient: 'from-blue-500 to-cyan-400' },
    { emoji: '📚', labelKey: 'sidebar_learn',      descKey: 'sidebar_learn_desc',      path: '/fitila/learn',      gradient: 'from-amber-500 to-orange-400' },
    { emoji: '🤖', labelKey: 'sidebar_fitila_ia',  descKey: 'sidebar_fitila_ia_desc',  path: '/fitila/ia',         gradient: 'from-purple-500 to-indigo-400' },
  ];

  const handleNavigate = (path: string) => {
    triggerFeedback('click');
    onClose();
    setTimeout(() => navigate(path), 150);
  };

  const isActive = (path: string) => {
    if (path === '/fitila/social') {
      return location.pathname === '/fitila' || location.pathname === '/fitila/' || location.pathname === '/fitila/social';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] pointer-events-auto"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[88vw] max-w-[340px] md:max-w-[380px] lg:max-w-[400px] z-[101] overflow-y-auto pointer-events-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(20, 20, 28, 0.98) 0%, rgba(10, 10, 15, 0.99) 100%)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <span className="text-white font-black text-lg">FITILA</span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Navigation principale */}
            <div className="p-4">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2 px-2">{t('sidebar_navigation')}</p>
              <div className="space-y-1">
                {navItems.map((item, index) => {
                  const active = isActive(item.path);
                  return (
                    <motion.button
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                        active ? 'bg-[#FF7A00]/20 border border-[#FF7A00]/30' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden ${active ? 'bg-[#FF7A00]' : 'bg-white/10'}`}>
                        {item.labelKey === 'sidebar_profile' && profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{item.emoji}</span>
                        )}
                      </div>
                      <span className={`font-medium flex-1 text-left text-sm ${active ? 'text-[#FF7A00]' : 'text-white'}`}>
                        {t(item.labelKey)}
                      </span>
                      {active && <span className="px-2 py-0.5 rounded-full bg-[#FF7A00]/20 text-[#FF7A00] text-[9px] font-bold">{t('sidebar_active')}</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ✨ NOUVEAUX MODULES - Mis en avant */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3 px-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <p className="text-amber-300 text-[11px] font-bold uppercase tracking-wider">✨ Nouveau</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {newToolsItems.map((tool, index) => (
                  <motion.button
                    key={tool.labelKey}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleNavigate(tool.path)}
                    className="relative flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 hover:from-amber-500/20 hover:to-rose-500/20 transition-all border border-amber-400/20 hover:border-amber-400/40"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                      <span className="text-2xl">{tool.emoji}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-base font-bold truncate">{t(tool.labelKey)}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-bold shrink-0">NEW</span>
                      </div>
                      <span className="text-white/60 text-xs line-clamp-2">{t(tool.descKey)}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Outils */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3 px-2">
                <BookOpen className="w-4 h-4 text-[#FF7A00]" />
                <p className="text-[#FF7A00] text-[10px] font-bold uppercase tracking-wider">{t('sidebar_tools')}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {toolsItems.map((tool, index) => (
                  <motion.button
                    key={tool.labelKey}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigate(tool.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <span className="text-3xl">{tool.emoji}</span>
                    </div>
                    <span className="text-white text-sm font-bold text-center leading-tight">{t(tool.labelKey)}</span>
                    <span className="text-white/50 text-[11px] text-center leading-snug line-clamp-2">{t(tool.descKey)}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Langue */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3 px-2">
                <Globe className="w-4 h-4 text-white/60" />
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{t('sidebar_language')}</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLanguage('fr')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentLang === 'fr' ? 'bg-[#FF7A00] text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  🇫🇷 {t('sidebar_french')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLanguage('ba')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentLang === 'ba' ? 'bg-[#FF7A00] text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  🇧🇯 {t('sidebar_bariba')}
                </motion.button>
              </div>
            </div>

            {/* Section Admin */}
            {isAdmin && (
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">🔒 {t('sidebar_admin')}</p>
                </div>
                <div className="space-y-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigate('/admin')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">{t('sidebar_dashboard')}</p>
                      <p className="text-white/40 text-[10px]">{t('sidebar_dashboard_desc')}</p>
                    </div>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigate('/assets')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">{t('sidebar_assets')}</p>
                      <p className="text-white/40 text-[10px]">{t('sidebar_assets_desc')}</p>
                    </div>
                  </motion.button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-white/10 space-y-2">
              {isAdmin && (
                <motion.button 
                  whileTap={{ scale: 0.98 }} 
                  onClick={() => handleNavigate('/assets')} 
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 border border-[#FF7A00]/20"
                >
                  <Package className="w-5 h-5 text-[#FF7A00]" />
                  <span className="text-[#FF7A00] text-sm font-medium">{t('sidebar_assets')}</span>
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleNavigate('/fitila/profile?settings=1')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5">
                <Settings className="w-5 h-5 text-white/50" />
                <span className="text-white/50 text-sm">{t('sidebar_settings')}</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  localStorage.removeItem(TOUR_STORAGE_KEY);
                  onClose();
                  // Small delay so the menu closes before tour starts
                  setTimeout(() => window.location.reload(), 200);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5"
              >
                <HelpCircle className="w-5 h-5 text-white/50" />
                <span className="text-white/50 text-sm">Revoir le guide</span>
              </motion.button>
              <div className="pt-2 border-t border-white/5">
                <BuildInfo className="text-white/30" />
              </div>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useHFPreWarm();
  useExtendedNotifications();

  useEffect(() => {
    if (isMenuOpen) setIsMenuOpen(false);
  }, [location.pathname]);

  const menuContext: SideMenuContextType = {
    isOpen: isMenuOpen,
    open: () => setIsMenuOpen(true),
    close: () => setIsMenuOpen(false),
    toggle: () => setIsMenuOpen(prev => !prev),
  };

  return (
    <SideMenuContext.Provider value={menuContext}>
      <AppTourProvider>
        <div className="fixed inset-0 w-full h-full overflow-hidden kuaishou-bg">
          <SideMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
          <main className="w-full h-full overflow-hidden">
            <SafeBoundary label="Page Fitila">
              <Outlet />
            </SafeBoundary>
          </main>
          <AdminFloatingButton />
        </div>
      </AppTourProvider>
    </SideMenuContext.Provider>
  );
}

export default function FitilaApp() {
  return (
    <FitilaLanguageProvider>
      <AudioDescriptionProvider>
        <AppContent />
      </AudioDescriptionProvider>
    </FitilaLanguageProvider>
  );
}

// Backward compatibility
export { FitilaApp as TamTamApp };
