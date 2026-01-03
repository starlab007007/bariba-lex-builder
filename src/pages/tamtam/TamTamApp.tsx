import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TamTamLanguageProvider, useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { AudioDescriptionProvider } from '@/contexts/AudioDescriptionContext';
import { Home, Users, Radio, ShoppingBag, User, Settings, X, ChevronRight, Bell, Moon, Globe, Mic, Heart, Stethoscope, Languages, BookOpen, Calculator, Cloud, Map, Newspaper, Shield, Sparkles, Headphones, Camera, Video } from 'lucide-react';
import { triggerFeedback } from '@/utils/tamtamFeedback';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 TAM-TAM APP V6 - MENU HAMBURGER ENRICHI + SERVICES IA
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
// SIDE MENU DRAWER - GLASSMORPHISM + SERVICES IA
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

  // Services IA
  const aiServices = [
    { icon: Languages, label: 'Traducteur', labelBa: 'Ìtumọ̀', emoji: '🌍', color: 'from-blue-500 to-cyan-400', desc: 'FR ↔ Yoruba ↔ Bambara' },
    { icon: Stethoscope, label: 'Santé IA', labelBa: 'Ìlera AI', emoji: '🩺', color: 'from-emerald-500 to-teal-400', desc: 'Conseils médicaux' },
    { icon: BookOpen, label: 'Éducation', labelBa: 'Ẹ̀kọ́', emoji: '📚', color: 'from-purple-500 to-indigo-400', desc: 'Apprendre & Quiz' },
    { icon: Calculator, label: 'Finance', labelBa: 'Owó', emoji: '💰', color: 'from-amber-500 to-orange-400', desc: 'Calculs & Épargne' },
    { icon: Cloud, label: 'Météo', labelBa: 'Ojú ọjọ́', emoji: '🌤️', color: 'from-sky-500 to-blue-400', desc: 'Prévisions locales' },
    { icon: Map, label: 'Agriculture', labelBa: 'Iṣẹ́ àgbẹ̀', emoji: '🌾', color: 'from-green-500 to-lime-400', desc: 'Conseils culture' },
    { icon: Newspaper, label: 'Actualités', labelBa: 'Ìròyìn', emoji: '📰', color: 'from-red-500 to-rose-400', desc: 'News locales' },
    { icon: Shield, label: 'Sécurité', labelBa: 'Ààbò', emoji: '🛡️', color: 'from-gray-500 to-slate-400', desc: 'Alertes & SOS' },
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[320px] z-[101] overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(20, 20, 28, 0.98) 0%, rgba(10, 10, 15, 0.99) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Header avec avatar */}
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥁</span>
                  <span className="text-white font-black text-lg">TAM-TAM</span>
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

              {/* Avatar & User Info */}
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-xl">
                  <span className="text-2xl">👤</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-base font-bold">Utilisateur</h3>
                  <p className="text-white/50 text-sm">@tamtam_user</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[#FF7A00] text-xs font-medium">125 abonnés</span>
                    <span className="text-white/30">•</span>
                    <span className="text-white/50 text-xs">48 suivis</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30" />
              </div>
            </div>

            {/* Navigation principale */}
            <div className="p-4">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2 px-2">Navigation</p>
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
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-[#FF7A00]' : 'bg-white/10'}`}>
                        <span className="text-lg">{item.emoji}</span>
                      </div>
                      <span className={`font-medium flex-1 text-left text-sm ${active ? 'text-[#FF7A00]' : 'text-white'}`}>
                        {currentLang === 'ba' ? item.labelBa : item.label}
                      </span>
                      {active && <span className="px-2 py-0.5 rounded-full bg-[#FF7A00]/20 text-[#FF7A00] text-[9px] font-bold">ACTIF</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Services IA */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3 px-2">
                <Sparkles className="w-4 h-4 text-[#FF7A00]" />
                <p className="text-[#FF7A00] text-[10px] font-bold uppercase tracking-wider">Services IA</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {aiServices.map((service, index) => (
                  <motion.button
                    key={service.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { triggerFeedback('click'); onClose(); }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center`}>
                      <span className="text-xl">{service.emoji}</span>
                    </div>
                    <span className="text-white text-xs font-medium">{currentLang === 'ba' ? service.labelBa : service.label}</span>
                    <span className="text-white/40 text-[9px] text-center leading-tight">{service.desc}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Langue */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3 px-2">
                <Globe className="w-4 h-4 text-white/60" />
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Langue</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLanguage('fr')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentLang === 'fr' ? 'bg-[#FF7A00] text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  🇫🇷 Français
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLanguage('ba')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentLang === 'ba' ? 'bg-[#FF7A00] text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  🇧🇯 Yorùbá
                </motion.button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleNavigate('/tamtam/settings')} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5">
                <Settings className="w-5 h-5 text-white/50" />
                <span className="text-white/50 text-sm">Paramètres</span>
              </motion.button>
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
